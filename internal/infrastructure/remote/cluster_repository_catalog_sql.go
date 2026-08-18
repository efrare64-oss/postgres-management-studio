package remote

import (
	"context"
	"fmt"
	"strings"

	"postgres-management-studio/internal/domain/connection"
)

func sqlLiteral(s string) string {
	return "'" + strings.ReplaceAll(s, "'", "''") + "'"
}

func (r *ClusterRepository) domainDef(ctx context.Context, q connection.Querier, schema, name string) (string, error) {
	var base, def string
	var notNull bool
	var checks string
	err := q.QueryRow(ctx, `
		SELECT format_type(t.typbasetype, t.typtypmod),
		       t.typnotnull,
		       COALESCE(t.typdefault, ''),
		       COALESCE((SELECT string_agg(pg_get_constraintdef(c.oid), ' ')
		                 FROM pg_constraint c WHERE c.contypid = t.oid AND c.contype = 'c'), '')
		FROM pg_type t
		JOIN pg_namespace n ON n.oid = t.typnamespace
		WHERE n.nspname = $1 AND t.typname = $2 AND t.typtype = 'd'`, schema, name,
	).Scan(&base, &notNull, &def, &checks)
	if err != nil {
		return "", fmt.Errorf("load domain definition: %w", err)
	}

	var b strings.Builder
	b.WriteString("CREATE DOMAIN " + qualifiedName(schema, name) + "\n    AS " + base)
	if def != "" {
		b.WriteString("\n    DEFAULT " + def)
	}
	if notNull {
		b.WriteString("\n    NOT NULL")
	}
	if checks != "" {
		b.WriteString("\n    " + checks)
	}
	b.WriteString(";")
	return b.String(), nil
}

func (r *ClusterRepository) collationDef(ctx context.Context, q connection.Querier, schema, name string) (string, error) {
	var provider, collate, ctype, locale string
	var deterministic bool
	err := q.QueryRow(ctx, `
		SELECT c.collprovider::text, c.collisdeterministic,
		       COALESCE(c.collcollate, ''), COALESCE(c.collctype, ''), COALESCE(c.colllocale, '')
		FROM pg_collation c
		JOIN pg_namespace n ON n.oid = c.collnamespace
		WHERE n.nspname = $1 AND c.collname = $2`, schema, name,
	).Scan(&provider, &deterministic, &collate, &ctype, &locale)
	if err != nil {
		return "", fmt.Errorf("load collation definition: %w", err)
	}

	var b strings.Builder
	b.WriteString("CREATE COLLATION " + qualifiedName(schema, name) + " (")
	if provider == "i" && locale != "" {
		b.WriteString("\n    LOCALE = " + sqlLiteral(locale))
	} else {
		b.WriteString("\n    LC_COLLATE = " + sqlLiteral(collate) + ",\n    LC_CTYPE = " + sqlLiteral(ctype))
	}
	if !deterministic {
		b.WriteString(",\n    DETERMINISTIC = false")
	}
	b.WriteString("\n);")
	return b.String(), nil
}

