package remote

import (
	"context"
	"fmt"
	"strings"

	"postgres-management-studio/internal/domain/cluster"
	"postgres-management-studio/internal/domain/connection"
)

func (r *ClusterRepository) GetTableDetail(ctx context.Context, q connection.Querier, schema, table string) (*cluster.TableDetail, error) {
	qualified := qualifiedName(schema, table)

	tableInfo, err := r.tableInfo(ctx, q, qualified)
	if err != nil {
		return nil, err
	}

	columns, err := r.tableColumns(ctx, q, qualified)
	if err != nil {
		return nil, err
	}

	indexes, err := r.tableIndexes(ctx, q, qualified)
	if err != nil {
		return nil, err
	}

	constraints, err := r.tableConstraints(ctx, q, qualified)
	if err != nil {
		return nil, err
	}

	return &cluster.TableDetail{
		Table:       *tableInfo,
		Columns:     columns,
		Indexes:     indexes,
		Constraints: constraints,
	}, nil
}

func (r *ClusterRepository) tableInfo(ctx context.Context, q connection.Querier, qualified string) (*cluster.Table, error) {
	var t cluster.Table

	hasOIDs := "false"
	var ver int
	if err := q.QueryRow(ctx, `SELECT (SELECT current_setting('server_version_num')::int)`).Scan(&ver); err != nil {
		return nil, fmt.Errorf("load server version: %w", err)
	}
	if ver < 150000 {
		hasOIDs = "c.relhasoids"
	}

	err := q.QueryRow(ctx, fmt.Sprintf(`
		SELECT c.relname,
		       n.nspname,
		       pg_get_userbyid(c.relowner),
		       (SELECT count(*)
		        FROM pg_attribute a
		        WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped),
		       pg_size_pretty(pg_total_relation_size(c.oid)),
		       COALESCE(obj_description(c.oid, 'pg_class'), ''),
		       c.reltuples::bigint,
		       COALESCE((SELECT spcname
		                 FROM pg_tablespace
		                 WHERE oid = CASE WHEN c.reltablespace <> 0 THEN c.reltablespace
		                                  ELSE (SELECT dattablespace FROM pg_database WHERE datname = current_database())
		                             END), 'pg_default'),
		       COALESCE(NULLIF((SELECT split_part(opt, '=', 2)
		                        FROM unnest(COALESCE(c.reloptions, '{}')) opt
		                        WHERE opt LIKE 'fillfactor=%%'), '')::int, 100),
		       COALESCE((SELECT array_agg(opt ORDER BY opt)
		                 FROM unnest(COALESCE(c.reloptions, '{}')) opt
		                 WHERE opt NOT LIKE 'fillfactor=%%'), ARRAY[]::text[]),
		       am.amname,
		       CASE c.relpersistence WHEN 'p' THEN 'permanent' WHEN 'u' THEN 'unlogged' WHEN 't' THEN 'temporary' ELSE '' END,
		       COALESCE(pg_get_partkeydef(c.oid), ''),
		       %s,
		       pg_size_pretty(pg_indexes_size(c.oid)),
		       COALESCE((SELECT pg_size_pretty(pg_relation_size(toast.oid))
		                 FROM pg_class toast
		                 WHERE toast.oid = c.reltoastrelid), '')
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		JOIN pg_am am ON am.oid = c.relam
		WHERE c.oid = $1::regclass`, hasOIDs), qualified,
	).Scan(&t.Name, &t.Schema, &t.Owner, &t.Columns, &t.Size, &t.Comment, &t.RowEstimate, &t.Tablespace, &t.Fillfactor, &t.StorageParams, &t.AccessMethod, &t.Persistence, &t.PartitionKey, &t.HasOIDs, &t.IndexesSize, &t.ToastSize)
	if err != nil {
		return nil, fmt.Errorf("load table info: %w", err)
	}
	return &t, nil
}

