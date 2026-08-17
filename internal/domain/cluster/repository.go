package cluster

import (
	"context"

	"postgres-management-studio/internal/domain/connection"
)

type Repository interface {
	ListDatabases(ctx context.Context, q connection.Querier) ([]Database, error)
	ListSchemas(ctx context.Context, q connection.Querier) ([]Schema, error)
	ListTables(ctx context.Context, q connection.Querier, schema string) ([]Table, error)
	GetTableDetail(ctx context.Context, q connection.Querier, schema, table string) (*TableDetail, error)
	CreateTable(ctx context.Context, q connection.Querier, schema string, input CreateTableInput) error
	RenameTable(ctx context.Context, q connection.Querier, schema, table, newName string) error
	CommentTable(ctx context.Context, q connection.Querier, schema, table, comment string) error
	DropTable(ctx context.Context, q connection.Querier, schema, table string) error
	ListRoles(ctx context.Context, q connection.Querier) ([]Role, error)
	CreateRole(ctx context.Context, q connection.Querier, name string, input RoleInput) error
	AlterRole(ctx context.Context, q connection.Querier, name string, input RoleInput) error
	DropRole(ctx context.Context, q connection.Querier, name string) error
	ListViews(ctx context.Context, q connection.Querier, schema string) ([]View, error)
	ListMatViews(ctx context.Context, q connection.Querier, schema string) ([]MatView, error)
	ListSequences(ctx context.Context, q connection.Querier, schema string) ([]Sequence, error)
	ListFunctions(ctx context.Context, q connection.Querier, schema string) ([]Function, error)
	ListTriggers(ctx context.Context, q connection.Querier, schema, table string) ([]Trigger, error)
	GetObjectSQL(ctx context.Context, q connection.Querier, schema, name, kind string) (string, error)
	GetTableStats(ctx context.Context, q connection.Querier, schema, table string) (*TableStats, error)
	GetCompletionSchema(ctx context.Context, q connection.Querier) ([]CompletionTable, error)
	GetServerDashboard(ctx context.Context, q connection.Querier) (*ServerDashboard, error)
	GetDatabaseDashboard(ctx context.Context, q connection.Querier) (*DatabaseDashboard, error)
}
