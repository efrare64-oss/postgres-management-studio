package remote

import (
	"context"
	"fmt"
	"strings"

	"postgres-management-studio/internal/domain/cluster"
	"postgres-management-studio/internal/domain/connection"
)

// ---------------------------------------------------------------------------
// Data grid
// ---------------------------------------------------------------------------

func (r *ClusterRepository) GetTableData(ctx context.Context, q connection.Querier, schema, table string, limit, offset int) (*cluster.TableData, error) {
	qualified := qualifiedName(schema, table)

	cols, hasPK, err := r.dataColumns(ctx, q, qualified)
	if err != nil {
		return nil, err
	}

	var total int64
	if err := q.QueryRow(ctx, "SELECT count(*) FROM "+qualified).Scan(&total); err != nil {
		return nil, fmt.Errorf("count table rows: %w", err)
	}

	sel := "SELECT * FROM " + qualified + " LIMIT $1 OFFSET $2"
	rows, err := q.Query(ctx, sel, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("select table data: %w", err)
	}
	defer rows.Close()

	data, err := readRows(rows)
	if err != nil {
		return nil, err
	}

	return &cluster.TableData{
		Columns: cols,
		Rows:    data,
		Total:   total,
		HasPK:   hasPK,
	}, nil
}

func (r *ClusterRepository) CountTableRows(ctx context.Context, q connection.Querier, schema, table string) (int64, error) {
	var count int64
	if err := q.QueryRow(ctx, "SELECT count(*) FROM "+qualifiedName(schema, table)).Scan(&count); err != nil {
		return 0, fmt.Errorf("count table rows: %w", err)
	}
	return count, nil
}

func (r *ClusterRepository) dataColumns(ctx context.Context, q connection.Querier, qualified string) ([]cluster.TableColumn, bool, error) {
	rows, err := q.Query(ctx, `
		SELECT a.attname,
		       format_type(a.atttypid, a.atttypmod),
		       COALESCE((SELECT TRUE
		                 FROM pg_index i
		                 WHERE i.indrelid = a.attrelid AND i.indisprimary
		                   AND a.attnum = ANY (i.indkey)), FALSE)
		FROM pg_attribute a
		WHERE a.attrelid = $1::regclass AND a.attnum > 0 AND NOT a.attisdropped
		ORDER BY a.attnum`, qualified)
	if err != nil {
		return nil, false, fmt.Errorf("load data columns: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.TableColumn, 0)
	hasPK := false
	for rows.Next() {
		var c cluster.TableColumn
		if err := rows.Scan(&c.Name, &c.DataType, &c.IsPK); err != nil {
			return nil, false, fmt.Errorf("scan data column: %w", err)
		}
		if c.IsPK {
			hasPK = true
		}
		out = append(out, c)
	}
	if err := rows.Err(); err != nil {
		return nil, false, err
	}
	return out, hasPK, nil
}

func readRows(rows pgxRows) ([][]any, error) {
	var out [][]any
	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			return nil, fmt.Errorf("read row values: %w", err)
		}
		for i := range values {
			values[i] = normalizeCell(values[i])
		}
		out = append(out, values)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate rows: %w", err)
	}
	return out, nil
}

// pgxRows is the subset of pgx.Rows used here.
type pgxRows interface {
	Next() bool
	Values() ([]any, error)
	Err() error
	Close()
}

