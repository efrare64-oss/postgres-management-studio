package connection

import "context"

type Params struct {
	Host     string
	Port     int
	Username string
	Password string
	Database string
	SSLMode  string
}

type Provider interface {
	Acquire(ctx context.Context, p Params) (Querier, error)
	TestConnection(ctx context.Context, p Params) error
}
