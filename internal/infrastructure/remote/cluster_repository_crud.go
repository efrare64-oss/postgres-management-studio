package remote

import (
	"context"
	"fmt"
	"strings"

	"postgres-management-studio/internal/domain/cluster"
	"postgres-management-studio/internal/domain/connection"
)

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

func (r *ClusterRepository) AddColumn(ctx context.Context, q connection.Querier, schema, table string, in cluster.AddColumnInput) error {
	if in.Name == "" || in.DataType == "" {
		return fmt.Errorf("column name and data type are required")
	}
	parts := []string{quoteIdent(in.Name), in.DataType}
	if in.Collation != "" {
		parts = append(parts, "COLLATE "+quoteIdent(in.Collation))
	}
	if in.Default != "" {
		parts = append(parts, "DEFAULT "+in.Default)
	}
	if !in.Nullable {
		parts = append(parts, "NOT NULL")
	}
	sql := "ALTER TABLE " + qualifiedName(schema, table) + " ADD COLUMN " + strings.Join(parts, " ")
	return r.execSQL(ctx, q, sql, "add column")
}

func (r *ClusterRepository) AlterColumn(ctx context.Context, q connection.Querier, schema, table, column string, in cluster.AlterColumnInput) error {
	qualified := qualifiedName(schema, table)
	col := quoteIdent(column)

	var cmds []string
	if in.NewName != nil && *in.NewName != "" && *in.NewName != column {
		cmds = append(cmds, "ALTER TABLE "+qualified+" RENAME COLUMN "+col+" TO "+quoteIdent(*in.NewName))
		col = quoteIdent(*in.NewName)
	}
	if in.DataType != nil && *in.DataType != "" {
		cmds = append(cmds, "ALTER TABLE "+qualified+" ALTER COLUMN "+col+" TYPE "+*in.DataType)
	}
	if in.NotNull != nil {
		if *in.NotNull {
			cmds = append(cmds, "ALTER TABLE "+qualified+" ALTER COLUMN "+col+" SET NOT NULL")
		} else {
			cmds = append(cmds, "ALTER TABLE "+qualified+" ALTER COLUMN "+col+" DROP NOT NULL")
		}
	}
	if in.Default != nil {
		if *in.Default == "" {
			cmds = append(cmds, "ALTER TABLE "+qualified+" ALTER COLUMN "+col+" DROP DEFAULT")
		} else {
			cmds = append(cmds, "ALTER TABLE "+qualified+" ALTER COLUMN "+col+" SET DEFAULT "+*in.Default)
		}
	}

	for _, cmd := range cmds {
		if err := r.execSQL(ctx, q, cmd, "alter column"); err != nil {
			return err
		}
	}
	return nil
}

func (r *ClusterRepository) DropColumn(ctx context.Context, q connection.Querier, schema, table, column string, cascade bool) error {
	sql := "ALTER TABLE " + qualifiedName(schema, table) + " DROP COLUMN " + quoteIdent(column) + cascadeSQL(cascade)
	return r.execSQL(ctx, q, sql, "drop column")
}

// ---------------------------------------------------------------------------
// Constraints
// ---------------------------------------------------------------------------

func (r *ClusterRepository) CreateConstraint(ctx context.Context, q connection.Querier, schema, table string, in cluster.ConstraintInput) error {
	if in.Name == "" {
		return fmt.Errorf("constraint name is required")
	}
	def, err := constraintDef(in)
	if err != nil {
		return err
	}
	sql := "ALTER TABLE " + qualifiedName(schema, table) + " ADD CONSTRAINT " + quoteIdent(in.Name) + " " + def
	return r.execSQL(ctx, q, sql, "create constraint")
}

func (r *ClusterRepository) AlterConstraint(ctx context.Context, q connection.Querier, schema, table, constraint string, in cluster.ConstraintInput) error {
	if err := r.DropConstraint(ctx, q, schema, table, constraint, false); err != nil {
		return err
	}
	return r.CreateConstraint(ctx, q, schema, table, in)
}

func (r *ClusterRepository) DropConstraint(ctx context.Context, q connection.Querier, schema, table, constraint string, cascade bool) error {
	sql := "ALTER TABLE " + qualifiedName(schema, table) + " DROP CONSTRAINT " + quoteIdent(constraint) + cascadeSQL(cascade)
	return r.execSQL(ctx, q, sql, "drop constraint")
}