func (r *ClusterRepository) typeDef(ctx context.Context, q connection.Querier, schema, name string) (string, error) {
	var typtype string
	err := q.QueryRow(ctx, `
		SELECT t.typtype::text
		FROM pg_type t
		JOIN pg_namespace n ON n.oid = t.typnamespace
		WHERE n.nspname = $1 AND t.typname = $2`, schema, name,
	).Scan(&typtype)
	if err != nil {
		return "", fmt.Errorf("load type definition: %w", err)
	}

	switch typtype {
	case "e":
		rows, err := q.Query(ctx, `
			SELECT e.enumlabel
			FROM pg_enum e
			JOIN pg_type t ON t.oid = e.enumtypid
			JOIN pg_namespace n ON n.oid = t.typnamespace
			WHERE n.nspname = $1 AND t.typname = $2
			ORDER BY e.enumsortorder`, schema, name)
		if err != nil {
			return "", fmt.Errorf("load enum labels: %w", err)
		}
		defer rows.Close()
		var labels []string
		for rows.Next() {
			var l string
			if err := rows.Scan(&l); err != nil {
				return "", fmt.Errorf("scan enum label: %w", err)
			}
			labels = append(labels, sqlLiteral(l))
		}
		if err := rows.Err(); err != nil {
			return "", err
		}
		return "CREATE TYPE " + qualifiedName(schema, name) + " AS ENUM (\n    " + strings.Join(labels, ",\n    ") + "\n);", nil

	case "c":
		rows, err := q.Query(ctx, `
			SELECT a.attname, format_type(a.atttypid, a.atttypmod)
			FROM pg_attribute a
			JOIN pg_type t ON t.oid = a.attrelid
			JOIN pg_namespace n ON n.oid = t.typnamespace
			WHERE n.nspname = $1 AND t.typname = $2 AND a.attnum > 0 AND NOT a.attisdropped
			ORDER BY a.attnum`, schema, name)
		if err != nil {
			return "", fmt.Errorf("load composite type columns: %w", err)
		}
		defer rows.Close()
		var lines []string
		for rows.Next() {
			var col, typ string
			if err := rows.Scan(&col, &typ); err != nil {
				return "", fmt.Errorf("scan composite column: %w", err)
			}
			lines = append(lines, "    "+quoteIdent(col)+" "+typ)
		}
		if err := rows.Err(); err != nil {
			return "", err
		}
		return "CREATE TYPE " + qualifiedName(schema, name) + " AS (\n" + strings.Join(lines, ",\n") + "\n);", nil

	default:
		return "", fmt.Errorf("create script for base/range types is not supported")
	}
}

func (r *ClusterRepository) ftsConfigurationDef(ctx context.Context, q connection.Querier, schema, name string) (string, error) {
	var parser string
	err := q.QueryRow(ctx, `
		SELECT p.cfgname
		FROM pg_ts_config cfg
		JOIN pg_ts_parser p ON p.oid = cfg.cfgparser
		JOIN pg_namespace n ON n.oid = cfg.cfgnamespace
		WHERE n.nspname = $1 AND cfg.cfgname = $2`, schema, name,
	).Scan(&parser)
	if err != nil {
		return "", fmt.Errorf("load text search configuration: %w", err)
	}
	return "CREATE TEXT SEARCH CONFIGURATION " + qualifiedName(schema, name) + " (\n    PARSER = " + quoteIdent(parser) + "\n);", nil
}

func (r *ClusterRepository) ftsDictionaryDef(ctx context.Context, q connection.Querier, schema, name string) (string, error) {
	var template, opts string
	err := q.QueryRow(ctx, `
		SELECT t.tmplname, COALESCE(d.dictinitoption, '')
		FROM pg_ts_dict d
		JOIN pg_ts_template t ON t.oid = d.dicttemplate
		JOIN pg_namespace n ON n.oid = d.dictnamespace
		WHERE n.nspname = $1 AND d.dictname = $2`, schema, name,
	).Scan(&template, &opts)
	if err != nil {
		return "", fmt.Errorf("load text search dictionary: %w", err)
	}
	var b strings.Builder
	b.WriteString("CREATE TEXT SEARCH DICTIONARY " + qualifiedName(schema, name) + " (\n    TEMPLATE = " + quoteIdent(template))
	if opts != "" {
		b.WriteString(",\n    " + opts)
	}
	b.WriteString("\n);")
	return b.String(), nil
}

func (r *ClusterRepository) ftsParserDef(ctx context.Context, q connection.Querier, schema, name string) (string, error) {
	var start, token, end, lextype, headline string
	err := q.QueryRow(ctx, `
		SELECT p.prsstart::regprocedure::text,
		       p.prstoken::regprocedure::text,
		       p.prsend::regprocedure::text,
		       p.prslextype::regprocedure::text,
		       COALESCE(NULLIF(p.prsheadline, 0)::regprocedure::text, '')
		FROM pg_ts_parser p
		JOIN pg_namespace n ON n.oid = p.prsnamespace
		WHERE n.nspname = $1 AND p.prsname = $2`, schema, name,
	).Scan(&start, &token, &end, &lextype, &headline)
	if err != nil {
		return "", fmt.Errorf("load text search parser: %w", err)
	}
	var b strings.Builder
	b.WriteString("CREATE TEXT SEARCH PARSER " + qualifiedName(schema, name) + " (\n")
	b.WriteString("    START = " + start + ",\n")
	b.WriteString("    GETTOKEN = " + token + ",\n")
	b.WriteString("    END = " + end + ",\n")
	b.WriteString("    LEXTYPES = " + lextype)
	if headline != "" {
		b.WriteString(",\n    HEADLINE = " + headline)
	}
	b.WriteString("\n);")
	return b.String(), nil
}

