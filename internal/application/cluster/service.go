package cluster

import (
	"context"
	"fmt"
	"strings"

	"postgres-management-studio/internal/domain/cluster"
	"postgres-management-studio/internal/domain/connection"
	"postgres-management-studio/internal/domain/server"
)

type Service struct {
	servers server.Repository
	repo    cluster.Repository
	conn    connection.Provider
}

func NewService(servers server.Repository, repo cluster.Repository, conn connection.Provider) *Service {
	return &Service{servers: servers, repo: repo, conn: conn}
}

func (s *Service) ListDatabases(ctx context.Context, serverID int64) ([]cluster.Database, error) {
	var out []cluster.Database
	err := s.withServer(ctx, serverID, func(q connection.Querier) error {
		var err error
		out, err = s.repo.ListDatabases(ctx, q)
		return err
	})
	return out, err
}

func (s *Service) ListSchemas(ctx context.Context, serverID int64, database string) ([]cluster.Schema, error) {
	var out []cluster.Schema
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.ListSchemas(ctx, q)
		return err
	})
	return out, err
}

func (s *Service) ListTables(ctx context.Context, serverID int64, database, schema string) ([]cluster.Table, error) {
	var out []cluster.Table
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.ListTables(ctx, q, schema)
		return err
	})
	return out, err
}

func (s *Service) GetTableDetail(ctx context.Context, serverID int64, database, schema, table string) (*cluster.TableDetail, error) {
	var out *cluster.TableDetail
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.GetTableDetail(ctx, q, schema, table)
		return err
	})
	return out, err
}

func (s *Service) CreateTable(ctx context.Context, serverID int64, database, schema string, in cluster.CreateTableInput) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.CreateTable(ctx, q, schema, in)
	})
}

func (s *Service) RenameTable(ctx context.Context, serverID int64, database, schema, table, newName string) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.RenameTable(ctx, q, schema, table, newName)
	})
}

func (s *Service) CommentTable(ctx context.Context, serverID int64, database, schema, table, comment string) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.CommentTable(ctx, q, schema, table, comment)
	})
}

func (s *Service) DropTable(ctx context.Context, serverID int64, database, schema, table string) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.DropTable(ctx, q, schema, table)
	})
}

func (s *Service) ListRoles(ctx context.Context, serverID int64) ([]cluster.Role, error) {
	var out []cluster.Role
	err := s.withServer(ctx, serverID, func(q connection.Querier) error {
		var err error
		out, err = s.repo.ListRoles(ctx, q)
		return err
	})
	return out, err
}

func (s *Service) CreateRole(ctx context.Context, serverID int64, name string, in cluster.RoleInput) error {
	return s.withServer(ctx, serverID, func(q connection.Querier) error {
		return s.repo.CreateRole(ctx, q, name, in)
	})
}

func (s *Service) AlterRole(ctx context.Context, serverID int64, name string, in cluster.RoleInput) error {
	return s.withServer(ctx, serverID, func(q connection.Querier) error {
		return s.repo.AlterRole(ctx, q, name, in)
	})
}

func (s *Service) DropRole(ctx context.Context, serverID int64, name string) error {
	return s.withServer(ctx, serverID, func(q connection.Querier) error {
		return s.repo.DropRole(ctx, q, name)
	})
}

func (s *Service) ListViews(ctx context.Context, serverID int64, database, schema string) ([]cluster.View, error) {
	var out []cluster.View
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.ListViews(ctx, q, schema)
		return err
	})
	return out, err
}

func (s *Service) ListMatViews(ctx context.Context, serverID int64, database, schema string) ([]cluster.MatView, error) {
	var out []cluster.MatView
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.ListMatViews(ctx, q, schema)
		return err
	})
	return out, err
}

func (s *Service) ListSequences(ctx context.Context, serverID int64, database, schema string) ([]cluster.Sequence, error) {
	var out []cluster.Sequence
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.ListSequences(ctx, q, schema)
		return err
	})
	return out, err
}

func (s *Service) ListFunctions(ctx context.Context, serverID int64, database, schema string) ([]cluster.Function, error) {
	var out []cluster.Function
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.ListFunctions(ctx, q, schema)
		return err
	})
	return out, err
}

func (s *Service) ListProcedures(ctx context.Context, serverID int64, database, schema string) ([]cluster.Procedure, error) {
	var out []cluster.Procedure
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.ListProcedures(ctx, q, schema)
		return err
	})
	return out, err
}