func constraintDef(in cluster.ConstraintInput) (string, error) {
	switch strings.ToLower(in.Type) {
	case "primary", "pk", "p":
		if len(in.Columns) == 0 {
			return "", fmt.Errorf("columns are required")
		}
		return "PRIMARY KEY (" + strings.Join(quoteAll(in.Columns), ", ") + ")", nil
	case "unique", "u":
		if len(in.Columns) == 0 {
			return "", fmt.Errorf("columns are required")
		}
		return "UNIQUE (" + strings.Join(quoteAll(in.Columns), ", ") + ")", nil
	case "check", "c":
		if strings.TrimSpace(in.Check) == "" {
			return "", fmt.Errorf("check expression is required")
		}
		return "CHECK (" + in.Check + ")", nil
	case "foreign", "fk", "f":
		if len(in.Columns) == 0 || in.RefTable == "" || len(in.RefColumns) == 0 {
			return "", fmt.Errorf("columns, referenced table and referenced columns are required")
		}
		def := "FOREIGN KEY (" + strings.Join(quoteAll(in.Columns), ", ") + ") REFERENCES " + qualifiedRefName(in.RefTable) +
			" (" + strings.Join(quoteAll(in.RefColumns), ", ") + ")"
		if in.OnDelete != "" {
			def += " ON DELETE " + strings.ToUpper(in.OnDelete)
		}
		if in.OnUpdate != "" {
			def += " ON UPDATE " + strings.ToUpper(in.OnUpdate)
		}
		if in.Deferrable {
			def += " DEFERRABLE"
		}
		return def, nil
	case "exclusion", "x":
		if strings.TrimSpace(in.Exclusion) == "" {
			return "", fmt.Errorf("exclusion definition is required")
		}
		return "EXCLUDE " + in.Exclusion, nil
	default:
		return "", fmt.Errorf("unsupported constraint type %q", in.Type)
	}
}

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

func (r *ClusterRepository) ReplaceIndex(ctx context.Context, q connection.Querier, schema, table, index string, in cluster.IndexInput) error {
	if in.Name == "" {
		in.Name = index
	}
	if err := r.DropIndex(ctx, q, schema, index); err != nil {
		return err
	}
	return r.CreateIndex(ctx, q, schema, table, in)
}

// ---------------------------------------------------------------------------
// Triggers
// ---------------------------------------------------------------------------

func (r *ClusterRepository) CreateTrigger(ctx context.Context, q connection.Querier, schema, table string, in cluster.TriggerInput) error {
	if in.Name == "" || in.Function == "" {
		return fmt.Errorf("trigger name and function are required")
	}
	timing := strings.ToUpper(in.Timing)
	if timing == "" {
		timing = "BEFORE"
	}
	if len(in.Events) == 0 {
		return fmt.Errorf("at least one event is required")
	}
	sql := "CREATE TRIGGER " + quoteIdent(in.Name) + " " + timing + " " + strings.Join(in.Events, " OR ") +
		" ON " + qualifiedName(schema, table)
	if in.ForEachRow {
		sql += " FOR EACH ROW"
	}
	if in.When != "" {
		sql += " WHEN (" + in.When + ")"
	}
	sql += " EXECUTE FUNCTION " + in.Function
	return r.execSQL(ctx, q, sql, "create trigger")
}

func (r *ClusterRepository) ReplaceTrigger(ctx context.Context, q connection.Querier, schema, table, trigger string, in cluster.TriggerInput) error {
	if err := r.DropTrigger(ctx, q, schema, table, trigger); err != nil {
		return err
	}
	return r.CreateTrigger(ctx, q, schema, table, in)
}

func (r *ClusterRepository) DropTrigger(ctx context.Context, q connection.Querier, schema, table, trigger string) error {
	sql := "DROP TRIGGER " + quoteIdent(trigger) + " ON " + qualifiedName(schema, table)
	return r.execSQL(ctx, q, sql, "drop trigger")
}

func (r *ClusterRepository) SetTriggerEnabled(ctx context.Context, q connection.Querier, schema, table, trigger string, enable bool) error {
	verb := "ENABLE"
	if !enable {
		verb = "DISABLE"
	}
	sql := "ALTER TABLE " + qualifiedName(schema, table) + " " + verb + " TRIGGER " + quoteIdent(trigger)
	return r.execSQL(ctx, q, sql, strings.ToLower(verb)+" trigger")
}