func (r *ClusterRepository) SaveTableData(ctx context.Context, q connection.Querier, schema, table string, in cluster.TableDataSave) (*cluster.DataSaveResult, error) {
	qualified := qualifiedName(schema, table)
	res := &cluster.DataSaveResult{}

	for _, row := range in.Inserts {
		if len(row) == 0 {
			continue
		}
		cols := make([]string, 0, len(row))
		args := make([]any, 0, len(row))
		for c, v := range row {
			cols = append(cols, quoteIdent(c))
			args = append(args, v)
		}
		sql := "INSERT INTO " + qualified + " (" + strings.Join(cols, ", ") + ") VALUES (" + placeholders(len(args)) + ")"
		if _, err := q.Query(ctx, sql, args...); err != nil {
			return nil, fmt.Errorf("insert row: %w", err)
		}
		res.Inserted++
	}

	for _, change := range in.Updates {
		if len(change.New) == 0 || len(change.Old) == 0 {
			continue
		}
		var sets []string
		var args []any
		for c, v := range change.New {
			sets = append(sets, quoteIdent(c)+" = $"+fmt.Sprintf("%d", len(args)+1))
			args = append(args, v)
		}
		where, whereArgs := whereClause(change.Old, len(args))
		if len(where) == 0 {
			continue
		}
		sql := "UPDATE " + qualified + " SET " + strings.Join(sets, ", ") + " WHERE " + where
		args = append(args, whereArgs...)
		if _, err := q.Query(ctx, sql, args...); err != nil {
			return nil, fmt.Errorf("update row: %w", err)
		}
		res.Updated++
	}

	for _, row := range in.Deletes {
		if len(row) == 0 {
			continue
		}
		where, args := whereClause(row, 0)
		if len(where) == 0 {
			continue
		}
		sql := "DELETE FROM " + qualified + " WHERE " + where
		if _, err := q.Query(ctx, sql, args...); err != nil {
			return nil, fmt.Errorf("delete row: %w", err)
		}
		res.Deleted++
	}

	return res, nil
}

func placeholders(n int) string {
	parts := make([]string, n)
	for i := range parts {
		parts[i] = fmt.Sprintf("$%d", i+1)
	}
	return strings.Join(parts, ", ")
}

// whereClause builds "c1 = $N AND c2 = $N+1 ..." using non-null values only.
func whereClause(values map[string]any, start int) (string, []any) {
	var conds []string
	var args []any
	for c, v := range values {
		if v == nil {
			continue
		}
		start++
		conds = append(conds, quoteIdent(c)+" = $"+fmt.Sprintf("%d", start))
		args = append(args, v)
	}
	return strings.Join(conds, " AND "), args
}

// ---------------------------------------------------------------------------
// Maintenance / actions
// ---------------------------------------------------------------------------

func (r *ClusterRepository) TruncateTable(ctx context.Context, q connection.Querier, schema, table string, restartIdentity, cascade bool) error {
	sql := "TRUNCATE TABLE " + qualifiedName(schema, table)
	if restartIdentity {
		sql += " RESTART IDENTITY"
	}
	if cascade {
		sql += " CASCADE"
	}
	return r.execSQL(ctx, q, sql, "truncate table")
}

func (r *ClusterRepository) ReindexTable(ctx context.Context, q connection.Querier, schema, table string) error {
	return r.execSQL(ctx, q, "REINDEX TABLE "+qualifiedName(schema, table), "reindex table")
}

func (r *ClusterRepository) ReindexIndex(ctx context.Context, q connection.Querier, schema, name string) error {
	return r.execSQL(ctx, q, "REINDEX INDEX "+qualifiedName(schema, name), "reindex index")
}

func (r *ClusterRepository) AnalyzeTable(ctx context.Context, q connection.Querier, schema, table string) error {
	return r.execSQL(ctx, q, "ANALYZE "+qualifiedName(schema, table), "analyze table")
}

func (r *ClusterRepository) AnalyzeDatabase(ctx context.Context, q connection.Querier) error {
	return r.execSQL(ctx, q, "ANALYZE", "analyze database")
}

func (r *ClusterRepository) RefreshMatView(ctx context.Context, q connection.Querier, schema, name string, withData bool) error {
	sql := "REFRESH MATERIALIZED VIEW"
	if !withData {
		sql += " WITH NO DATA"
	}
	sql += " " + qualifiedName(schema, name)
	return r.execSQL(ctx, q, sql, "refresh materialized view")
}

func (r *ClusterRepository) DropView(ctx context.Context, q connection.Querier, schema, name string, cascade bool) error {
	return r.execSQL(ctx, q, "DROP VIEW "+qualifiedName(schema, name)+cascadeSQL(cascade), "drop view")
}

func (r *ClusterRepository) DropMatView(ctx context.Context, q connection.Querier, schema, name string, cascade bool) error {
	return r.execSQL(ctx, q, "DROP MATERIALIZED VIEW "+qualifiedName(schema, name)+cascadeSQL(cascade), "drop materialized view")
}