func (r *ClusterRepository) tableColumns(ctx context.Context, q connection.Querier, qualified string) ([]cluster.Column, error) {
	rows, err := q.Query(ctx, `
		SELECT a.attname,
		       format_type(a.atttypid, a.atttypmod),
		       NOT a.attnotnull,
		       COALESCE(pg_get_expr(d.adbin, d.adrelid), ''),
		       COALESCE((SELECT TRUE
		                 FROM pg_index i
		                 WHERE i.indrelid = a.attrelid AND i.indisprimary
		                   AND a.attnum = ANY (i.indkey)), FALSE),
		       a.attnum,
		       CASE WHEN a.atttypmod >= 0 AND t.typname IN ('varchar', 'bpchar') THEN a.atttypmod - 4 END,
		       CASE WHEN t.typname = 'numeric' AND a.atttypmod >= 4 THEN ((a.atttypmod - 4) >> 16) & 65535 END,
		       CASE WHEN t.typname = 'numeric' AND a.atttypmod >= 4 THEN (a.atttypmod - 4) & 65535 END,
		       CASE a.attstorage WHEN 'p' THEN 'plain' WHEN 'e' THEN 'external' WHEN 'm' THEN 'main' WHEN 'x' THEN 'extended' ELSE '' END,
		       COALESCE(coll.collname, '')
		FROM pg_attribute a
		JOIN pg_type t ON t.oid = a.atttypid
		LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
		LEFT JOIN pg_collation coll ON coll.oid = a.attcollation AND a.attcollation <> 0 AND a.attcollation <> t.typcollation
		WHERE a.attrelid = $1::regclass AND a.attnum > 0 AND NOT a.attisdropped
		ORDER BY a.attnum`, qualified)
	if err != nil {
		return nil, fmt.Errorf("load columns: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.Column, 0)
	for rows.Next() {
		var c cluster.Column
		if err := rows.Scan(&c.Name, &c.DataType, &c.Nullable, &c.Default, &c.IsPrimary, &c.Position, &c.Width, &c.Precision, &c.Scale, &c.Storage, &c.Collation); err != nil {
			return nil, fmt.Errorf("scan column: %w", err)
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *ClusterRepository) tableIndexes(ctx context.Context, q connection.Querier, qualified string) ([]cluster.Index, error) {
	rows, err := q.Query(ctx, `
		SELECT i.relname,
		       ARRAY(SELECT pg_get_indexdef(ix.indexrelid, k, true)
		             FROM generate_series(1, ix.indnkeyatts) k),
		       pg_get_indexdef(ix.indexrelid),
		       ix.indisunique,
		       am.amname,
		       COALESCE(pg_get_expr(ix.indpred, ix.indrelid), ''),
		       COALESCE((SELECT spcname
		                 FROM pg_tablespace
		                 WHERE oid = CASE WHEN i.reltablespace <> 0 THEN i.reltablespace
		                                  ELSE (SELECT dattablespace FROM pg_database WHERE datname = current_database())
		                             END), 'pg_default'),
		       COALESCE(NULLIF((SELECT split_part(opt, '=', 2)
		                        FROM unnest(COALESCE(i.reloptions, '{}')) opt
		                        WHERE opt LIKE 'fillfactor=%'), '')::int, 100),
		       COALESCE((SELECT array_agg(opt ORDER BY opt)
		                 FROM unnest(COALESCE(i.reloptions, '{}')) opt
		                 WHERE opt NOT LIKE 'fillfactor=%'), ARRAY[]::text[]),
		       i.relclustered
		FROM pg_index ix
		JOIN pg_class i ON i.oid = ix.indexrelid
		JOIN pg_am am ON am.oid = i.relam
		WHERE ix.indrelid = $1::regclass
		ORDER BY i.relname`, qualified)
	if err != nil {
		return nil, fmt.Errorf("load indexes: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.Index, 0)
	for rows.Next() {
		var idx cluster.Index
		if err := rows.Scan(&idx.Name, &idx.Columns, &idx.Definition, &idx.Unique, &idx.Method, &idx.Predicate, &idx.Tablespace, &idx.Fillfactor, &idx.StorageParams, &idx.Clustered); err != nil {
			return nil, fmt.Errorf("scan index: %w", err)
		}
		out = append(out, idx)
	}
	return out, rows.Err()
}

func (r *ClusterRepository) tableConstraints(ctx context.Context, q connection.Querier, qualified string) ([]cluster.Constraint, error) {
	rows, err := q.Query(ctx, `
		SELECT conname,
		       contype::text,
		       pg_get_constraintdef(oid),
		       COALESCE(confrelid::regclass::text, ''),
		       COALESCE(ARRAY(SELECT a.attname
		                      FROM pg_attribute a
		                      WHERE a.attrelid = confrelid AND a.attnum = ANY (confkey)
		                      ORDER BY a.attnum), ARRAY[]::text[]),
		       COALESCE(CASE contype WHEN 'f' THEN CASE confdeltype
		                                    WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT'
		                                    WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL'
		                                    WHEN 'd' THEN 'SET DEFAULT' ELSE '' END END, ''),
		       COALESCE(CASE contype WHEN 'f' THEN CASE confupdtype
		                                    WHEN 'a' THEN 'NO ACTION' WHEN 'r' THEN 'RESTRICT'
		                                    WHEN 'c' THEN 'CASCADE' WHEN 'n' THEN 'SET NULL'
		                                    WHEN 'd' THEN 'SET DEFAULT' ELSE '' END END, ''),
		       condeferrable
		FROM pg_constraint
		WHERE conrelid = $1::regclass
		ORDER BY conname`, qualified)
	if err != nil {
		return nil, fmt.Errorf("load constraints: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.Constraint, 0)
	for rows.Next() {
		var c cluster.Constraint
		if err := rows.Scan(&c.Name, &c.Type, &c.Definition, &c.RefTable, &c.RefColumns, &c.OnDelete, &c.OnUpdate, &c.Deferrable); err != nil {
			return nil, fmt.Errorf("scan constraint: %w", err)
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func qualifiedName(schema, name string) string {
	return quoteIdent(schema) + "." + quoteIdent(name)
}

func quoteIdent(name string) string {
	return `"` + strings.ReplaceAll(name, `"`, `""`) + `"`
}