func (r *ClusterRepository) ftsTemplateDef(ctx context.Context, q connection.Querier, schema, name string) (string, error) {
	var init, lexize string
	err := q.QueryRow(ctx, `
		SELECT COALESCE(NULLIF(t.tmplinit, 0)::regprocedure::text, ''),
		       t.tmpllexize::regprocedure::text
		FROM pg_ts_template t
		JOIN pg_namespace n ON n.oid = t.tmplnamespace
		WHERE n.nspname = $1 AND t.tmplname = $2`, schema, name,
	).Scan(&init, &lexize)
	if err != nil {
		return "", fmt.Errorf("load text search template: %w", err)
	}
	var b strings.Builder
	b.WriteString("CREATE TEXT SEARCH TEMPLATE " + qualifiedName(schema, name) + " (\n")
	if init != "" {
		b.WriteString("    INIT = " + init + ",\n")
	}
	b.WriteString("    LEXIZE = " + lexize + "\n);")
	return b.String(), nil
}

func (r *ClusterRepository) foreignTableDef(ctx context.Context, q connection.Querier, schema, name string) (string, error) {
	rows, err := q.Query(ctx, `
		SELECT a.attname, format_type(a.atttypid, a.atttypmod), a.attnotnull
		FROM pg_attribute a
		JOIN pg_class c ON c.oid = a.attrelid
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind = 'f'
		  AND a.attnum > 0 AND NOT a.attisdropped
		ORDER BY a.attnum`, schema, name)
	if err != nil {
		return "", fmt.Errorf("load foreign table columns: %w", err)
	}
	defer rows.Close()
	var lines []string
	for rows.Next() {
		var col, typ string
		var notNull bool
		if err := rows.Scan(&col, &typ, &notNull); err != nil {
			return "", fmt.Errorf("scan foreign table column: %w", err)
		}
		line := "    " + quoteIdent(col) + " " + typ
		if notNull {
			line += " NOT NULL"
		}
		lines = append(lines, line)
	}
	if err := rows.Err(); err != nil {
		return "", err
	}

	var server, opts string
	err = q.QueryRow(ctx, `
		SELECT s.srvname,
		       COALESCE((SELECT string_agg(format('%s %L', o.option_name, o.option_value), ', ')
		                 FROM pg_options_to_table(ft.ftoptions) o), '')
		FROM pg_foreign_table ft
		JOIN pg_class c ON c.oid = ft.ftrelid
		JOIN pg_namespace n ON n.oid = c.relnamespace
		JOIN pg_foreign_server s ON s.oid = ft.ftserver
		WHERE n.nspname = $1 AND c.relname = $2`, schema, name,
	).Scan(&server, &opts)
	if err != nil {
		return "", fmt.Errorf("load foreign table server: %w", err)
	}

	var b strings.Builder
	b.WriteString("CREATE FOREIGN TABLE " + qualifiedName(schema, name) + " (\n")
	b.WriteString(strings.Join(lines, ",\n"))
	b.WriteString("\n)\nSERVER " + quoteIdent(server))
	if opts != "" {
		b.WriteString("\nOPTIONS (" + opts + ")")
	}
	b.WriteString(";")
	return b.String(), nil
}

func (r *ClusterRepository) languageDef(ctx context.Context, q connection.Querier, name string) (string, error) {
	var trusted bool
	var handler, inline, validator string
	err := q.QueryRow(ctx, `
		SELECT l.lanpltrusted,
		       COALESCE(NULLIF(l.lanplcallfoid, 0)::regprocedure::text, ''),
		       COALESCE(NULLIF(l.laninline, 0)::regprocedure::text, ''),
		       COALESCE(NULLIF(l.lanvalidator, 0)::regprocedure::text, '')
		FROM pg_language l
		WHERE l.lanname = $1`, name,
	).Scan(&trusted, &handler, &inline, &validator)
	if err != nil {
		return "", fmt.Errorf("load language definition: %w", err)
	}

	var b strings.Builder
	b.WriteString("CREATE ")
	if trusted {
		b.WriteString("TRUSTED ")
	}
	b.WriteString("PROCEDURAL LANGUAGE " + quoteIdent(name))
	if handler != "" {
		b.WriteString("\n    HANDLER " + handler)
	}
	if inline != "" {
		b.WriteString("\n    INLINE " + inline)
	}
	if validator != "" {
		b.WriteString("\n    VALIDATOR " + validator)
	}
	b.WriteString(";")
	return b.String(), nil
}

