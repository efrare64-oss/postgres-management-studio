package remote

import (
	"context"
	"fmt"
	"strings"

	"postgres-management-studio/internal/domain/cluster"
	"postgres-management-studio/internal/domain/connection"
)

func (r *ClusterRepository) ListRoles(ctx context.Context, q connection.Querier) ([]cluster.Role, error) {
	rows, err := q.Query(ctx, `
		SELECT r.rolname,
		       r.rolsuper,
		       r.rolcreatedb,
		       r.rolcanlogin,
		       r.rolreplication,
		       r.rolconnlimit,
		       COALESCE((SELECT string_agg(g.rolname, ', ')
		                 FROM pg_auth_members m
		                 JOIN pg_roles g ON g.oid = m.roleid
		                 WHERE m.member = r.oid), '')
		FROM pg_roles r
		ORDER BY r.rolname`)
	if err != nil {
		return nil, fmt.Errorf("list roles: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.Role, 0)
	for rows.Next() {
		var r cluster.Role
		if err := rows.Scan(&r.Name, &r.Superuser, &r.CreateDB, &r.CanLogin, &r.Replication, &r.ConnLimit, &r.MemberOf); err != nil {
			return nil, fmt.Errorf("scan role: %w", err)
		}
		out = append(out, r)
	}
	return out, rows.Err()
}

func (r *ClusterRepository) CreateRole(ctx context.Context, q connection.Querier, name string, input cluster.RoleInput) error {
	sql := "CREATE ROLE " + quoteIdent(name) + " " + roleOptions(input)
	if _, err := q.Query(ctx, sql); err != nil {
		return fmt.Errorf("create role: %w", err)
	}
	return nil
}

func (r *ClusterRepository) AlterRole(ctx context.Context, q connection.Querier, name string, input cluster.RoleInput) error {
	sql := "ALTER ROLE " + quoteIdent(name) + " " + roleOptions(input)
	if _, err := q.Query(ctx, sql); err != nil {
		return fmt.Errorf("alter role: %w", err)
	}
	return nil
}

func (r *ClusterRepository) DropRole(ctx context.Context, q connection.Querier, name string) error {
	sql := "DROP ROLE " + quoteIdent(name)
	if _, err := q.Query(ctx, sql); err != nil {
		return fmt.Errorf("drop role: %w", err)
	}
	return nil
}

func roleOptions(input cluster.RoleInput) string {
	var opts []string

	opts = append(opts, boolOption(input.CanLogin, "LOGIN", "NOLOGIN"))
	opts = append(opts, boolOption(input.Superuser, "SUPERUSER", "NOSUPERUSER"))
	opts = append(opts, boolOption(input.CreateDB, "CREATEDB", "NOCREATEDB"))
	opts = append(opts, boolOption(input.Replication, "REPLICATION", "NOREPLICATION"))

	if input.ConnLimit > 0 {
		opts = append(opts, fmt.Sprintf("CONNECTION LIMIT %d", input.ConnLimit))
	}
	if input.Password != "" {
		opts = append(opts, "PASSWORD '"+escapeSQL(input.Password)+"'")
	}

	return strings.Join(opts, " ")
}

func escapeSQL(s string) string {
	return strings.ReplaceAll(s, "'", "''")
}

func boolOption(value bool, yes, no string) string {
	if value {
		return yes
	}
	return no
}
