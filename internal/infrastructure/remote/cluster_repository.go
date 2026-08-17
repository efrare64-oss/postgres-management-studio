package remote

import (
	"context"
	"fmt"

	"postgres-management-studio/internal/domain/cluster"
	"postgres-management-studio/internal/domain/connection"
)

type ClusterRepository struct{}

func NewClusterRepository() *ClusterRepository {
	return &ClusterRepository{}
}

var _ cluster.Repository = (*ClusterRepository)(nil)

func (r *ClusterRepository) ListDatabases(ctx context.Context, q connection.Querier) ([]cluster.Database, error) {
	rows, err := q.Query(ctx, `
		SELECT datname,
		       pg_size_pretty(pg_database_size(datname))
		FROM pg_database
		WHERE datallowconn
		ORDER BY datname`)
	if err != nil {
		return nil, fmt.Errorf("list databases: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.Database, 0)
	for rows.Next() {
		var d cluster.Database
		if err := rows.Scan(&d.Name, &d.Size); err != nil {
			return nil, fmt.Errorf("scan database: %w", err)
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (r *ClusterRepository) ListSchemas(ctx context.Context, q connection.Querier) ([]cluster.Schema, error) {
	rows, err := q.Query(ctx, `
		SELECT n.nspname, pg_get_userbyid(n.nspowner)
		FROM pg_namespace n
		WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
		  AND n.nspname NOT LIKE 'pg_temp_%'
		  AND n.nspname NOT LIKE 'pg_toast_temp_%'
		ORDER BY n.nspname`)
	if err != nil {
		return nil, fmt.Errorf("list schemas: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.Schema, 0)
	for rows.Next() {
		var s cluster.Schema
		if err := rows.Scan(&s.Name, &s.Owner); err != nil {
			return nil, fmt.Errorf("scan schema: %w", err)
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *ClusterRepository) ListTables(ctx context.Context, q connection.Querier, schema string) ([]cluster.Table, error) {
	rows, err := q.Query(ctx, `
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
		WHERE c.relkind IN ('r', 'p') AND n.nspname = $1
		ORDER BY c.relname`, schema)
	if err != nil {
		return nil, fmt.Errorf("list tables: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.Table, 0)
	for rows.Next() {
		var t cluster.Table
		if err := rows.Scan(&t.Name, &t.Schema, &t.Owner, &t.Columns, &t.Size, &t.Comment); err != nil {
			return nil, fmt.Errorf("scan table: %w", err)
		}
		out = append(out, t)
	}
	return out, rows.Err()
}
