package persistence

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"postgres-management-studio/internal/domain/server"
)

type ServerRepository struct {
	db *sql.DB
}

func NewServerRepository(db *sql.DB) *ServerRepository {
	return &ServerRepository{db: db}
}

var _ server.Repository = (*ServerRepository)(nil)

const serverColumns = "id, name, host, port, username, password, database, ssl_mode, server_group_id, created_at, updated_at"

func (r *ServerRepository) Create(ctx context.Context, s *server.Server) error {
	now := time.Now().UTC()
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO servers (name, host, port, username, password, database, ssl_mode, server_group_id, created_at, updated_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		s.Name, s.Host, s.Port, s.Username, s.Password, s.Database, s.SSLMode, s.ServerGroupID,
		now.Unix(), now.Unix(),
	)
	if err != nil {
		return fmt.Errorf("create server: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return fmt.Errorf("create server: %w", err)
	}

	s.ID = id
	s.CreatedAt = now
	s.UpdatedAt = now
	return nil
}

func (r *ServerRepository) FindByID(ctx context.Context, id int64) (*server.Server, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT `+serverColumns+` FROM servers WHERE id = ?`, id)

	s, err := scanServer(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, server.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("find server %d: %w", id, err)
	}
	return s, nil
}

func (r *ServerRepository) List(ctx context.Context) ([]server.Server, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT `+serverColumns+` FROM servers ORDER BY name`)
	if err != nil {
		return nil, fmt.Errorf("list servers: %w", err)
	}
	defer rows.Close()

	var out []server.Server
	for rows.Next() {
		var s server.Server
		if err := scanServerRows(rows, &s); err != nil {
			return nil, fmt.Errorf("scan server: %w", err)
		}
		out = append(out, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate servers: %w", err)
	}
	if out == nil {
		out = []server.Server{}
	}
	return out, nil
}

func (r *ServerRepository) Update(ctx context.Context, s *server.Server) error {
	res, err := r.db.ExecContext(ctx,
		`UPDATE servers
		 SET name = ?, host = ?, port = ?, username = ?, password = ?,
		     database = ?, ssl_mode = ?, server_group_id = ?, updated_at = ?
		 WHERE id = ?`,
		s.Name, s.Host, s.Port, s.Username, s.Password,
		s.Database, s.SSLMode, s.ServerGroupID, time.Now().Unix(), s.ID,
	)
	if err != nil {
		return fmt.Errorf("update server %d: %w", s.ID, err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return server.ErrNotFound
	}
	return nil
}

func (r *ServerRepository) Delete(ctx context.Context, id int64) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM servers WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("delete server %d: %w", id, err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return server.ErrNotFound
	}
	return nil
}

func scanServer(row interface{ Scan(...any) error }) (*server.Server, error) {
	var s server.Server
	if err := scanServerRows(row, &s); err != nil {
		return nil, err
	}
	return &s, nil
}

func scanServerRows(row interface{ Scan(...any) error }, s *server.Server) error {
	var (
		groupID    sql.NullInt64
		createdAt  int64
		updatedAt  int64
	)
	err := row.Scan(
		&s.ID, &s.Name, &s.Host, &s.Port, &s.Username, &s.Password,
		&s.Database, &s.SSLMode, &groupID, &createdAt, &updatedAt,
	)
	if err != nil {
		return err
	}

	if groupID.Valid {
		s.ServerGroupID = &groupID.Int64
	} else {
		s.ServerGroupID = nil
	}
	s.CreatedAt = time.Unix(createdAt, 0)
	s.UpdatedAt = time.Unix(updatedAt, 0)
	return nil
}