func (r *ClusterRepository) DropSequence(ctx context.Context, q connection.Querier, schema, name string) error {
	return r.execSQL(ctx, q, "DROP SEQUENCE "+qualifiedName(schema, name), "drop sequence")
}

func (r *ClusterRepository) DropFunction(ctx context.Context, q connection.Querier, schema, name, arguments string) error {
	args := ""
	if arguments != "" {
		args = "(" + arguments + ")"
	}
	return r.execSQL(ctx, q, "DROP FUNCTION "+qualifiedName(schema, name)+args, "drop function")
}

func (r *ClusterRepository) DropSchema(ctx context.Context, q connection.Querier, schema string, cascade bool) error {
	return r.execSQL(ctx, q, "DROP SCHEMA "+quoteIdent(schema)+cascadeSQL(cascade), "drop schema")
}

func (r *ClusterRepository) DropExtension(ctx context.Context, q connection.Querier, name string) error {
	return r.execSQL(ctx, q, "DROP EXTENSION "+quoteIdent(name), "drop extension")
}

func (r *ClusterRepository) DropIndex(ctx context.Context, q connection.Querier, schema, name string) error {
	return r.execSQL(ctx, q, "DROP INDEX "+qualifiedName(schema, name), "drop index")
}

func cascadeSQL(cascade bool) string {
	if cascade {
		return " CASCADE"
	}
	return ""
}

func (r *ClusterRepository) execSQL(ctx context.Context, q connection.Querier, sql, label string) error {
	rows, err := q.Query(ctx, sql)
	if err != nil {
		return fmt.Errorf("%s: %w", label, err)
	}
	rows.Close()
	return nil
}

// ---------------------------------------------------------------------------
// Create objects
// ---------------------------------------------------------------------------

func (r *ClusterRepository) CreateSchema(ctx context.Context, q connection.Querier, name, owner string) error {
	sql := "CREATE SCHEMA " + quoteIdent(name)
	if owner != "" {
		sql += " AUTHORIZATION " + quoteIdent(owner)
	}
	return r.execSQL(ctx, q, sql, "create schema")
}

func (r *ClusterRepository) CreateView(ctx context.Context, q connection.Querier, schema, name, definition string, replace bool) error {
	verb := "CREATE"
	if replace {
		verb = "CREATE OR REPLACE"
	}
	if definition == "" {
		return fmt.Errorf("view definition is required")
	}
	sql := verb + " VIEW " + qualifiedName(schema, name) + " AS " + strings.TrimSpace(strings.TrimSuffix(definition, ";"))
	return r.execSQL(ctx, q, sql, "create view")
}

func (r *ClusterRepository) CreateMatView(ctx context.Context, q connection.Querier, schema, name, definition string, withData bool) error {
	if definition == "" {
		return fmt.Errorf("materialized view definition is required")
	}
	sql := "CREATE MATERIALIZED VIEW " + qualifiedName(schema, name)
	if !withData {
		sql += " WITH NO DATA"
	}
	sql += " AS " + strings.TrimSpace(strings.TrimSuffix(definition, ";"))
	return r.execSQL(ctx, q, sql, "create materialized view")
}

func (r *ClusterRepository) CreateSequence(ctx context.Context, q connection.Querier, schema, name string, in cluster.SequenceInput) error {
	var opts []string
	if in.DataType != "" {
		opts = append(opts, "AS "+in.DataType)
	}
	if in.Start != 0 || in.Min != 0 || in.Max != 0 {
		opts = append(opts, fmt.Sprintf("START WITH %d", in.Start))
		opts = append(opts, fmt.Sprintf("MINVALUE %d", in.Min))
		opts = append(opts, fmt.Sprintf("MAXVALUE %d", in.Max))
	}
	if in.Increment != 0 {
		opts = append(opts, fmt.Sprintf("INCREMENT BY %d", in.Increment))
	}
	if in.Cache != 0 {
		opts = append(opts, fmt.Sprintf("CACHE %d", in.Cache))
	}
	if in.Owner != "" {
		opts = append(opts, "OWNED BY "+in.Owner)
	}
	sql := "CREATE SEQUENCE " + qualifiedName(schema, name)
	if len(opts) > 0 {
		sql += " " + strings.Join(opts, " ")
	}
	return r.execSQL(ctx, q, sql, "create sequence")
}

