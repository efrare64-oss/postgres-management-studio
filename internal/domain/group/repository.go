package group

import "context"

type Repository interface {
	Create(ctx context.Context, g *Group) error
	FindByID(ctx context.Context, id int64) (*Group, error)
	List(ctx context.Context) ([]Group, error)
	Update(ctx context.Context, g *Group) error
	Delete(ctx context.Context, id int64) error
}
