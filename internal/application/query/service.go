package query

import (
	"context"
	"fmt"
	"time"

	"postgres-management-studio/internal/domain/connection"
	"postgres-management-studio/internal/domain/query"
	"postgres-management-studio/internal/domain/server"
)

type Service struct {
	servers server.Repository
	repo    query.Repository
	conn    connection.Provider
	history query.HistoryRepository
}

func NewService(servers server.Repository, repo query.Repository, conn connection.Provider, history query.HistoryRepository) *Service {
	return &Service{servers: servers, repo: repo, conn: conn, history: history}
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
		s.recordHistory(serverID, database, sql, false, err.Error())
		return nil, fmt.Errorf("connect to database %q: %w", database, err)
	}
	defer q.Close()

	results, err := s.repo.ExecuteBatch(ctx, q, sql)
	if err != nil {
		s.recordHistory(serverID, database, sql, false, err.Error())
		return nil, err
	}

	s.recordHistory(serverID, database, sql, true, "")
	return results, nil
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
		s.recordHistory(serverID, database, sql, false, err.Error())
		return nil, fmt.Errorf("connect to database %q: %w", database, err)
	}
	defer q.Close()

	results, err := s.repo.ExplainBatch(ctx, q, sql, analyze)
	if err != nil {
		s.recordHistory(serverID, database, sql, false, err.Error())
		return nil, err
	}

	s.recordHistory(serverID, database, sql, true, "")
	return results, nil
}

func (s *Service) History(ctx context.Context, limit int) ([]query.HistoryItem, error) {
	if s.history == nil {
		return []query.HistoryItem{}, nil
	}
	return s.history.List(ctx, limit)
}

func (s *Service) ClearHistory(ctx context.Context) error {
	if s.history == nil {
		return nil
	}
	return s.history.Clear(ctx)
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
		s.recordHistory(serverID, database, sql, false, err.Error())
		return nil, fmt.Errorf("connect to database %q: %w", database, err)
	}
	defer q.Close()

	result, err := fn(q, sql)
	if err != nil {
		s.recordHistory(serverID, database, sql, false, err.Error())
		return nil, err
	}

	s.recordHistory(serverID, database, sql, true, "")
	return result, nil
}

func (s *Service) recordHistory(serverID int64, database, sql string, success bool, errMsg string) {
	if s.history == nil {
		return
	}
	_ = s.history.Add(context.Background(), query.HistoryItem{
		Query:     sql,
		ServerID:  serverID,
		Database:  database,
		Success:   success,
		Error:     errMsg,
		CreatedAt: time.Now().UTC(),
	})
}