func (s *Service) ListTriggers(ctx context.Context, serverID int64, database, schema, table string) ([]cluster.Trigger, error) {
	var out []cluster.Trigger
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.ListTriggers(ctx, q, schema, table)
		return err
	})
	return out, err
}

func (s *Service) ListTablespaces(ctx context.Context, serverID int64) ([]cluster.CatalogObject, error) {
	var out []cluster.CatalogObject
	err := s.withServer(ctx, serverID, func(q connection.Querier) error {
		var err error
		out, err = s.repo.ListTablespaces(ctx, q)
		return err
	})
	return out, err
}

func (s *Service) ListCatalogObjects(ctx context.Context, serverID int64, database string, scope cluster.CatalogScope, kind string) ([]cluster.CatalogObject, error) {
	var out []cluster.CatalogObject
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.ListCatalogObjects(ctx, q, scope, kind)
		return err
	})
	return out, err
}

func (s *Service) GetObjectSQL(ctx context.Context, serverID int64, database, schema, name, kind, table string) (string, error) {
	var out string
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.GetObjectSQL(ctx, q, schema, name, kind, table)
		return err
	})
	return out, err
}

func (s *Service) GetTableStats(ctx context.Context, serverID int64, database, schema, table string) (*cluster.TableStats, error) {
	var out *cluster.TableStats
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.GetTableStats(ctx, q, schema, table)
		return err
	})
	return out, err
}

func (s *Service) GetColumnStats(ctx context.Context, serverID int64, database, schema, table string) ([]cluster.ColumnStat, error) {
	var out []cluster.ColumnStat
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.GetColumnStats(ctx, q, schema, table)
		return err
	})
	return out, err
}

func (s *Service) GetCompletionSchema(ctx context.Context, serverID int64, database string) ([]cluster.CompletionTable, error) {
	var out []cluster.CompletionTable
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.GetCompletionSchema(ctx, q)
		return err
	})
	return out, err
}

func (s *Service) GetServerDashboard(ctx context.Context, serverID int64) (*cluster.ServerDashboard, error) {
	var out *cluster.ServerDashboard
	err := s.withServer(ctx, serverID, func(q connection.Querier) error {
		var err error
		out, err = s.repo.GetServerDashboard(ctx, q)
		return err
	})
	return out, err
}

func (s *Service) GetDatabaseDashboard(ctx context.Context, serverID int64, database string) (*cluster.DatabaseDashboard, error) {
	var out *cluster.DatabaseDashboard
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.GetDatabaseDashboard(ctx, q)
		return err
	})
	return out, err
}

func (s *Service) GetServerParams(ctx context.Context, serverID int64) (connection.Params, error) {
	svr, err := s.servers.FindByID(ctx, serverID)
	if err != nil {
		return connection.Params{}, err
	}
	return s.params(svr, svr.Database), nil
}

func (s *Service) GetDatabaseParams(ctx context.Context, serverID int64, database string) (connection.Params, error) {
	svr, err := s.servers.FindByID(ctx, serverID)
	if err != nil {
		return connection.Params{}, err
	}
	return s.params(svr, database), nil
}

// ---------------------------------------------------------------------------
// Data grid
// ---------------------------------------------------------------------------

func (s *Service) GetTableData(ctx context.Context, serverID int64, database, schema, table string, limit, offset int) (*cluster.TableData, error) {
	var out *cluster.TableData
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.GetTableData(ctx, q, schema, table, limit, offset)
		return err
	})
	return out, err
}

func (s *Service) CountTableRows(ctx context.Context, serverID int64, database, schema, table string) (int64, error) {
	var out int64
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.CountTableRows(ctx, q, schema, table)
		return err
	})
	return out, err
}

func (s *Service) SaveTableData(ctx context.Context, serverID int64, database, schema, table string, in cluster.TableDataSave) (*cluster.DataSaveResult, error) {
	var out *cluster.DataSaveResult
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.SaveTableData(ctx, q, schema, table, in)
		return err
	})
	return out, err
}

// ---------------------------------------------------------------------------
// Maintenance / actions
// ---------------------------------------------------------------------------

func (s *Service) TruncateTable(ctx context.Context, serverID int64, database, schema, table string, restartIdentity, cascade bool) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.TruncateTable(ctx, q, schema, table, restartIdentity, cascade)
	})
}

func (s *Service) ReindexTable(ctx context.Context, serverID int64, database, schema, table string) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.ReindexTable(ctx, q, schema, table)
	})
}

