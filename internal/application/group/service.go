package group

import (
	"context"
	"time"

	"postgres-management-studio/internal/domain/group"
)

type Service struct {
	repo group.Repository
}

func NewService(repo group.Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) Create(ctx context.Context, name string) (*group.Group, error) {
	ent := &group.Group{Name: name, CreatedAt: time.Now().UTC()}
	if err := s.repo.Create(ctx, ent); err != nil {
		return nil, err
	}
	return ent, nil
}

func (s *Service) List(ctx context.Context) ([]group.Group, error) {
	return s.repo.List(ctx)
}

func (s *Service) Rename(ctx context.Context, id int64, name string) (*group.Group, error) {
	ent, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}
	ent.Name = name
	if err := s.repo.Update(ctx, ent); err != nil {
		return nil, err
	}
	return ent, nil
}

func (s *Service) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}
