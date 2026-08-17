package cluster

import (
	"context"
	"fmt"

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

func (s *Service) ListTriggers(ctx context.Context, serverID int64, database, schema, table string) ([]cluster.Trigger, error) {
	var out []cluster.Trigger
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.ListTriggers(ctx, q, schema, table)
		return err
	})
	return out, err
}

func (s *Service) GetObjectSQL(ctx context.Context, serverID int64, database, schema, name, kind string) (string, error) {
	var out string
	err := s.withDatabase(ctx, serverID, database, func(q connection.Querier) error {
		var err error
		out, err = s.repo.GetObjectSQL(ctx, q, schema, name, kind)
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
