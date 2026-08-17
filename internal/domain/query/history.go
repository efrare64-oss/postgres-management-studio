package query

import (
	"context"
	"time"
)

type HistoryItem struct {
	ID        int64     `json:"id"`
	Query     string    `json:"query"`
	ServerID  int64     `json:"server_id"`
	Database  string    `json:"database"`
	Success   bool      `json:"success"`
	Error     string    `json:"error"`
	CreatedAt time.Time `json:"created_at"`
}

type HistoryRepository interface {
	Add(ctx context.Context, item HistoryItem) error
	List(ctx context.Context, limit int) ([]HistoryItem, error)
	Clear(ctx context.Context) error
}