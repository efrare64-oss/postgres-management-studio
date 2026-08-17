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
	err := q.QueryRow(ctx, `
		SELECT c.relname,
		       n.nspname,
		       pg_get_userbyid(c.relowner),
		       (SELECT count(*)
		        FROM pg_attribute a
		        WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped),
		       pg_size_pretty(pg_total_relation_size(c.oid)),
		       COALESCE(obj_description(c.oid, 'pg_class'), '')
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE c.oid = $1::regclass`, qualified,
	).Scan(&t.Name, &t.Schema, &t.Owner, &t.Columns, &t.Size, &t.Comment)
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
		       a.attnum
		FROM pg_attribute a
		LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
		WHERE a.attrelid = $1::regclass AND a.attnum > 0 AND NOT a.attisdropped
		ORDER BY a.attnum`, qualified)
	if err != nil {
		return nil, fmt.Errorf("load columns: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.Column, 0)
	for rows.Next() {
		var c cluster.Column
		if err := rows.Scan(&c.Name, &c.DataType, &c.Nullable, &c.Default, &c.IsPrimary, &c.Position); err != nil {
			return nil, fmt.Errorf("scan column: %w", err)
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (r *ClusterRepository) tableIndexes(ctx context.Context, q connection.Querier, qualified string) ([]cluster.Index, error) {
	rows, err := q.Query(ctx, `
		SELECT i.relname,
		       pg_get_indexdef(ix.indexrelid),
		       ix.indisunique,
		       am.amname
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
		if err := rows.Scan(&idx.Name, &idx.Columns, &idx.Unique, &idx.Method); err != nil {
			return nil, fmt.Errorf("scan index: %w", err)
		}
		out = append(out, idx)
	}
	return out, rows.Err()
}

func (r *ClusterRepository) tableConstraints(ctx context.Context, q connection.Querier, qualified string) ([]cluster.Constraint, error) {
	rows, err := q.Query(ctx, `
		SELECT conname, contype::text, pg_get_constraintdef(oid)
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
		if err := rows.Scan(&c.Name, &c.Type, &c.Definition); err != nil {
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
