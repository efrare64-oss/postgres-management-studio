package remote

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"

	"postgres-management-studio/internal/domain/connection"
)

func (r *ClusterRepository) GetObjectSQL(ctx context.Context, q connection.Querier, schema, name, kind string) (string, error) {
	switch kind {
	case "table":
		return r.tableDDL(ctx, q, schema, name)
	case "view":
		return r.simpleViewDef(ctx, q, schema, name, "view")
	case "matview":
		return r.simpleViewDef(ctx, q, schema, name, "matview")
	case "sequence":
		return r.sequenceDef(ctx, q, schema, name)
	case "function":
		return r.functionDef(ctx, q, schema, name)
	default:
		return "", fmt.Errorf("unsupported object kind %q", kind)
	}
}

func (r *ClusterRepository) tableDDL(ctx context.Context, q connection.Querier, schema, table string) (string, error) {
	detail, err := r.GetTableDetail(ctx, q, schema, table)
	if err != nil {
		return "", err
	}
	t := &detail.Table
	qualified := qualifiedName(schema, table)

	var b strings.Builder

	var parent, partBound string
	err = q.QueryRow(ctx, `
		SELECT pn.nspname || '.' || p.relname,
		       COALESCE(pg_get_expr(c.relpartbound, c.oid), '')
		FROM pg_inherits i
		JOIN pg_class c ON c.oid = i.inhrelid
		JOIN pg_class p ON p.oid = i.inhparent
		JOIN pg_namespace pn ON pn.oid = p.relnamespace
		WHERE c.oid = $1::regclass
		LIMIT 1`, qualified).Scan(&parent, &partBound)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return "", fmt.Errorf("load table inheritance: %w", err)
	}

	if err == nil && partBound != "" {
		b.WriteString("CREATE TABLE " + qualified + "\nPARTITION OF " + parent + "\n" + partBound + ";")
	} else {
		var lines []string
		for _, col := range detail.Columns {
			parts := []string{quoteIdent(col.Name), col.DataType}
			if col.Collation != "" {
				parts = append(parts, "COLLATE "+quoteIdent(col.Collation))
			}
			if col.Default != "" {
				parts = append(parts, "DEFAULT "+col.Default)
			}
			if !col.Nullable {
				parts = append(parts, "NOT NULL")
			}
			lines = append(lines, "    "+strings.Join(parts, " "))
		}
		for _, con := range detail.Constraints {
			lines = append(lines, "    CONSTRAINT "+quoteIdent(con.Name)+" "+con.Definition)
		}

		header := "CREATE TABLE "
		if t.Persistence == "unlogged" {
			header += "UNLOGGED "
		}
		header += qualified + " (\n" + strings.Join(lines, ",\n") + "\n)"
		b.WriteString(header)

		var opts []string
		if t.Fillfactor > 0 && t.Fillfactor != 100 {
			opts = append(opts, fmt.Sprintf("fillfactor=%d", t.Fillfactor))
		}
		opts = append(opts, t.StorageParams...)
		if len(opts) > 0 {
			b.WriteString("\nWITH (" + strings.Join(opts, ", ") + ")")
		}
		if t.AccessMethod != "" && t.AccessMethod != "heap" {
			b.WriteString("\nUSING " + quoteIdent(t.AccessMethod))
		}
		if t.Tablespace != "" && t.Tablespace != "pg_default" {
			b.WriteString("\nTABLESPACE " + quoteIdent(t.Tablespace))
		}
		if t.PartitionKey != "" {
			b.WriteString("\nPARTITION BY " + t.PartitionKey)
		}
		if parent != "" {
			b.WriteString("\nINHERITS (" + parent + ")")
		}
		b.WriteString(";")
	}

	if t.Comment != "" {
		b.WriteString("\n\nCOMMENT ON TABLE " + qualified + " IS '" + escapeSQL(t.Comment) + "';")
	}

	for _, idx := range detail.Indexes {
		b.WriteString("\n\n" + idx.Definition + ";")
	}

	triggers, err := r.ListTriggers(ctx, q, schema, table)
	if err != nil {
		return "", err
	}
	for _, trg := range triggers {
		if trg.Definition != "" {
			b.WriteString("\n\n" + trg.Definition + ";")
		}
	}

	policies, err := r.tablePolicies(ctx, q, schema, table)
	if err != nil {
		return "", err
	}
	for _, pol := range policies {
		b.WriteString("\n\n" + pol)
	}

	rules, err := r.tableRules(ctx, q, schema, table)
	if err != nil {
		return "", err
	}
	for _, rl := range rules {
		b.WriteString("\n\n" + rl + ";")
	}

	return b.String(), nil
}