func (s *Service) ReindexIndex(ctx context.Context, serverID int64, database, schema, name string) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.ReindexIndex(ctx, q, schema, name)
	})
}

func (s *Service) AddPartition(ctx context.Context, serverID int64, database, schema, table string, name, bounds string) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.AddPartition(ctx, q, schema, table, name, bounds)
	})
}

func (s *Service) AttachPartition(ctx context.Context, serverID int64, database, schema, table, partition, bounds string) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.AttachPartition(ctx, q, schema, table, partition, bounds)
	})
}

func (s *Service) DetachPartition(ctx context.Context, serverID int64, database, schema, table, partition string) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.DetachPartition(ctx, q, schema, table, partition)
	})
}

func (s *Service) AnalyzeTable(ctx context.Context, serverID int64, database, schema, table string) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.AnalyzeTable(ctx, q, schema, table)
	})
}

func (s *Service) AnalyzeDatabase(ctx context.Context, serverID int64, database string) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.AnalyzeDatabase(ctx, q)
	})
}

func (s *Service) RefreshMatView(ctx context.Context, serverID int64, database, schema, name string, withData bool) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.RefreshMatView(ctx, q, schema, name, withData)
	})
}

func (s *Service) DropObject(ctx context.Context, serverID int64, database, schema, name, kind string, cascade bool) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		switch kind {
		case "view":
			return s.repo.DropView(ctx, q, schema, name, cascade)
		case "matview":
			return s.repo.DropMatView(ctx, q, schema, name, cascade)
		case "sequence":
			return s.repo.DropSequence(ctx, q, schema, name)
		case "function":
			return s.repo.DropFunction(ctx, q, schema, name, "")
		case "procedure":
			return s.repo.DropProcedure(ctx, q, schema, name)
		case "schema":
			return s.repo.DropSchema(ctx, q, schema, cascade)
		case "extension":
			return s.repo.DropExtension(ctx, q, name)
		case "index":
			return s.repo.DropIndex(ctx, q, schema, name)
		case "event_trigger", "language", "publication", "subscription", "fdw", "collation", "domain", "type",
			"fts_configuration", "fts_dictionary", "fts_parser", "fts_template", "foreign_table":
			return s.repo.DropCatalogObject(ctx, q, schema, name, kind, cascade)
		default:
			return fmt.Errorf("unsupported object kind %q", kind)
		}
	})
}

func (s *Service) CreateSchema(ctx context.Context, serverID int64, database, name, owner string) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.CreateSchema(ctx, q, name, owner)
	})
}

func (s *Service) DropTablespace(ctx context.Context, serverID int64, name string) error {
	return s.withServer(ctx, serverID, func(q connection.Querier) error {
		return s.repo.DropCatalogObject(ctx, q, "", name, "tablespace", true)
	})
}

func (s *Service) CreateDatabase(ctx context.Context, serverID int64, name, owner string) error {
	svr, err := s.servers.FindByID(ctx, serverID)
	if err != nil {
		return err
	}
	maintenance := svr.Database
	if maintenance == "" {
		maintenance = "postgres"
	}

	q, err := s.conn.Acquire(ctx, s.params(svr, maintenance))
	if err != nil {
		return fmt.Errorf("connect to maintenance database: %w", err)
	}
	defer q.Close()

	sql := "CREATE DATABASE " + quoteIdentCL(name)
	if owner != "" {
		sql += " OWNER " + quoteIdentCL(owner)
	}
	return s.runSQL(q, sql, "create database")
}

func (s *Service) DropDatabase(ctx context.Context, serverID int64, database string, force bool) error {
	svr, err := s.servers.FindByID(ctx, serverID)
	if err != nil {
		return err
	}
	maintenance := svr.Database
	if maintenance == "" || maintenance == database {
		maintenance = "postgres"
	}
	if maintenance == database {
		return fmt.Errorf("cannot drop the maintenance database %q", database)
	}

	q, err := s.conn.Acquire(ctx, s.params(svr, maintenance))
	if err != nil {
		return fmt.Errorf("connect to maintenance database: %w", err)
	}
	defer q.Close()

	sql := "DROP DATABASE " + quoteIdentCL(database)
	if force {
		sql += " WITH (FORCE)"
	}
	return s.runSQL(q, sql, "drop database")
}

func (s *Service) CreateView(ctx context.Context, serverID int64, database, schema, name, definition string, replace bool) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.CreateView(ctx, q, schema, name, definition, replace)
	})
}

