package remote

import (
	"context"
	"fmt"

	"postgres-management-studio/internal/domain/cluster"
	"postgres-management-studio/internal/domain/connection"
)

func (r *ClusterRepository) ListViews(ctx context.Context, q connection.Querier, schema string) ([]cluster.View, error) {
	rows, err := q.Query(ctx, `
		SELECT c.relname, n.nspname, pg_get_userbyid(c.relowner)
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE c.relkind = 'v' AND n.nspname = $1
		ORDER BY c.relname`, schema)
	if err != nil {
		return nil, fmt.Errorf("list views: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.View, 0)
	for rows.Next() {
		var v cluster.View
		if err := rows.Scan(&v.Name, &v.Schema, &v.Owner); err != nil {
			return nil, fmt.Errorf("scan view: %w", err)
		}
		out = append(out, v)
	}
	return out, rows.Err()
}

func (r *ClusterRepository) ListMatViews(ctx context.Context, q connection.Querier, schema string) ([]cluster.MatView, error) {
	rows, err := q.Query(ctx, `
		SELECT c.relname, n.nspname, pg_get_userbyid(c.relowner), c.relispopulated
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE c.relkind = 'm' AND n.nspname = $1
		ORDER BY c.relname`, schema)
	if err != nil {
		return nil, fmt.Errorf("list materialized views: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.MatView, 0)
	for rows.Next() {
		var m cluster.MatView
		if err := rows.Scan(&m.Name, &m.Schema, &m.Owner, &m.Populated); err != nil {
			return nil, fmt.Errorf("scan matview: %w", err)
		}
		out = append(out, m)
	}
	return out, rows.Err()
}

func (r *ClusterRepository) ListSequences(ctx context.Context, q connection.Querier, schema string) ([]cluster.Sequence, error) {
	rows, err := q.Query(ctx, `
		SELECT sequencename, schemaname, sequenceowner, data_type, start_value, min_value, max_value, increment_by, COALESCE(last_value, 0), cache_size
		FROM pg_sequences
		WHERE schemaname = $1
		ORDER BY sequencename`, schema)
	if err != nil {
		return nil, fmt.Errorf("list sequences: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.Sequence, 0)
	for rows.Next() {
		var s cluster.Sequence
		if err := rows.Scan(&s.Name, &s.Schema, &s.Owner, &s.DataType, &s.Start, &s.Min, &s.Max, &s.Increment, &s.Current, &s.Cache); err != nil {
			return nil, fmt.Errorf("scan sequence: %w", err)
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *ClusterRepository) ListFunctions(ctx context.Context, q connection.Querier, schema string) ([]cluster.Function, error) {
	rows, err := q.Query(ctx, `
		SELECT p.proname,
		       n.nspname,
		       pg_get_userbyid(p.proowner),
		       pg_get_function_identity_arguments(p.oid),
		       pg_get_function_result(p.oid),
		       l.lanname
		FROM pg_proc p
		JOIN pg_namespace n ON n.oid = p.pronamespace
		JOIN pg_language l ON l.oid = p.prolang
		WHERE n.nspname = $1 AND p.prokind = 'f'
		ORDER BY p.proname`, schema)
	if err != nil {
		return nil, fmt.Errorf("list functions: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.Function, 0)
	for rows.Next() {
		var f cluster.Function
		if err := rows.Scan(&f.Name, &f.Schema, &f.Owner, &f.Arguments, &f.ReturnType, &f.Language); err != nil {
			return nil, fmt.Errorf("scan function: %w", err)
		}
		out = append(out, f)
	}
	return out, rows.Err()
}

func (r *ClusterRepository) ListProcedures(ctx context.Context, q connection.Querier, schema string) ([]cluster.Procedure, error) {
	rows, err := q.Query(ctx, `
		SELECT p.proname,
		       n.nspname,
		       pg_get_userbyid(p.proowner),
		       pg_get_function_identity_arguments(p.oid),
		       l.lanname
		FROM pg_proc p
		JOIN pg_namespace n ON n.oid = p.pronamespace
		JOIN pg_language l ON l.oid = p.prolang
		WHERE n.nspname = $1 AND p.prokind = 'p'
		ORDER BY p.proname`, schema)
	if err != nil {
		return nil, fmt.Errorf("list procedures: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.Procedure, 0)
	for rows.Next() {
		var p cluster.Procedure
		if err := rows.Scan(&p.Name, &p.Schema, &p.Owner, &p.Arguments, &p.Language); err != nil {
			return nil, fmt.Errorf("scan procedure: %w", err)
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *ClusterRepository) ListTriggers(ctx context.Context, q connection.Querier, schema, table string) ([]cluster.Trigger, error) {
	rows, err := q.Query(ctx, `
		SELECT t.tgname,
		       c.relname,
		       CASE t.tgtype & 66 WHEN 2 THEN 'BEFORE' WHEN 64 THEN 'INSTEAD OF' ELSE 'AFTER' END,
		       (SELECT string_agg(e, ',')
		        FROM unnest(ARRAY[
		          CASE WHEN t.tgtype & 4 = 4 THEN 'INSERT' END,
		          CASE WHEN t.tgtype & 8 = 8 THEN 'DELETE' END,
		          CASE WHEN t.tgtype & 16 = 16 THEN 'UPDATE' END,
		          CASE WHEN t.tgtype & 32 = 32 THEN 'TRUNCATE' END
		        ]) e WHERE e IS NOT NULL),
		       pg_get_function_identity_arguments(t.tgfoid) || ' ON ' || t.tgqual::text,
		       CASE t.tgenabled WHEN 'O' THEN 'enabled' WHEN 'D' THEN 'disabled' ELSE 'other' END,
		       pg_get_triggerdef(t.oid)
		FROM pg_trigger t
		JOIN pg_class c ON c.oid = t.tgrelid
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = $1 AND c.relname = $2 AND NOT t.tgisinternal
		ORDER BY t.tgname`, schema, table)
	if err != nil {
		return nil, fmt.Errorf("list triggers: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.Trigger, 0)
	for rows.Next() {
		var t cluster.Trigger
		if err := rows.Scan(&t.Name, &t.Table, &t.Timing, &t.Events, &t.Function, &t.Enabled, &t.Definition); err != nil {
			return nil, fmt.Errorf("scan trigger: %w", err)
		}
		out = append(out, t)
	}
	return out, rows.Err()
}
