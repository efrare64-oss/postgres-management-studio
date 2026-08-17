package server

import "context"

type Repository interface {
	Create(ctx context.Context, s *Server) error
	FindByID(ctx context.Context, id int64) (*Server, error)
	List(ctx context.Context) ([]Server, error)
	Update(ctx context.Context, s *Server) error
	Delete(ctx context.Context, id int64) error
}
