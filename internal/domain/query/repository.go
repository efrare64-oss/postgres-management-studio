package query

import (
	"context"

	"postgres-management-studio/internal/domain/connection"
)

type Repository interface {
	Execute(ctx context.Context, q connection.Querier, sql string) (*Result, error)
	ExecuteBatch(ctx context.Context, q connection.Querier, sql string) ([]*Result, error)
	Explain(ctx context.Context, q connection.Querier, sql string, analyze bool) (*Result, error)
	ExplainBatch(ctx context.Context, q connection.Querier, sql string, analyze bool) ([]*Result, error)
}