func (s *Service) CreateMatView(ctx context.Context, serverID int64, database, schema, name, definition string, withData bool) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.CreateMatView(ctx, q, schema, name, definition, withData)
	})
}

func (s *Service) CreateSequence(ctx context.Context, serverID int64, database, schema, name string, in cluster.SequenceInput) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.CreateSequence(ctx, q, schema, name, in)
	})
}

func (s *Service) CreateFunction(ctx context.Context, serverID int64, database, schema, name string, in cluster.FunctionInput) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.CreateFunction(ctx, q, schema, name, in)
	})
}

func (s *Service) CreateProcedure(ctx context.Context, serverID int64, database, schema, name string, in cluster.ProcedureInput) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.CreateProcedure(ctx, q, schema, name, in)
	})
}

func (s *Service) CreateIndex(ctx context.Context, serverID int64, database, schema, table string, in cluster.IndexInput) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.CreateIndex(ctx, q, schema, table, in)
	})
}

func (s *Service) ReplaceIndex(ctx context.Context, serverID int64, database, schema, table, index string, in cluster.IndexInput) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.ReplaceIndex(ctx, q, schema, table, index, in)
	})
}

// ---------------------------------------------------------------------------
// Table object CRUD
// ---------------------------------------------------------------------------

func (s *Service) AddColumn(ctx context.Context, serverID int64, database, schema, table string, in cluster.AddColumnInput) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.AddColumn(ctx, q, schema, table, in)
	})
}

func (s *Service) AlterColumn(ctx context.Context, serverID int64, database, schema, table, column string, in cluster.AlterColumnInput) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.AlterColumn(ctx, q, schema, table, column, in)
	})
}

func (s *Service) DropColumn(ctx context.Context, serverID int64, database, schema, table, column string, cascade bool) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.DropColumn(ctx, q, schema, table, column, cascade)
	})
}

func (s *Service) CreateConstraint(ctx context.Context, serverID int64, database, schema, table string, in cluster.ConstraintInput) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.CreateConstraint(ctx, q, schema, table, in)
	})
}

func (s *Service) AlterConstraint(ctx context.Context, serverID int64, database, schema, table, constraint string, in cluster.ConstraintInput) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.AlterConstraint(ctx, q, schema, table, constraint, in)
	})
}

func (s *Service) DropConstraint(ctx context.Context, serverID int64, database, schema, table, constraint string, cascade bool) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.DropConstraint(ctx, q, schema, table, constraint, cascade)
	})
}

func (s *Service) CreateTrigger(ctx context.Context, serverID int64, database, schema, table string, in cluster.TriggerInput) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.CreateTrigger(ctx, q, schema, table, in)
	})
}

func (s *Service) ReplaceTrigger(ctx context.Context, serverID int64, database, schema, table, trigger string, in cluster.TriggerInput) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.ReplaceTrigger(ctx, q, schema, table, trigger, in)
	})
}

func (s *Service) DropTrigger(ctx context.Context, serverID int64, database, schema, table, trigger string) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.DropTrigger(ctx, q, schema, table, trigger)
	})
}

func (s *Service) SetTriggerEnabled(ctx context.Context, serverID int64, database, schema, table, trigger string, enable bool) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.SetTriggerEnabled(ctx, q, schema, table, trigger, enable)
	})
}

func (s *Service) CreatePolicy(ctx context.Context, serverID int64, database, schema, table string, in cluster.PolicyInput) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.CreatePolicy(ctx, q, schema, table, in)
	})
}

func (s *Service) ReplacePolicy(ctx context.Context, serverID int64, database, schema, table, policy string, in cluster.PolicyInput) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.ReplacePolicy(ctx, q, schema, table, policy, in)
	})
}

func (s *Service) DropPolicy(ctx context.Context, serverID int64, database, schema, table, policy string) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.DropPolicy(ctx, q, schema, table, policy)
	})
}

func (s *Service) CreateRule(ctx context.Context, serverID int64, database, schema, table string, in cluster.RuleInput) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.CreateRule(ctx, q, schema, table, in)
	})
}

func (s *Service) ReplaceRule(ctx context.Context, serverID int64, database, schema, table, rule string, in cluster.RuleInput) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.ReplaceRule(ctx, q, schema, table, rule, in)
	})
}

func (s *Service) DropRule(ctx context.Context, serverID int64, database, schema, table, rule string) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.DropRule(ctx, q, schema, table, rule)
	})
}

