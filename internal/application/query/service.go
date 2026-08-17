package query

import (
	"context"
	"fmt"

	"postgres-management-studio/internal/domain/connection"
	"postgres-management-studio/internal/domain/query"
	"postgres-management-studio/internal/domain/server"
)

type Service struct {
	servers server.Repository
	repo    query.Repository
	conn    connection.Provider
}

func NewService(servers server.Repository, repo query.Repository, conn connection.Provider) *Service {
	return &Service{servers: servers, repo: repo, conn: conn}
}

func (s *Service) Execute(ctx context.Context, serverID int64, database, sql string) (*query.Result, error) {
	return s.run(ctx, serverID, database, sql, func(q connection.Querier, sql string) (*query.Result, error) {
		return s.repo.Execute(ctx, q, sql)
	})
}

func (s *Service) ExecuteBatch(ctx context.Context, serverID int64, database, sql string) ([]*query.Result, error) {
	svr, err := s.servers.FindByID(ctx, serverID)
	if err != nil {
		return nil, err
	}

	q, err := s.conn.Acquire(ctx, connection.Params{
		Host:     svr.Host,
		Port:     svr.Port,
		Username: svr.Username,
		Password: svr.Password,
		Database: database,
		SSLMode:  svr.SSLMode,
	})
	if err != nil {
		return nil, fmt.Errorf("connect to database %q: %w", database, err)
	}
	defer q.Close()

	return s.repo.ExecuteBatch(ctx, q, sql)
}

func (s *Service) Explain(ctx context.Context, serverID int64, database, sql string, analyze bool) (*query.Result, error) {
	return s.run(ctx, serverID, database, sql, func(q connection.Querier, sql string) (*query.Result, error) {
		return s.repo.Explain(ctx, q, sql, analyze)
	})
}

func (s *Service) ExplainBatch(ctx context.Context, serverID int64, database, sql string, analyze bool) ([]*query.Result, error) {
	svr, err := s.servers.FindByID(ctx, serverID)
	if err != nil {
		return nil, err
	}

	q, err := s.conn.Acquire(ctx, connection.Params{
		Host:     svr.Host,
		Port:     svr.Port,
		Username: svr.Username,
		Password: svr.Password,
		Database: database,
		SSLMode:  svr.SSLMode,
	})
	if err != nil {
		return nil, fmt.Errorf("connect to database %q: %w", database, err)
	}
	defer q.Close()

	return s.repo.ExplainBatch(ctx, q, sql, analyze)
}

func (s *Service) run(ctx context.Context, serverID int64, database, sql string, fn func(connection.Querier, string) (*query.Result, error)) (*query.Result, error) {
	svr, err := s.servers.FindByID(ctx, serverID)
	if err != nil {
		return nil, err
	}

	q, err := s.conn.Acquire(ctx, connection.Params{
		Host:     svr.Host,
		Port:     svr.Port,
		Username: svr.Username,
		Password: svr.Password,
		Database: database,
		SSLMode:  svr.SSLMode,
	})
	if err != nil {
		return nil, fmt.Errorf("connect to database %q: %w", database, err)
	}
	defer q.Close()

	return fn(q, sql)
}
