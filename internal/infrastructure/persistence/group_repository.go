package persistence

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"postgres-management-studio/internal/domain/group"
)

type GroupRepository struct {
	db *sql.DB
}

func NewGroupRepository(db *sql.DB) *GroupRepository {
	return &GroupRepository{db: db}
}

var _ group.Repository = (*GroupRepository)(nil)

const groupColumns = "id, name, created_at"

func (r *GroupRepository) Create(ctx context.Context, g *group.Group) error {
	res, err := r.db.ExecContext(ctx,
		`INSERT INTO server_groups (name, created_at) VALUES (?, ?)`,
		g.Name, time.Now().UTC().Unix(),
	)
	if err != nil {
		return fmt.Errorf("create group: %w", err)
	}

	id, err := res.LastInsertId()
	if err != nil {
		return fmt.Errorf("create group: %w", err)
	}
	g.ID = id
	return nil
}

func (r *GroupRepository) FindByID(ctx context.Context, id int64) (*group.Group, error) {
	row := r.db.QueryRowContext(ctx,
		`SELECT `+groupColumns+` FROM server_groups WHERE id = ?`, id)

	g, err := scanGroup(row)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, group.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("find group %d: %w", id, err)
	}
	return g, nil
}

func (r *GroupRepository) List(ctx context.Context) ([]group.Group, error) {
	rows, err := r.db.QueryContext(ctx,
		`SELECT `+groupColumns+` FROM server_groups ORDER BY name`)
	if err != nil {
		return nil, fmt.Errorf("list groups: %w", err)
	}
	defer rows.Close()

	var out []group.Group
	for rows.Next() {
		var g group.Group
		if err := scanGroupRows(rows, &g); err != nil {
			return nil, fmt.Errorf("scan group: %w", err)
		}
		out = append(out, g)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate groups: %w", err)
	}
	if out == nil {
		out = []group.Group{}
	}
	return out, nil
}

func (r *GroupRepository) Update(ctx context.Context, g *group.Group) error {
	res, err := r.db.ExecContext(ctx,
		`UPDATE server_groups SET name = ? WHERE id = ?`, g.Name, g.ID)
	if err != nil {
		return fmt.Errorf("update group %d: %w", g.ID, err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return group.ErrNotFound
	}
	return nil
}

func (r *GroupRepository) Delete(ctx context.Context, id int64) error {
	res, err := r.db.ExecContext(ctx, `DELETE FROM server_groups WHERE id = ?`, id)
	if err != nil {
		return fmt.Errorf("delete group %d: %w", id, err)
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return group.ErrNotFound
	}
	return nil
}

func scanGroup(row interface{ Scan(...any) error }) (*group.Group, error) {
	var g group.Group
	if err := scanGroupRows(row, &g); err != nil {
		return nil, err
	}
	return &g, nil
}

func scanGroupRows(row interface{ Scan(...any) error }, g *group.Group) error {
	var createdAt int64
	if err := row.Scan(&g.ID, &g.Name, &createdAt); err != nil {
		return err
	}
	g.CreatedAt = time.Unix(createdAt, 0)
	return nil
}