func (s *Service) ListPolicies(ctx context.Context, serverID int64, database, schema, table string) ([]cluster.Policy, error) {
	var out []cluster.Policy
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.ListPolicies(ctx, q, schema, table)
		return err
	})
	return out, err
}

func (s *Service) ListRules(ctx context.Context, serverID int64, database, schema, table string) ([]cluster.Rule, error) {
	var out []cluster.Rule
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.ListRules(ctx, q, schema, table)
		return err
	})
	return out, err
}

func (s *Service) CreateExtension(ctx context.Context, serverID int64, database, name, schema string) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.CreateExtension(ctx, q, name, schema)
	})
}

// ---------------------------------------------------------------------------
// Dashboard extras / grants / search
// ---------------------------------------------------------------------------

func (s *Service) ListLocks(ctx context.Context, serverID int64, database string) ([]cluster.Lock, error) {
	var out []cluster.Lock
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.ListLocks(ctx, q)
		return err
	})
	return out, err
}

func (s *Service) ListSettings(ctx context.Context, serverID int64, database string) ([]cluster.Setting, error) {
	var out []cluster.Setting
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.ListSettings(ctx, q)
		return err
	})
	return out, err
}

func (s *Service) CancelSession(ctx context.Context, serverID int64, database string, pid int64) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.CancelSession(ctx, q, pid)
	})
}

func (s *Service) TerminateSession(ctx context.Context, serverID int64, database string, pid int64) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.TerminateSession(ctx, q, pid)
	})
}

func (s *Service) ApplyGrants(ctx context.Context, serverID int64, database string, in cluster.GrantInput) error {
	return s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		return s.repo.ApplyGrants(ctx, q, in)
	})
}

func (s *Service) SearchObjects(ctx context.Context, serverID int64, database, search string, limit int) ([]cluster.SearchObject, error) {
	var out []cluster.SearchObject
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.SearchObjects(ctx, q, search, limit)
		return err
	})
	return out, err
}

// ---------------------------------------------------------------------------
// Dependencies / Dependents
// ---------------------------------------------------------------------------

func (s *Service) GetDependencies(ctx context.Context, serverID int64, database, schema, name, kind string) ([]cluster.Dependency, error) {
	var out []cluster.Dependency
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.GetDependencies(ctx, q, schema, name, kind)
		return err
	})
	return out, err
}

func (s *Service) GetDependents(ctx context.Context, serverID int64, database, schema, name, kind string) ([]cluster.Dependent, error) {
	var out []cluster.Dependent
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.GetDependents(ctx, q, schema, name, kind)
		return err
	})
	return out, err
}

func (s *Service) ImportCSV(ctx context.Context, serverID int64, database, schema, table string, columns []string, rows [][]string) (*cluster.CSVImportResult, error) {
	var out *cluster.CSVImportResult
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.ImportCSV(ctx, q, schema, table, columns, rows)
		return err
	})
	return out, err
}

func (s *Service) withServer(ctx context.Context, serverID int64, fn func(connection.Querier) error) error {
	svr, err := s.servers.FindByID(ctx, serverID)
	if err != nil {
		return err
	}

	q, err := s.conn.Acquire(ctx, s.params(svr, svr.Database))
	if err != nil {
		return fmt.Errorf("connect to server: %w", err)
	}
	defer q.Close()

	return fn(q)
}

func (s *Service) withDatabase(ctx context.Context, serverID int64, database string, fn func(connection.Querier) error) error {
	svr, err := s.servers.FindByID(ctx, serverID)
	if err != nil {
		return err
	}

	q, err := s.conn.Acquire(ctx, s.params(svr, database))
	if err != nil {
		return fmt.Errorf("connect to database %q: %w", database, err)
	}
	defer q.Close()

	return fn(q)
}

func (s *Service) params(svr *server.Server, database string) connection.Params {
	return connection.Params{
		Host:     svr.Host,
		Port:     svr.Port,
		Username: svr.Username,
		Password: svr.Password,
		Database: database,
		SSLMode:  svr.SSLMode,
	}
}

func (s *Service) runSQL(q connection.Querier, sql string, label string) error {
	rows, err := q.Query(context.Background(), sql)
	if err != nil {
		return fmt.Errorf("%s: %w", label, err)
	}
	rows.Close()
	return nil
}

func quoteIdentCL(name string) string {
	return `"` + strings.ReplaceAll(name, `"`, `""`) + `"`
}