func (r *ClusterRepository) CreateFunction(ctx context.Context, q connection.Querier, schema, name string, in cluster.FunctionInput) error {
	language := in.Language
	if language == "" {
		language = "plpgsql"
	}
	returnType := in.ReturnType
	if returnType == "" {
		returnType = "void"
	}
	verb := "CREATE"
	if in.Replace {
		verb = "CREATE OR REPLACE"
	}
	volatility := "VOLATILE"
	switch in.Volatility {
	case "immutable":
		volatility = "IMMUTABLE"
	case "stable":
		volatility = "STABLE"
	}

	body := strings.TrimSpace(in.Body)
	if language == "sql" {
		sql := verb + " FUNCTION " + qualifiedName(schema, name) + "(" + in.Arguments + ") RETURNS " + returnType + " LANGUAGE sql " + volatility + " AS $$" + body + "$$"
		return r.execSQL(ctx, q, sql, "create function")
	}

	sql := verb + " FUNCTION " + qualifiedName(schema, name) + "(" + in.Arguments + ") RETURNS " + returnType + " LANGUAGE " + language + " " + volatility + " AS $$" + body + "$$"
	return r.execSQL(ctx, q, sql, "create function")
}

func (r *ClusterRepository) CreateIndex(ctx context.Context, q connection.Querier, schema, table string, in cluster.IndexInput) error {
	if in.Name == "" || in.Columns == "" {
		return fmt.Errorf("index name and columns are required")
	}
	method := in.Method
	if method == "" {
		method = "btree"
	}
	sql := "CREATE "
	if in.Unique {
		sql += "UNIQUE "
	}
	sql += "INDEX " + quoteIdent(in.Name) + " ON " + qualifiedName(schema, table) + " USING " + method + " (" + in.Columns + ")"
	if in.Fillfactor > 0 {
		sql += fmt.Sprintf(" WITH (fillfactor = %d)", in.Fillfactor)
	}
	if in.Tablespace != "" {
		sql += " TABLESPACE " + quoteIdent(in.Tablespace)
	}
	if in.Where != "" {
		sql += " WHERE " + in.Where
	}
	return r.execSQL(ctx, q, sql, "create index")
}

func (r *ClusterRepository) CreateExtension(ctx context.Context, q connection.Querier, name, schema string) error {
	sql := "CREATE EXTENSION " + quoteIdent(name)
	if schema != "" {
		sql += " WITH SCHEMA " + quoteIdent(schema)
	}
	return r.execSQL(ctx, q, sql, "create extension")
}

// ---------------------------------------------------------------------------
// Dashboard extras
// ---------------------------------------------------------------------------