func (r *ClusterRepository) tablePolicies(ctx context.Context, q connection.Querier, schema, table string) ([]string, error) {
	rows, err := q.Query(ctx, `
		SELECT p.polname,
		       CASE p.polcmd WHEN '*' THEN 'ALL' WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
		                     WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE p.polcmd::text END,
		       p.polpermissive,
		       COALESCE((SELECT string_agg(pg_get_userbyid(role), ', ')
		                 FROM unnest(p.polroles) role WHERE role <> 0), 'PUBLIC'),
		       COALESCE(pg_get_expr(p.polqual, p.polrelid), ''),
		       COALESCE(pg_get_expr(p.polwithcheck, p.polrelid), '')
		FROM pg_policy p
		JOIN pg_class c ON c.oid = p.polrelid
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = $1 AND c.relname = $2
		ORDER BY p.polname`, schema, table)
	if err != nil {
		return nil, fmt.Errorf("list policies: %w", err)
	}
	defer rows.Close()

	var out []string
	for rows.Next() {
		var name, cmd, roles, using, withCheck string
		var permissive bool
		if err := rows.Scan(&name, &cmd, &permissive, &roles, &using, &withCheck); err != nil {
			return nil, fmt.Errorf("scan policy: %w", err)
		}
		var sb strings.Builder
		sb.WriteString("CREATE POLICY " + quoteIdent(name) + " ON " + qualifiedName(schema, table))
		if !permissive {
			sb.WriteString(" AS RESTRICTIVE")
		}
		sb.WriteString(" FOR " + cmd)
		sb.WriteString(" TO " + roles)
		if using != "" {
			sb.WriteString("\n  USING (" + using + ")")
		}
		if withCheck != "" {
			sb.WriteString("\n  WITH CHECK (" + withCheck + ")")
		}
		out = append(out, sb.String())
	}
	return out, rows.Err()
}

func (r *ClusterRepository) tableRules(ctx context.Context, q connection.Querier, schema, table string) ([]string, error) {
	rows, err := q.Query(ctx, `
		SELECT pg_get_ruledef(r.oid)
		FROM pg_rewrite r
		JOIN pg_class c ON c.oid = r.ev_class
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = $1 AND c.relname = $2 AND r.rulename <> '_RETURN'
		ORDER BY r.rulename`, schema, table)
	if err != nil {
		return nil, fmt.Errorf("list rules: %w", err)
	}
	defer rows.Close()

	var out []string
	for rows.Next() {
		var def string
		if err := rows.Scan(&def); err != nil {
			return nil, fmt.Errorf("scan rule: %w", err)
		}
		out = append(out, def)
	}
	return out, rows.Err()
}

func (r *ClusterRepository) simpleViewDef(ctx context.Context, q connection.Querier, schema, name, kind string) (string, error) {
	relkind := "v"
	header := "CREATE OR REPLACE VIEW " + qualifiedName(schema, name) + " AS\n"
	if kind == "matview" {
		relkind = "m"
		header = "CREATE MATERIALIZED VIEW " + qualifiedName(schema, name) + " AS\n"
	}

	var def string
	err := q.QueryRow(ctx, `
		SELECT pg_get_viewdef(c.oid, true)
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind = $3`,
		schema, name, relkind,
	).Scan(&def)
	if err != nil {
		return "", fmt.Errorf("load %s definition: %w", kind, err)
	}
	return header + def, nil
}

func (r *ClusterRepository) sequenceDef(ctx context.Context, q connection.Querier, schema, name string) (string, error) {
	var s struct {
		DataType  string
		Start     int64
		Min       int64
		Max       int64
		Increment int64
		Cache     int64
	}
	err := q.QueryRow(ctx, `
		SELECT data_type, start_value, min_value, max_value, increment_by, cache_size
		FROM pg_sequences
		WHERE schemaname = $1 AND sequencename = $2`, schema, name,
	).Scan(&s.DataType, &s.Start, &s.Min, &s.Max, &s.Increment, &s.Cache)
	if err != nil {
		return "", fmt.Errorf("load sequence properties: %w", err)
	}

	var b strings.Builder
	b.WriteString("CREATE SEQUENCE " + qualifiedName(schema, name) + "\n")
	b.WriteString("    AS " + s.DataType + "\n")
	b.WriteString(fmt.Sprintf("    START WITH %d\n", s.Start))
	b.WriteString(fmt.Sprintf("    INCREMENT BY %d\n", s.Increment))
	if s.Min != 0 {
		b.WriteString(fmt.Sprintf("    MINVALUE %d\n", s.Min))
	} else {
		b.WriteString("    NO MINVALUE\n")
	}
	b.WriteString(fmt.Sprintf("    MAXVALUE %d\n", s.Max))
	b.WriteString(fmt.Sprintf("    CACHE %d;", s.Cache))
	return b.String(), nil
}

func (r *ClusterRepository) functionDef(ctx context.Context, q connection.Querier, schema, name string) (string, error) {
	var def string
	err := q.QueryRow(ctx, `
		SELECT pg_get_functiondef(p.oid)
		FROM pg_proc p
		JOIN pg_namespace n ON n.oid = p.pronamespace
		WHERE n.nspname = $1 AND p.proname = $2 AND p.prokind = 'f'
		ORDER BY p.oid DESC
		LIMIT 1`, schema, name,
	).Scan(&def)
	if err != nil {
		return "", fmt.Errorf("load function definition: %w", err)
	}
	return def, nil
}
