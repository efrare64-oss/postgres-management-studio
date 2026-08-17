package server

import (
	"context"
	"time"

	"postgres-management-studio/internal/domain/connection"
	"postgres-management-studio/internal/domain/server"
)

type Service struct {
	repo server.Repository
	conn connection.Provider
}

func NewService(repo server.Repository, conn connection.Provider) *Service {
	return &Service{repo: repo, conn: conn}
}

func (s *Service) Create(ctx context.Context, in Input) (*server.Server, error) {
	ent := in.ToEntity()
	ent.CreatedAt = time.Now().UTC()
	ent.UpdatedAt = ent.CreatedAt

	if err := s.repo.Create(ctx, ent); err != nil {
		return nil, err
	}
	return ent, nil
}

func (s *Service) List(ctx context.Context) ([]server.Server, error) {
	return s.repo.List(ctx)
}

func (s *Service) Get(ctx context.Context, id int64) (*server.Server, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *Service) Update(ctx context.Context, id int64, in Input) (*server.Server, error) {
	ent, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if in.Name != "" {
		ent.Name = in.Name
	}
	if in.Host != "" {
		ent.Host = in.Host
	}
	if in.Port > 0 {
		ent.Port = in.Port
	}
	if in.Username != "" {
		ent.Username = in.Username
	}
	if in.Password != "" {
		ent.Password = in.Password
	}
	if in.Database != "" {
		ent.Database = in.Database
	}
	if in.SSLMode != "" {
		ent.SSLMode = in.SSLMode
	}
	ent.ServerGroupID = in.ServerGroupID
	ent.UpdatedAt = time.Now().UTC()

	if err := s.repo.Update(ctx, ent); err != nil {
		return nil, err
	}
	return ent, nil
}

func (s *Service) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}

func (s *Service) TestConnection(ctx context.Context, in Input) error {
	return s.conn.TestConnection(ctx, in.ToParams())
}