func (r *ClusterRepository) ListLocks(ctx context.Context, q connection.Querier) ([]cluster.Lock, error) {
	rows, err := q.Query(ctx, `
		SELECT l.pid,
		       COALESCE(d.datname, ''),
		       COALESCE(u.usename, ''),
		       COALESCE(c.relname, ''),
		       l.mode,
		       l.granted,
		       COALESCE(pg_stat_get_backend_wait_event_type(pg_backend_pid())::text, '')
		FROM pg_locks l
		LEFT JOIN pg_database d ON d.oid = l.database
		LEFT JOIN pg_roles u ON u.oid = l.pid::regrole::oid
		LEFT JOIN pg_class c ON c.oid = l.relation
		WHERE l.mode IS NOT NULL
		ORDER BY l.pid`)
	if err != nil {
		return nil, fmt.Errorf("list locks: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.Lock, 0)
	for rows.Next() {
		var l cluster.Lock
		if err := rows.Scan(&l.PID, &l.Database, &l.User, &l.Relation, &l.Mode, &l.Granted, &l.WaitEvent); err != nil {
			return nil, fmt.Errorf("scan lock: %w", err)
		}
		out = append(out, l)
	}
	return out, rows.Err()
}

func (r *ClusterRepository) ListSettings(ctx context.Context, q connection.Querier) ([]cluster.Setting, error) {
	rows, err := q.Query(ctx, `
		SELECT name, setting, COALESCE(unit, ''), context, COALESCE(category, ''), COALESCE(short_desc, '')
		FROM pg_settings
		WHERE name NOT LIKE '%.%'
		ORDER BY name`)
	if err != nil {
		return nil, fmt.Errorf("list settings: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.Setting, 0)
	for rows.Next() {
		var s cluster.Setting
		if err := rows.Scan(&s.Name, &s.Value, &s.Unit, &s.Context, &s.Category, &s.Description); err != nil {
			return nil, fmt.Errorf("scan setting: %w", err)
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

func (r *ClusterRepository) CancelSession(ctx context.Context, q connection.Querier, pid int64) error {
	return r.execSQL(ctx, q, fmt.Sprintf("SELECT pg_cancel_backend(%d)", pid), "cancel session")
}

func (r *ClusterRepository) TerminateSession(ctx context.Context, q connection.Querier, pid int64) error {
	return r.execSQL(ctx, q, fmt.Sprintf("SELECT pg_terminate_backend(%d)", pid), "terminate session")
}

// ---------------------------------------------------------------------------
// Grants
// ---------------------------------------------------------------------------

func (r *ClusterRepository) ApplyGrants(ctx context.Context, q connection.Querier, in cluster.GrantInput) error {
	if len(in.Privileges) == 0 || len(in.Roles) == 0 {
		return fmt.Errorf("privileges and roles are required")
	}
	if in.ObjectName == "" && in.Schema == "" {
		return fmt.Errorf("object is required")
	}

	target := objectTarget(in.ObjectKind, in.Schema, in.ObjectName)
	privs := strings.Join(in.Privileges, ", ")
	withGrant := ""
	if in.WithGrant {
		withGrant = " WITH GRANT OPTION"
	}

	roles := make([]string, len(in.Roles))
	for i, role := range in.Roles {
		roles[i] = quoteIdent(role)
	}

	sql := "GRANT " + privs + " ON " + target + " TO " + strings.Join(roles, ", ") + withGrant
	return r.execSQL(ctx, q, sql, "apply grant")
}

func objectTarget(kind, schema, name string) string {
	switch kind {
	case "database":
		return "DATABASE " + quoteIdent(name)
	case "schema":
		return "SCHEMA " + quoteIdent(name)
	case "tablespace":
		return "TABLESPACE " + quoteIdent(name)
	case "function":
		return "FUNCTION " + qualifiedName(schema, name) + "()"
	case "sequence":
		return "SEQUENCE " + qualifiedName(schema, name)
	case "all_tables":
		return "ALL TABLES IN SCHEMA " + quoteIdent(name)
	case "all_sequences":
		return "ALL SEQUENCES IN SCHEMA " + quoteIdent(name)
	case "all_functions":
		return "ALL FUNCTIONS IN SCHEMA " + quoteIdent(name)
	default:
		return "TABLE " + qualifiedName(schema, name)
	}
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

func (r *ClusterRepository) SearchObjects(ctx context.Context, q connection.Querier, search string, limit int) ([]cluster.SearchObject, error) {
	if limit <= 0 {
		limit = 100
	}
	pattern := "%" + strings.ToLower(search) + "%"

	rows, err := q.Query(ctx, `
		SELECT n.nspname, c.relname,
		       CASE c.relkind
		          WHEN 'r' THEN 'table' WHEN 'p' THEN 'table' WHEN 'v' THEN 'view'
		          WHEN 'm' THEN 'matview' WHEN 'S' THEN 'sequence' WHEN 'f' THEN 'foreign table'
		          WHEN 'i' THEN 'index' ELSE 'relation' END,
		       ''
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
		  AND n.nspname NOT LIKE 'pg_temp_%'
		  AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
		  AND c.relname ILIKE $1
		UNION ALL
		SELECT n.nspname, p.proname, 'function', pg_get_function_identity_arguments(p.oid)
		FROM pg_proc p
		JOIN pg_namespace n ON n.oid = p.pronamespace
		WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
		  AND p.proname ILIKE $1
		UNION ALL
		SELECT n.nspname, t.typname, 'type', ''
		FROM pg_type t
		JOIN pg_namespace n ON n.oid = t.typnamespace
		WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
		  AND t.typname ILIKE $1
		ORDER BY 2
		LIMIT $2`, pattern, limit)
	if err != nil {
		return nil, fmt.Errorf("search objects: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.SearchObject, 0)
	for rows.Next() {
		var o cluster.SearchObject
		if err := rows.Scan(&o.Schema, &o.Name, &o.Kind, &o.Detail); err != nil {
			return nil, fmt.Errorf("scan search object: %w", err)
		}
		out = append(out, o)
	}
	return out, rows.Err()
}

// ---------------------------------------------------------------------------
// Dependencies / Dependents
// ---------------------------------------------------------------------------

func objectOIDQuery(kind string) string {
	switch kind {
	case "function":
		return `(SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = $1 AND p.proname = $2)`
	case "schema":
		return `(SELECT oid FROM pg_namespace WHERE nspname = $2)`
	case "database":
		return `(SELECT oid FROM pg_database WHERE datname = $2)`
	case "tablespace":
		return `(SELECT oid FROM pg_tablespace WHERE spcname = $2)`
	case "role":
		return `(SELECT oid FROM pg_roles WHERE rolname = $2)`
	default:
		return `(SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = $1 AND c.relname = $2)`
	}
}

func (r *ClusterRepository) GetDependencies(ctx context.Context, q connection.Querier, schema, name, kind string) ([]cluster.Dependency, error) {
	objOID := objectOIDQuery(kind)
	schemaArg := schema
	if kind == "schema" || kind == "database" || kind == "tablespace" || kind == "role" {
		schemaArg = ""
	}

	rows, err := q.Query(ctx, `
		SELECT
			CASE
				WHEN refclassid = 'pg_class'::regclass THEN
					CASE rc.relkind
						WHEN 'r' THEN 'table' WHEN 'p' THEN 'table' WHEN 'v' THEN 'view'
						WHEN 'm' THEN 'matview' WHEN 'S' THEN 'sequence'
						WHEN 'f' THEN 'foreign table' WHEN 'i' THEN 'index'
						ELSE 'relation' END
				WHEN refclassid = 'pg_proc'::regclass THEN 'function'
				WHEN refclassid = 'pg_type'::regclass THEN 'type'
				WHEN refclassid = 'pg_namespace'::regclass THEN 'schema'
				WHEN refclassid = 'pg_constraint'::regclass THEN 'constraint'
				WHEN refclassid = 'pg_trigger'::regclass THEN 'trigger'
				ELSE 'object'
			END AS type,
			COALESCE(rn.nspname, '') AS schema,
			CASE
				WHEN refclassid = 'pg_class'::regclass THEN rc.relname
				WHEN refclassid = 'pg_proc'::regclass THEN rp.proname
				WHEN refclassid = 'pg_type'::regclass THEN rt.typname
				WHEN refclassid = 'pg_namespace'::regclass THEN rns.nspname
				WHEN refclassid = 'pg_constraint'::regclass THEN rcon.conname
				WHEN refclassid = 'pg_trigger'::regclass THEN rtg.tgname
				ELSE COALESCE(rc.relname, rp.proname, rt.typname, '')
			END AS name,
			COALESCE(
				CASE
					WHEN refclassid = 'pg_class'::regclass THEN pg_get_userbyid(rc.relowner)
					WHEN refclassid = 'pg_proc'::regclass THEN pg_get_userbyid(rp.proowner)
					WHEN refclassid = 'pg_namespace'::regclass THEN pg_get_userbyid(rns.nspowner)
					ELSE ''
				END, '') AS owner,
			CASE d.deptype
				WHEN 'n' THEN 'normal'
				WHEN 'i' THEN 'internal'
				WHEN 'a' THEN 'auto'
				WHEN 'e' THEN 'extension'
				WHEN 'p' THEN 'pin'
				ELSE d.deptype::text
			END AS dep_type
		FROM pg_depend d
		JOIN `+objOID+` AS obj_oid ON obj_oid = d.objid
		LEFT JOIN pg_class rc ON d.refclassid = 'pg_class'::regclass AND d.refobjid = rc.oid
		LEFT JOIN pg_namespace rn ON rc.relnamespace = rn.oid AND rc.oid IS NOT NULL
		LEFT JOIN pg_proc rp ON d.refclassid = 'pg_proc'::regclass AND d.refobjid = rp.oid
		LEFT JOIN pg_namespace rpn ON rp.pronamespace = rpn.oid AND rp.oid IS NOT NULL
		LEFT JOIN pg_type rt ON d.refclassid = 'pg_type'::regclass AND d.refobjid = rt.oid
		LEFT JOIN pg_namespace rtn ON rt.typnamespace = rtn.oid AND rt.oid IS NOT NULL
		LEFT JOIN pg_namespace rns ON d.refclassid = 'pg_namespace'::regclass AND d.refobjid = rns.oid
		LEFT JOIN pg_constraint rcon ON d.refclassid = 'pg_constraint'::regclass AND d.refobjid = rcon.oid
		LEFT JOIN pg_trigger rtg ON d.refclassid = 'pg_trigger'::regclass AND d.refobjid = rtg.oid
		WHERE d.refclassid <> 'pg_catalog'::regclass
		  AND COALESCE(rn.nspname, rpn.nspname, rtn.nspname) NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
		  AND COALESCE(rn.nspname, rpn.nspname, rtn.nspname) NOT LIKE 'pg_temp_%'
		ORDER BY type, schema, name
		LIMIT 500`, schemaArg, name)
	if err != nil {
		return nil, fmt.Errorf("get dependencies: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.Dependency, 0)
	for rows.Next() {
		var d cluster.Dependency
		if err := rows.Scan(&d.Type, &d.Schema, &d.Name, &d.Owner, &d.DepType); err != nil {
			return nil, fmt.Errorf("scan dependency: %w", err)
		}
		if d.Name == "" {
			continue
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (r *ClusterRepository) GetDependents(ctx context.Context, q connection.Querier, schema, name, kind string) ([]cluster.Dependent, error) {
	objOID := objectOIDQuery(kind)
	schemaArg := schema
	if kind == "schema" || kind == "database" || kind == "tablespace" || kind == "role" {
		schemaArg = ""
	}

	rows, err := q.Query(ctx, `
		SELECT
			CASE
				WHEN classid = 'pg_class'::regclass THEN
					CASE c.relkind
						WHEN 'r' THEN 'table' WHEN 'p' THEN 'table' WHEN 'v' THEN 'view'
						WHEN 'm' THEN 'matview' WHEN 'S' THEN 'sequence'
						WHEN 'f' THEN 'foreign table' WHEN 'i' THEN 'index'
						ELSE 'relation' END
				WHEN classid = 'pg_proc'::regclass THEN 'function'
				WHEN classid = 'pg_type'::regclass THEN 'type'
				WHEN classid = 'pg_namespace'::regclass THEN 'schema'
				WHEN classid = 'pg_constraint'::regclass THEN 'constraint'
				WHEN classid = 'pg_trigger'::regclass THEN 'trigger'
				ELSE 'object'
			END AS type,
			COALESCE(n.nspname, '') AS schema,
			CASE
				WHEN classid = 'pg_class'::regclass THEN c.relname
				WHEN classid = 'pg_proc'::regclass THEN p.proname
				WHEN classid = 'pg_type'::regclass THEN t.typname
				WHEN classid = 'pg_namespace'::regclass THEN ns.nspname
				WHEN classid = 'pg_constraint'::regclass THEN con.conname
				WHEN classid = 'pg_trigger'::regclass THEN tg.tgname
				ELSE COALESCE(c.relname, p.proname, t.typname, '')
			END AS name,
			COALESCE(
				CASE
					WHEN classid = 'pg_class'::regclass THEN pg_get_userbyid(c.relowner)
					WHEN classid = 'pg_proc'::regclass THEN pg_get_userbyid(p.proowner)
					WHEN classid = 'pg_namespace'::regclass THEN pg_get_userbyid(ns.nspowner)
					ELSE ''
				END, '') AS owner,
			CASE d.deptype
				WHEN 'n' THEN 'normal'
				WHEN 'i' THEN 'internal'
				WHEN 'a' THEN 'auto'
				WHEN 'e' THEN 'extension'
				WHEN 'p' THEN 'pin'
				ELSE d.deptype::text
			END AS dep_type
		FROM pg_depend d
		JOIN `+objOID+` AS obj_oid ON obj_oid = d.refobjid
		LEFT JOIN pg_class c ON d.classid = 'pg_class'::regclass AND d.objid = c.oid
		LEFT JOIN pg_namespace n ON c.relnamespace = n.oid AND c.oid IS NOT NULL
		LEFT JOIN pg_proc p ON d.classid = 'pg_proc'::regclass AND d.objid = p.oid
		LEFT JOIN pg_namespace pn ON p.pronamespace = pn.oid AND p.oid IS NOT NULL
		LEFT JOIN pg_type t ON d.classid = 'pg_type'::regclass AND d.objid = t.oid
		LEFT JOIN pg_namespace tn ON t.typnamespace = tn.oid AND t.oid IS NOT NULL
		LEFT JOIN pg_namespace ns ON d.classid = 'pg_namespace'::regclass AND d.objid = ns.oid
		LEFT JOIN pg_constraint con ON d.classid = 'pg_constraint'::regclass AND d.objid = con.oid
		LEFT JOIN pg_trigger tg ON d.classid = 'pg_trigger'::regclass AND d.objid = tg.oid
		WHERE d.classid <> 'pg_catalog'::regclass
		  AND COALESCE(n.nspname, pn.nspname, tn.nspname) NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
		  AND COALESCE(n.nspname, pn.nspname, tn.nspname) NOT LIKE 'pg_temp_%'
		ORDER BY type, schema, name
		LIMIT 500`, schemaArg, name)
	if err != nil {
		return nil, fmt.Errorf("get dependents: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.Dependent, 0)
	for rows.Next() {
		var d cluster.Dependent
		if err := rows.Scan(&d.Type, &d.Schema, &d.Name, &d.Owner, &d.DepType); err != nil {
			return nil, fmt.Errorf("scan dependent: %w", err)
		}
		if d.Name == "" {
			continue
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

// ---------------------------------------------------------------------------
// Import CSV
// ---------------------------------------------------------------------------

func (r *ClusterRepository) ImportCSV(ctx context.Context, q connection.Querier, schema, table string, columns []string, rows [][]string) (*cluster.CSVImportResult, error) {
	if len(columns) == 0 {
		return nil, fmt.Errorf("columns are required")
	}
	qualified := qualifiedName(schema, table)

	colQuoted := make([]string, len(columns))
	for i, c := range columns {
		colQuoted[i] = quoteIdent(c)
	}

	result := &cluster.CSVImportResult{}

	batchSize := 100
	for start := 0; start < len(rows); start += batchSize {
		end := start + batchSize
		if end > len(rows) {
			end = len(rows)
		}
		batch := rows[start:end]

		var valueClauses []string
		var args []any
		argIdx := 0
		for _, row := range batch {
			if len(row) == 0 {
				continue
			}
			placeholders := make([]string, len(columns))
			for i := 0; i < len(columns); i++ {
				argIdx++
				var v any
				if i < len(row) {
					s := strings.TrimSpace(row[i])
					if strings.ToLower(s) == "null" || s == "" {
						v = nil
					} else {
						v = s
					}
				} else {
					v = nil
				}
				placeholders[i] = fmt.Sprintf("$%d", argIdx)
				args = append(args, v)
			}
			valueClauses = append(valueClauses, "("+strings.Join(placeholders, ", ")+")")
		}

		if len(valueClauses) == 0 {
			continue
		}

		sql := "INSERT INTO " + qualified + " (" + strings.Join(colQuoted, ", ") + ") VALUES " + strings.Join(valueClauses, ", ")

		func() {
			defer func() {
				if rec := recover(); rec != nil {
					result.Errors += len(batch)
				}
			}()
			rs, err := q.Query(ctx, sql, args...)
			if err != nil {
				result.Errors += len(batch)
				return
			}
			rs.Close()
			result.Inserted += len(batch)
		}()
	}

	result.Message = fmt.Sprintf("%d linhas inseridas, %d erros", result.Inserted, result.Errors)
	return result, nil
}