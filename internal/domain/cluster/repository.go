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
	ListProcedures(ctx context.Context, q connection.Querier, schema string) ([]Procedure, error)
	ListTriggers(ctx context.Context, q connection.Querier, schema, table string) ([]Trigger, error)
	ListTablespaces(ctx context.Context, q connection.Querier) ([]CatalogObject, error)
	ListCatalogObjects(ctx context.Context, q connection.Querier, scope CatalogScope, kind string) ([]CatalogObject, error)
	GetObjectSQL(ctx context.Context, q connection.Querier, schema, name, kind string) (string, error)
	GetTableStats(ctx context.Context, q connection.Querier, schema, table string) (*TableStats, error)
	GetColumnStats(ctx context.Context, q connection.Querier, schema, table string) ([]ColumnStat, error)
	GetCompletionSchema(ctx context.Context, q connection.Querier) ([]CompletionTable, error)
	GetServerDashboard(ctx context.Context, q connection.Querier) (*ServerDashboard, error)
	GetDatabaseDashboard(ctx context.Context, q connection.Querier) (*DatabaseDashboard, error)

	// Data grid
	GetTableData(ctx context.Context, q connection.Querier, schema, table string, limit, offset int) (*TableData, error)
	CountTableRows(ctx context.Context, q connection.Querier, schema, table string) (int64, error)
	SaveTableData(ctx context.Context, q connection.Querier, schema, table string, input TableDataSave) (*DataSaveResult, error)

	// Maintenance / actions
	TruncateTable(ctx context.Context, q connection.Querier, schema, table string, restartIdentity, cascade bool) error
	ReindexTable(ctx context.Context, q connection.Querier, schema, table string) error
	ReindexIndex(ctx context.Context, q connection.Querier, schema, name string) error
	AddPartition(ctx context.Context, q connection.Querier, schema, table string, name, bounds string) error
	AttachPartition(ctx context.Context, q connection.Querier, schema, table, partition, bounds string) error
	DetachPartition(ctx context.Context, q connection.Querier, schema, table, partition string) error
	AnalyzeTable(ctx context.Context, q connection.Querier, schema, table string) error
	AnalyzeDatabase(ctx context.Context, q connection.Querier) error
	RefreshMatView(ctx context.Context, q connection.Querier, schema, name string, withData bool) error
	DropView(ctx context.Context, q connection.Querier, schema, name string, cascade bool) error
	DropMatView(ctx context.Context, q connection.Querier, schema, name string, cascade bool) error
	DropSequence(ctx context.Context, q connection.Querier, schema, name string) error
	DropFunction(ctx context.Context, q connection.Querier, schema, name, arguments string) error
	DropProcedure(ctx context.Context, q connection.Querier, schema, name string) error
	DropSchema(ctx context.Context, q connection.Querier, schema string, cascade bool) error
	DropExtension(ctx context.Context, q connection.Querier, name string) error
	DropIndex(ctx context.Context, q connection.Querier, schema, name string) error
	DropCatalogObject(ctx context.Context, q connection.Querier, schema, name, kind string, cascade bool) error

	// Create objects
	CreateSchema(ctx context.Context, q connection.Querier, name, owner string) error
	CreateView(ctx context.Context, q connection.Querier, schema, name, definition string, replace bool) error
	CreateMatView(ctx context.Context, q connection.Querier, schema, name, definition string, withData bool) error
	CreateSequence(ctx context.Context, q connection.Querier, schema, name string, in SequenceInput) error
	CreateFunction(ctx context.Context, q connection.Querier, schema, name string, in FunctionInput) error
	CreateProcedure(ctx context.Context, q connection.Querier, schema, name string, in ProcedureInput) error
	CreateIndex(ctx context.Context, q connection.Querier, schema, table string, in IndexInput) error
	CreateExtension(ctx context.Context, q connection.Querier, name, schema string) error

	// Table object CRUD
	AddColumn(ctx context.Context, q connection.Querier, schema, table string, in AddColumnInput) error
	AlterColumn(ctx context.Context, q connection.Querier, schema, table, column string, in AlterColumnInput) error
	DropColumn(ctx context.Context, q connection.Querier, schema, table, column string, cascade bool) error
	CreateConstraint(ctx context.Context, q connection.Querier, schema, table string, in ConstraintInput) error
	AlterConstraint(ctx context.Context, q connection.Querier, schema, table, constraint string, in ConstraintInput) error
	DropConstraint(ctx context.Context, q connection.Querier, schema, table, constraint string, cascade bool) error
	ReplaceIndex(ctx context.Context, q connection.Querier, schema, table, index string, in IndexInput) error
	CreateTrigger(ctx context.Context, q connection.Querier, schema, table string, in TriggerInput) error
	ReplaceTrigger(ctx context.Context, q connection.Querier, schema, table, trigger string, in TriggerInput) error
	DropTrigger(ctx context.Context, q connection.Querier, schema, table, trigger string) error
	SetTriggerEnabled(ctx context.Context, q connection.Querier, schema, table, trigger string, enable bool) error
	CreatePolicy(ctx context.Context, q connection.Querier, schema, table string, in PolicyInput) error
	ReplacePolicy(ctx context.Context, q connection.Querier, schema, table, policy string, in PolicyInput) error
	DropPolicy(ctx context.Context, q connection.Querier, schema, table, policy string) error
	ListPolicies(ctx context.Context, q connection.Querier, schema, table string) ([]Policy, error)
	CreateRule(ctx context.Context, q connection.Querier, schema, table string, in RuleInput) error
	ReplaceRule(ctx context.Context, q connection.Querier, schema, table, rule string, in RuleInput) error
	DropRule(ctx context.Context, q connection.Querier, schema, table, rule string) error
	ListRules(ctx context.Context, q connection.Querier, schema, table string) ([]Rule, error)

	// Dashboard extras
	ListLocks(ctx context.Context, q connection.Querier) ([]Lock, error)
	ListSettings(ctx context.Context, q connection.Querier) ([]Setting, error)
	CancelSession(ctx context.Context, q connection.Querier, pid int64) error
	TerminateSession(ctx context.Context, q connection.Querier, pid int64) error

	// Grants
	ApplyGrants(ctx context.Context, q connection.Querier, in GrantInput) error

	// Search
	SearchObjects(ctx context.Context, q connection.Querier, search string, limit int) ([]SearchObject, error)

	// Dependencies / Dependents
	GetDependencies(ctx context.Context, q connection.Querier, schema, name, kind string) ([]Dependency, error)
	GetDependents(ctx context.Context, q connection.Querier, schema, name, kind string) ([]Dependent, error)

	// Import CSV
	ImportCSV(ctx context.Context, q connection.Querier, schema, table string, columns []string, rows [][]string) (*CSVImportResult, error)
}