package remote

import (
	"context"
	"fmt"

	"postgres-management-studio/internal/domain/cluster"
	"postgres-management-studio/internal/domain/connection"
)

func (r *ClusterRepository) ListTablespaces(ctx context.Context, q connection.Querier) ([]cluster.CatalogObject, error) {
	rows, err := q.Query(ctx, `
		SELECT spcname, pg_get_userbyid(spcowner)
		FROM pg_tablespace
		ORDER BY spcname`)
	if err != nil {
		return nil, fmt.Errorf("list tablespaces: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.CatalogObject, 0)
	for rows.Next() {
		var o cluster.CatalogObject
		if err := rows.Scan(&o.Name, &o.Detail); err != nil {
			return nil, fmt.Errorf("scan tablespace: %w", err)
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

func (r *ClusterRepository) ListCatalogObjects(ctx context.Context, q connection.Querier, scope cluster.CatalogScope, kind string) ([]cluster.CatalogObject, error) {
	switch kind {
	case "casts":
		return r.castObjects(ctx, q)
	case "event_triggers":
		return r.eventTriggerObjects(ctx, q)
	case "extensions":
		return r.extensionObjects(ctx, q)
	case "foreign_data_wrappers":
		return r.foreignDataWrapperObjects(ctx, q)
	case "languages":
		return r.languageObjects(ctx, q)
	case "publications":
		return r.publicationObjects(ctx, q)
	case "subscriptions":
		return r.subscriptionObjects(ctx, q)
	case "aggregates":
		return r.schemaObjects(ctx, q, scope.Schema, "aggregates")
	case "collations":
		return r.schemaObjects(ctx, q, scope.Schema, "collations")
	case "domains":
		return r.schemaObjects(ctx, q, scope.Schema, "domains")
	case "foreign_tables":
		return r.schemaObjects(ctx, q, scope.Schema, "foreign_tables")
	case "fts_configurations":
		return r.schemaObjects(ctx, q, scope.Schema, "fts_configurations")
	case "fts_dictionaries":
		return r.schemaObjects(ctx, q, scope.Schema, "fts_dictionaries")
	case "fts_parsers":
		return r.schemaObjects(ctx, q, scope.Schema, "fts_parsers")
	case "fts_templates":
		return r.schemaObjects(ctx, q, scope.Schema, "fts_templates")
	case "operators":
		return r.schemaObjects(ctx, q, scope.Schema, "operators")
	case "synonyms":
		return r.synonymObjects(ctx, q, scope.Schema)
	case "types":
		return r.schemaObjects(ctx, q, scope.Schema, "types")
	case "columns":
		return r.relationObjects(ctx, q, scope, "columns")
	case "indexes":
		return r.relationObjects(ctx, q, scope, "indexes")
	case "triggers":
		return r.relationObjects(ctx, q, scope, "triggers")
	case "rules":
		return r.relationObjects(ctx, q, scope, "rules")
	case "partitions":
		return r.relationObjects(ctx, q, scope, "partitions")
	case "row_security_policies":
		return r.relationObjects(ctx, q, scope, "row_security_policies")
	case "constraints:check":
		return r.relationObjects(ctx, q, scope, "constraints:check")
	case "constraints:fk":
		return r.relationObjects(ctx, q, scope, "constraints:fk")
	case "constraints:exclusion":
		return r.relationObjects(ctx, q, scope, "constraints:exclusion")
	case "constraints:index":
		return r.relationObjects(ctx, q, scope, "constraints:index")
	default:
		return nil, fmt.Errorf("unknown catalog kind %q", kind)
	}
}

func (r *ClusterRepository) castObjects(ctx context.Context, q connection.Querier) ([]cluster.CatalogObject, error) {
	rows, err := q.Query(ctx, `
		SELECT c.castsource::regtype::text || ' AS ' || c.casttarget::regtype::text,
		       CASE WHEN c.castfunc = 0 THEN 'binary' ELSE c.castfunc::regproc::text END
		FROM pg_cast c
		ORDER BY 1`)
	if err != nil {
		return nil, fmt.Errorf("list casts: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.CatalogObject, 0)
	for rows.Next() {
		var o cluster.CatalogObject
		if err := rows.Scan(&o.Name, &o.Detail); err != nil {
			return nil, fmt.Errorf("scan cast: %w", err)
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

func (r *ClusterRepository) eventTriggerObjects(ctx context.Context, q connection.Querier) ([]cluster.CatalogObject, error) {
	rows, err := q.Query(ctx, `
		SELECT evtname, evtevent
		FROM pg_event_trigger
		ORDER BY evtname`)
	if err != nil {
		return nil, fmt.Errorf("list event triggers: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.CatalogObject, 0)
	for rows.Next() {
		var o cluster.CatalogObject
		if err := rows.Scan(&o.Name, &o.Detail); err != nil {
			return nil, fmt.Errorf("scan event trigger: %w", err)
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

func (r *ClusterRepository) extensionObjects(ctx context.Context, q connection.Querier) ([]cluster.CatalogObject, error) {
	rows, err := q.Query(ctx, `
		SELECT extname, extversion
		FROM pg_extension
		ORDER BY extname`)
	if err != nil {
		return nil, fmt.Errorf("list extensions: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.CatalogObject, 0)
	for rows.Next() {
		var o cluster.CatalogObject
		if err := rows.Scan(&o.Name, &o.Detail); err != nil {
			return nil, fmt.Errorf("scan extension: %w", err)
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

func (r *ClusterRepository) foreignDataWrapperObjects(ctx context.Context, q connection.Querier) ([]cluster.CatalogObject, error) {
	rows, err := q.Query(ctx, `
		SELECT fdwname, COALESCE(fdwhandler::regproc::text, '')
		FROM pg_foreign_data_wrapper
		ORDER BY fdwname`)
	if err != nil {
		return nil, fmt.Errorf("list foreign data wrappers: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.CatalogObject, 0)
	for rows.Next() {
		var o cluster.CatalogObject
		if err := rows.Scan(&o.Name, &o.Detail); err != nil {
			return nil, fmt.Errorf("scan fdw: %w", err)
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

func (r *ClusterRepository) languageObjects(ctx context.Context, q connection.Querier) ([]cluster.CatalogObject, error) {
	rows, err := q.Query(ctx, `
		SELECT lanname, CASE WHEN lanpltrusted THEN 'trusted' ELSE '' END
		FROM pg_language
		WHERE lanispl
		ORDER BY lanname`)
	if err != nil {
		return nil, fmt.Errorf("list languages: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.CatalogObject, 0)
	for rows.Next() {
		var o cluster.CatalogObject
		if err := rows.Scan(&o.Name, &o.Detail); err != nil {
			return nil, fmt.Errorf("scan language: %w", err)
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

func (r *ClusterRepository) publicationObjects(ctx context.Context, q connection.Querier) ([]cluster.CatalogObject, error) {
	rows, err := q.Query(ctx, `
		SELECT pubname, CASE WHEN puballtables THEN 'ALL TABLES' ELSE 'specific tables' END
		FROM pg_publication
		ORDER BY pubname`)
	if err != nil {
		return nil, fmt.Errorf("list publications: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.CatalogObject, 0)
	for rows.Next() {
		var o cluster.CatalogObject
		if err := rows.Scan(&o.Name, &o.Detail); err != nil {
			return nil, fmt.Errorf("scan publication: %w", err)
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

func (r *ClusterRepository) subscriptionObjects(ctx context.Context, q connection.Querier) ([]cluster.CatalogObject, error) {
	rows, err := q.Query(ctx, `
		SELECT subname, CASE WHEN subenabled THEN 'enabled' ELSE 'disabled' END
		FROM pg_subscription
		ORDER BY subname`)
	if err != nil {
		return nil, fmt.Errorf("list subscriptions: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.CatalogObject, 0)
	for rows.Next() {
		var o cluster.CatalogObject
		if err := rows.Scan(&o.Name, &o.Detail); err != nil {
			return nil, fmt.Errorf("scan subscription: %w", err)
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

func (r *ClusterRepository) schemaObjects(ctx context.Context, q connection.Querier, schema, kind string) ([]cluster.CatalogObject, error) {
	var query string
	switch kind {
	case "aggregates":
		query = `
			SELECT p.proname, pg_get_function_identity_arguments(p.oid)
			FROM pg_proc p
			JOIN pg_namespace n ON n.oid = p.pronamespace
			WHERE n.nspname = $1 AND p.prokind = 'a'
			ORDER BY p.proname`
	case "collations":
		query = `
			SELECT c.collname, c.collcollate
			FROM pg_collation c
			JOIN pg_namespace n ON n.oid = c.collnamespace
			WHERE n.nspname = $1
			ORDER BY c.collname`
	case "domains":
		query = `
			SELECT t.typname, format_type(t.typbasetype, t.typtypmod)
			FROM pg_type t
			JOIN pg_namespace n ON n.oid = t.typnamespace
			WHERE n.nspname = $1 AND t.typtype = 'd'
			ORDER BY t.typname`
	case "foreign_tables":
		query = `
			SELECT c.relname, COALESCE(fs.srvname, '')
			FROM pg_class c
			JOIN pg_namespace n ON n.oid = c.relnamespace
			JOIN pg_foreign_table ft ON ft.ftrelid = c.oid
			LEFT JOIN pg_foreign_server fs ON fs.oid = ft.ftserver
			WHERE c.relkind = 'f' AND n.nspname = $1
			ORDER BY c.relname`
	case "fts_configurations":
		query = `
			SELECT c.cfgname, ''
			FROM pg_ts_config c
			JOIN pg_namespace n ON n.oid = c.cfgnamespace
			WHERE n.nspname = $1
			ORDER BY c.cfgname`
	case "fts_dictionaries":
		query = `
			SELECT d.dictname, COALESCE(d.dictinitoption, '')
			FROM pg_ts_dict d
			JOIN pg_namespace n ON n.oid = d.dictnamespace
			WHERE n.nspname = $1
			ORDER BY d.dictname`
	case "fts_parsers":
		query = `
			SELECT p.prsname, ''
			FROM pg_ts_parser p
			JOIN pg_namespace n ON n.oid = p.prsnamespace
			WHERE n.nspname = $1
			ORDER BY p.prsname`
	case "fts_templates":
		query = `
			SELECT t.tmplname, ''
			FROM pg_ts_template t
			JOIN pg_namespace n ON n.oid = t.tmplnamespace
			WHERE n.nspname = $1
			ORDER BY t.tmplname`
	case "operators":
		query = `
			SELECT o.oprname, o.oprleft::regtype::text || ', ' || o.oprright::regtype::text
			FROM pg_operator o
			JOIN pg_namespace n ON n.oid = o.oprnamespace
			WHERE n.nspname = $1
			ORDER BY o.oprname`
	case "types":
		query = `
			SELECT t.typname, CASE t.typtype
			                  WHEN 'b' THEN 'base type'
			                  WHEN 'c' THEN 'composite'
			                  WHEN 'e' THEN 'enum'
			                  WHEN 'r' THEN 'range'
			                  ELSE 'type' END
			FROM pg_type t
			JOIN pg_namespace n ON n.oid = t.typnamespace
			WHERE n.nspname = $1 AND t.typtype IN ('b', 'c', 'e', 'r')
			  AND t.typname NOT LIKE '\_%'
			  AND NOT EXISTS (SELECT 1 FROM pg_class c
			                  WHERE c.oid = t.typrelid
			                    AND c.relkind IN ('r', 'v', 'm', 'f', 'p'))
			ORDER BY t.typname`
	default:
		return nil, fmt.Errorf("unknown schema catalog kind %q", kind)
	}

	rows, err := q.Query(ctx, query, schema)
	if err != nil {
		return nil, fmt.Errorf("list %s: %w", kind, err)
	}
	defer rows.Close()

	out := make([]cluster.CatalogObject, 0)
	for rows.Next() {
		var o cluster.CatalogObject
		if err := rows.Scan(&o.Name, &o.Detail); err != nil {
			return nil, fmt.Errorf("scan %s: %w", kind, err)
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

func (r *ClusterRepository) synonymObjects(ctx context.Context, q connection.Querier, schema string) ([]cluster.CatalogObject, error) {
	var exists bool
	if err := q.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM pg_catalog.pg_class
			WHERE relname = 'pg_synonym' AND relnamespace = 'pg_catalog'::regnamespace
		)`).Scan(&exists); err != nil {
		return nil, fmt.Errorf("check pg_synonym: %w", err)
	}
	if !exists {
		return []cluster.CatalogObject{}, nil
	}

	rows, err := q.Query(ctx, `
		SELECT s.synname, s.synobjschema || '.' || s.synobjname
		FROM pg_synonym s
		WHERE s.synnamespace = $1
		ORDER BY s.synname`, schema)
	if err != nil {
		return nil, fmt.Errorf("list synonyms: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.CatalogObject, 0)
	for rows.Next() {
		var o cluster.CatalogObject
		if err := rows.Scan(&o.Name, &o.Detail); err != nil {
			return nil, fmt.Errorf("scan synonym: %w", err)
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

func (r *ClusterRepository) relationObjects(ctx context.Context, q connection.Querier, scope cluster.CatalogScope, kind string) ([]cluster.CatalogObject, error) {
	var query string
	var args []any

	switch kind {
	case "columns":
		query = `
			SELECT a.attname, format_type(a.atttypid, a.atttypmod)
			FROM pg_attribute a
			JOIN pg_class c ON c.oid = a.attrelid
			JOIN pg_namespace n ON n.oid = c.relnamespace
			WHERE n.nspname = $1 AND c.relname = $2 AND a.attnum > 0 AND NOT a.attisdropped
			ORDER BY a.attnum`
		args = []any{scope.Schema, scope.Table}
	case "indexes":
		query = `
			SELECT i.relname, am.amname
			FROM pg_index ix
			JOIN pg_class i ON i.oid = ix.indexrelid
			JOIN pg_am am ON am.oid = i.relam
			JOIN pg_class c ON c.oid = ix.indrelid
			JOIN pg_namespace n ON n.oid = c.relnamespace
			WHERE n.nspname = $1 AND c.relname = $2
			ORDER BY i.relname`
		args = []any{scope.Schema, scope.Table}
	case "triggers":
		query = `
			SELECT t.tgname,
			       CASE t.tgtype & 66 WHEN 2 THEN 'BEFORE' WHEN 64 THEN 'INSTEAD OF' ELSE 'AFTER' END
			FROM pg_trigger t
			JOIN pg_class c ON c.oid = t.tgrelid
			JOIN pg_namespace n ON n.oid = c.relnamespace
			WHERE n.nspname = $1 AND c.relname = $2 AND NOT t.tgisinternal
			ORDER BY t.tgname`
		args = []any{scope.Schema, scope.Table}
	case "rules":
		query = `
			SELECT r.rulename, c.relname
			FROM pg_rewrite r
			JOIN pg_class c ON c.oid = r.ev_class
			JOIN pg_namespace n ON n.oid = c.relnamespace
			WHERE n.nspname = $1 AND c.relname = $2 AND r.rulename <> '_RETURN'
			ORDER BY r.rulename`
		args = []any{scope.Schema, scope.Table}
	case "partitions":
		query = `
			SELECT child.relname,
			       COALESCE(pg_get_expr(child.relpartbound, child.oid), '')
			FROM pg_inherits i
			JOIN pg_class parent ON parent.oid = i.inhparent
			JOIN pg_namespace pn ON pn.oid = parent.relnamespace
			JOIN pg_class child ON child.oid = i.inhrelid
			JOIN pg_namespace cn ON cn.oid = child.relnamespace
			WHERE pn.nspname = $1 AND parent.relname = $2 AND cn.nspname = $1
			ORDER BY child.relname`
		args = []any{scope.Schema, scope.Table}
	case "row_security_policies":
		query = `
			SELECT p.polname,
			       CASE p.polcmd WHEN '*' THEN 'ALL' WHEN 'r' THEN 'SELECT'
			                     WHEN 'a' THEN 'INSERT' WHEN 'w' THEN 'UPDATE'
			                     WHEN 'd' THEN 'DELETE' ELSE p.polcmd::text END
			FROM pg_policy p
			JOIN pg_class c ON c.oid = p.polrelid
			JOIN pg_namespace n ON n.oid = c.relnamespace
			WHERE n.nspname = $1 AND c.relname = $2
			ORDER BY p.polname`
		args = []any{scope.Schema, scope.Table}
	case "constraints:check":
		query = `
			SELECT conname, pg_get_constraintdef(oid)
			FROM pg_constraint
			WHERE conrelid = $1::regclass AND contype = 'c'
			ORDER BY conname`
	case "constraints:fk":
		query = `
			SELECT conname, pg_get_constraintdef(oid)
			FROM pg_constraint
			WHERE conrelid = $1::regclass AND contype = 'f'
			ORDER BY conname`
	case "constraints:exclusion":
		query = `
			SELECT conname, pg_get_constraintdef(oid)
			FROM pg_constraint
			WHERE conrelid = $1::regclass AND contype = 'x'
			ORDER BY conname`
	case "constraints:index":
		query = `
			SELECT conname, CASE contype WHEN 'p' THEN 'PRIMARY KEY' WHEN 'u' THEN 'UNIQUE' END
			FROM pg_constraint
			WHERE conrelid = $1::regclass AND contype IN ('p', 'u')
			ORDER BY conname`
	default:
		return nil, fmt.Errorf("unknown relation catalog kind %q", kind)
	}

	if len(args) == 0 {
		args = []any{qualifiedName(scope.Schema, scope.Table)}
	}

	rows, err := q.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list %s: %w", kind, err)
	}
	defer rows.Close()

	out := make([]cluster.CatalogObject, 0)
	for rows.Next() {
		var o cluster.CatalogObject
		if err := rows.Scan(&o.Name, &o.Detail); err != nil {
			return nil, fmt.Errorf("scan %s: %w", kind, err)
		}
		out = append(out, o)
	}
	return out, rows.Err()
}