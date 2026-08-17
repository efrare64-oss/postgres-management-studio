package persistence

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	"postgres-management-studio/internal/domain/query"
)

type QueryHistoryRepository struct {
	db *sql.DB
}

func NewQueryHistoryRepository(db *sql.DB) *QueryHistoryRepository {
	return &QueryHistoryRepository{db: db}
}

func (r *QueryHistoryRepository) Add(ctx context.Context, item query.HistoryItem) error {
	success := 0
	if item.Success {
		success = 1
	}
	_, err := r.db.ExecContext(ctx, `
		INSERT INTO query_history (query, server_id, database, success, error, created_at)
		VALUES (?, ?, ?, ?, ?, ?)`,
		item.Query, item.ServerID, item.Database, success, item.Error, item.CreatedAt.Unix(),
	)
	if err != nil {
		return fmt.Errorf("add query history: %w", err)
	}
	return nil
}

func (r *QueryHistoryRepository) List(ctx context.Context, limit int) ([]query.HistoryItem, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := r.db.QueryContext(ctx, `
		SELECT id, query, server_id, database, success, error, created_at
		FROM query_history
		ORDER BY created_at DESC, id DESC
		LIMIT ?`, limit)
	if err != nil {
		return nil, fmt.Errorf("list query history: %w", err)
	}
	defer rows.Close()

	out := make([]query.HistoryItem, 0)
	for rows.Next() {
		var h query.HistoryItem
		var success int
		var unix int64
		if err := rows.Scan(&h.ID, &h.Query, &h.ServerID, &h.Database, &success, &h.Error, &unix); err != nil {
			return nil, fmt.Errorf("scan query history: %w", err)
		}
		h.Success = success == 1
		h.CreatedAt = time.Unix(unix, 0)
		out = append(out, h)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return out, nil
}

func (r *QueryHistoryRepository) Clear(ctx context.Context) error {
	if _, err := r.db.ExecContext(ctx, `DELETE FROM query_history`); err != nil {
		return fmt.Errorf("clear query history: %w", err)
	}
	return nil
}