// ---------------------------------------------------------------------------
// Row security policies
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Policies
// ---------------------------------------------------------------------------

func (r *ClusterRepository) ListPolicies(ctx context.Context, q connection.Querier, schema, table string) ([]cluster.Policy, error) {
	rows, err := q.Query(ctx, `
		SELECT p.polname,
		       CASE p.polcmd WHEN '*' THEN 'ALL' WHEN 'r' THEN 'SELECT' WHEN 'a' THEN 'INSERT'
		                     WHEN 'w' THEN 'UPDATE' WHEN 'd' THEN 'DELETE' ELSE p.polcmd::text END,
		       p.polpermissive,
		       COALESCE((SELECT string_agg(pg_get_userbyid(role), ',')
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

	var out []cluster.Policy
	for rows.Next() {
		var p cluster.Policy
		var roles string
		if err := rows.Scan(&p.Name, &p.Command, &p.Permissive, &roles, &p.Using, &p.WithCheck); err != nil {
			return nil, fmt.Errorf("scan policy: %w", err)
		}
		if roles != "PUBLIC" {
			for _, role := range strings.Split(roles, ", ") {
				if role = strings.TrimSpace(role); role != "" {
					p.Roles = append(p.Roles, role)
				}
			}
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func (r *ClusterRepository) CreatePolicy(ctx context.Context, q connection.Querier, schema, table string, in cluster.PolicyInput) error {
	if in.Name == "" {
		return fmt.Errorf("policy name is required")
	}
	sql := "CREATE POLICY " + quoteIdent(in.Name) + " ON " + qualifiedName(schema, table)
	if !in.Permissive {
		sql += " AS RESTRICTIVE"
	}
	if cmd := strings.ToUpper(in.Command); cmd != "" {
		sql += " FOR " + cmd
	}
	if len(in.Roles) > 0 {
		sql += " TO " + strings.Join(quoteAll(in.Roles), ", ")
	}
	if in.Using != "" {
		sql += " USING (" + in.Using + ")"
	}
	if in.WithCheck != "" {
		sql += " WITH CHECK (" + in.WithCheck + ")"
	}
	return r.execSQL(ctx, q, sql, "create policy")
}

func (r *ClusterRepository) ReplacePolicy(ctx context.Context, q connection.Querier, schema, table, policy string, in cluster.PolicyInput) error {
	if err := r.DropPolicy(ctx, q, schema, table, policy); err != nil {
		return err
	}
	return r.CreatePolicy(ctx, q, schema, table, in)
}

func (r *ClusterRepository) DropPolicy(ctx context.Context, q connection.Querier, schema, table, policy string) error {
	sql := "DROP POLICY " + quoteIdent(policy) + " ON " + qualifiedName(schema, table)
	return r.execSQL(ctx, q, sql, "drop policy")
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

func (r *ClusterRepository) ListRules(ctx context.Context, q connection.Querier, schema, table string) ([]cluster.Rule, error) {
	rows, err := q.Query(ctx, `
		SELECT r.rulename, pg_get_ruledef(r.oid)
		FROM pg_rewrite r
		JOIN pg_class c ON c.oid = r.ev_class
		JOIN pg_namespace n ON n.oid = c.relnamespace
		WHERE n.nspname = $1 AND c.relname = $2 AND r.rulename <> '_RETURN'
		ORDER BY r.rulename`, schema, table)
	if err != nil {
		return nil, fmt.Errorf("list rules: %w", err)
	}
	defer rows.Close()

	var out []cluster.Rule
	for rows.Next() {
		var name, def string
		if err := rows.Scan(&name, &def); err != nil {
			return nil, fmt.Errorf("scan rule: %w", err)
		}
		out = append(out, cluster.Rule{Name: name, Event: ruleEvent(def), Instead: ruleInstead(def), Where: ruleWhere(def), Action: ruleAction(def)})
	}
	return out, rows.Err()
}

func ruleEvent(def string) string {
	if i := strings.Index(def, " ON "); i >= 0 {
		rest := def[i+4:]
		if j := strings.IndexByte(rest, ' '); j > 0 {
			return rest[:j]
		}
		return rest
	}
	return ""
}

func ruleInstead(def string) bool {
	return strings.Contains(def, " DO INSTEAD ")
}

func ruleWhere(def string) string {
	di := strings.Index(def, " DO ")
	wi := strings.Index(def, " WHERE ")
	if wi < 0 || (di > 0 && di < wi) {
		return ""
	}
	inner := def[wi+len(" WHERE "):]
	return stripOuterParens(inner)
}

func ruleAction(def string) string {
	di := strings.Index(def, " DO ")
	if di < 0 {
		return ""
	}
	rest := def[di+len(" DO "):]
	if strings.HasPrefix(rest, "INSTEAD ") {
		rest = rest[len("INSTEAD "):]
	}
	if strings.HasPrefix(rest, "NOTHING") {
		return "NOTHING"
	}
	return stripOuterParens(rest)
}

func stripOuterParens(s string) string {
	s = strings.TrimSpace(s)
	if !strings.HasPrefix(s, "(") {
		return s
	}
	depth := 0
	for i, ch := range s {
		switch ch {
		case '(':
			depth++
		case ')':
			depth--
			if depth == 0 {
				return strings.TrimSpace(s[1:i])
			}
		}
	}
	return s
}

func (r *ClusterRepository) CreateRule(ctx context.Context, q connection.Querier, schema, table string, in cluster.RuleInput) error {
	if in.Name == "" || in.Event == "" {
		return fmt.Errorf("rule name and event are required")
	}
	sql := "CREATE RULE " + quoteIdent(in.Name) + " AS ON " + strings.ToUpper(in.Event) + " TO " + qualifiedName(schema, table)
	if in.Where != "" {
		sql += " WHERE " + in.Where
	}
	sql += " DO "
	if in.Instead {
		sql += "INSTEAD "
	}
	if action := strings.TrimSpace(in.Action); action == "" || strings.EqualFold(action, "NOTHING") {
		sql += "NOTHING"
	} else {
		sql += action
	}
	return r.execSQL(ctx, q, sql, "create rule")
}

func (r *ClusterRepository) ReplaceRule(ctx context.Context, q connection.Querier, schema, table, rule string, in cluster.RuleInput) error {
	if err := r.DropRule(ctx, q, schema, table, rule); err != nil {
		return err
	}
	return r.CreateRule(ctx, q, schema, table, in)
}

func (r *ClusterRepository) DropRule(ctx context.Context, q connection.Querier, schema, table, rule string) error {
	sql := "DROP RULE " + quoteIdent(rule) + " ON " + qualifiedName(schema, table)
	return r.execSQL(ctx, q, sql, "drop rule")
}

// ---------------------------------------------------------------------------
// Partitions
// ---------------------------------------------------------------------------

func (r *ClusterRepository) AddPartition(ctx context.Context, q connection.Querier, schema, table string, name, bounds string) error {
	if name == "" || bounds == "" {
		return fmt.Errorf("partition name and bounds are required")
	}
	sql := "CREATE TABLE " + quoteIdent(name) + " PARTITION OF " + qualifiedName(schema, table) + " FOR VALUES " + bounds
	return r.execSQL(ctx, q, sql, "create partition")
}

func (r *ClusterRepository) AttachPartition(ctx context.Context, q connection.Querier, schema, table, partition, bounds string) error {
	if partition == "" || bounds == "" {
		return fmt.Errorf("partition table and bounds are required")
	}
	sql := "ALTER TABLE " + qualifiedName(schema, table) + " ATTACH PARTITION " + qualifiedRefName(partition) + " FOR VALUES " + bounds
	return r.execSQL(ctx, q, sql, "attach partition")
}

func (r *ClusterRepository) DetachPartition(ctx context.Context, q connection.Querier, schema, table, partition string) error {
	sql := "ALTER TABLE " + qualifiedName(schema, table) + " DETACH PARTITION " + qualifiedRefName(partition)
	return r.execSQL(ctx, q, sql, "detach partition")
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

func quoteAll(names []string) []string {
	out := make([]string, len(names))
	for i, n := range names {
		out[i] = quoteIdent(strings.TrimSpace(n))
	}
	return out
}

// qualifiedRefName quotes each part of a possibly schema-qualified name.
func qualifiedRefName(s string) string {
	parts := strings.Split(s, ".")
	for i := range parts {
		parts[i] = quoteIdent(strings.TrimSpace(parts[i]))
	}
	return strings.Join(parts, ".")
}