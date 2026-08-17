package remote

import (
	"context"
	"fmt"
	"strings"

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

	var lines []string
	var pks []string

	for _, col := range detail.Columns {
		parts := []string{quoteIdent(col.Name), col.DataType}
		if col.Default != "" {
			parts = append(parts, "DEFAULT "+col.Default)
		}
		if !col.Nullable {
			parts = append(parts, "NOT NULL")
		}
		if col.IsPrimary {
			pks = append(pks, quoteIdent(col.Name))
		}
		lines = append(lines, "    "+strings.Join(parts, " "))
	}

	if len(pks) > 0 {
		lines = append(lines, "    PRIMARY KEY ("+strings.Join(pks, ", ")+")")
	}

	var b strings.Builder
	b.WriteString("CREATE TABLE " + qualifiedName(schema, table) + " (\n")
	b.WriteString(strings.Join(lines, ",\n"))
	b.WriteString("\n);")

	if detail.Table.Comment != "" {
		b.WriteString("\n\nCOMMENT ON TABLE " + qualifiedName(schema, table) + " IS '" + escapeSQL(detail.Table.Comment) + "';")
	}

	for _, idx := range detail.Indexes {
		b.WriteString("\n\n" + idx.Columns + ";")
	}

	for _, con := range detail.Constraints {
		if con.Type == "p" || con.Type == "u" || con.Type == "x" {
			continue
		}
		b.WriteString("\n\nALTER TABLE " + qualifiedName(schema, table) + " ADD CONSTRAINT " +
			quoteIdent(con.Name) + " " + con.Definition + ";")
	}

	return b.String(), nil
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
