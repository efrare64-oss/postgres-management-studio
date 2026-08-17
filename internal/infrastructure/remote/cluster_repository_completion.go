package remote

import (
	"context"
	"fmt"

	"postgres-management-studio/internal/domain/cluster"
	"postgres-management-studio/internal/domain/connection"
)

func (r *ClusterRepository) GetCompletionSchema(ctx context.Context, q connection.Querier) ([]cluster.CompletionTable, error) {
	rows, err := q.Query(ctx, `
		SELECT n.nspname,
		       c.relname,
		       c.relkind::text,
		       a.attname,
		       pg_catalog.format_type(a.atttypid, a.atttypmod)
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		JOIN pg_attribute a ON a.attrelid = c.oid
		WHERE c.relkind IN ('r', 'p', 'v', 'm', 'f')
		  AND a.attnum > 0
		  AND NOT a.attisdropped
		  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
		ORDER BY n.nspname, c.relname, a.attnum`)
	if err != nil {
		return nil, fmt.Errorf("load completion schema: %w", err)
	}
	defer rows.Close()

	index := make(map[string]int)
	out := make([]cluster.CompletionTable, 0)
	for rows.Next() {
		var schema, name, kind, colName, colType string
		if err := rows.Scan(&schema, &name, &kind, &colName, &colType); err != nil {
			return nil, fmt.Errorf("scan completion table: %w", err)
		}
		key := schema + "\x00" + name
		i, ok := index[key]
		if !ok {
			i = len(out)
			index[key] = i
			out = append(out, cluster.CompletionTable{Schema: schema, Name: name, Kind: kind})
		}
		out[i].Columns = append(out[i].Columns, cluster.CompletionColumn{Name: colName, DataType: colType})
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate completion schema: %w", err)
	}
	return out, nil
}