func (r *ClusterRepository) publicationDef(ctx context.Context, q connection.Querier, name string) (string, error) {
	var allTables, insert, update, del, truncate bool
	err := q.QueryRow(ctx, `
		SELECT puballtables, pubinsert, pubupdate, pubdelete, pubtruncate
		FROM pg_publication
		WHERE pubname = $1`, name,
	).Scan(&allTables, &insert, &update, &del, &truncate)
	if err != nil {
		return "", fmt.Errorf("load publication definition: %w", err)
	}

	var b strings.Builder
	b.WriteString("CREATE PUBLICATION " + quoteIdent(name))
	if allTables {
		b.WriteString("\n    FOR ALL TABLES")
	}
	var ops []string
	if insert {
		ops = append(ops, "insert")
	}
	if update {
		ops = append(ops, "update")
	}
	if del {
		ops = append(ops, "delete")
	}
	if truncate {
		ops = append(ops, "truncate")
	}
	if len(ops) > 0 {
		b.WriteString("\n    WITH (publish = " + sqlLiteral(strings.Join(ops, ", ")) + ")")
	}
	b.WriteString(";")
	return b.String(), nil
}

func (r *ClusterRepository) fdwDef(ctx context.Context, q connection.Querier, name string) (string, error) {
	var opts string
	err := q.QueryRow(ctx, `
		SELECT COALESCE((SELECT string_agg(format('%s %L', o.option_name, o.option_value), ', ')
		                 FROM pg_options_to_table(fdwoptions) o), '')
		FROM pg_foreign_data_wrapper
		WHERE fdwname = $1`, name,
	).Scan(&opts)
	if err != nil {
		return "", fmt.Errorf("load foreign data wrapper: %w", err)
	}

	var b strings.Builder
	b.WriteString("CREATE FOREIGN DATA WRAPPER " + quoteIdent(name))
	if opts != "" {
		b.WriteString("\n    OPTIONS (" + opts + ")")
	}
	b.WriteString(";")
	return b.String(), nil
}

func (r *ClusterRepository) eventTriggerDef(ctx context.Context, q connection.Querier, name string) (string, error) {
	var event, fn, enabled string
	err := q.QueryRow(ctx, `
		SELECT evtevent, evtfoid::regprocedure::text, evtenabled::text
		FROM pg_event_trigger
		WHERE evtname = $1`, name,
	).Scan(&event, &fn, &enabled)
	if err != nil {
		return "", fmt.Errorf("load event trigger definition: %w", err)
	}

	var b strings.Builder
	b.WriteString("CREATE EVENT TRIGGER " + quoteIdent(name) + " ON " + event + "\n    EXECUTE FUNCTION " + fn + "()")
	switch enabled {
	case "D":
		b.WriteString("\nDISABLE")
	case "R":
		b.WriteString("\nENABLE REPLICA")
	case "A":
		b.WriteString("\nENABLE ALWAYS")
	}
	b.WriteString(";")
	return b.String(), nil
}

func (r *ClusterRepository) tablespaceDef(ctx context.Context, q connection.Querier, name string) (string, error) {
	var owner, location, opts string
	err := q.QueryRow(ctx, `
		SELECT pg_get_userbyid(spcowner),
		       pg_tablespace_location(oid),
		       COALESCE((SELECT string_agg(format('%s %L', o.option_name, o.option_value), ', ')
		                 FROM pg_options_to_table(spcoptions) o), '')
		FROM pg_tablespace
		WHERE spcname = $1`, name,
	).Scan(&owner, &location, &opts)
	if err != nil {
		return "", fmt.Errorf("load tablespace definition: %w", err)
	}

	var b strings.Builder
	b.WriteString("CREATE TABLESPACE " + quoteIdent(name) + "\n    OWNER " + quoteIdent(owner) + "\n    LOCATION " + sqlLiteral(location))
	if opts != "" {
		b.WriteString("\n    OPTIONS (" + opts + ")")
	}
	b.WriteString(";")
	return b.String(), nil
}