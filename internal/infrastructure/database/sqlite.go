package database

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"path/filepath"
	"time"

	_ "modernc.org/sqlite"
)

// OpenStudio opens (creating if needed) the local SQLite database used to store
// the application's own metadata (saved servers and groups), like pgAdmin uses
// its bundled SQLite. No PostgreSQL is required for the studio itself.
func OpenStudio(ctx context.Context, path string) (*sql.DB, error) {
	if path == "" {
		path = "postgres-management-studio.db"
	}

	if dir := filepath.Dir(path); dir != "" && dir != "." {
		if err := os.MkdirAll(dir, 0o755); err != nil {
			return nil, fmt.Errorf("create studio data directory: %w", err)
		}
	}

	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("open studio database: %w", err)
	}

	// A single connection avoids "database is locked" errors with the
	// embedded store; the workload here is very low.
	db.SetMaxOpenConns(1)

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	if err := db.PingContext(pingCtx); err != nil {
		db.Close()
		return nil, fmt.Errorf("ping studio database: %w", err)
	}

	if err := ensureSchema(ctx, db); err != nil {
		db.Close()
		return nil, err
	}

	return db, nil
}

const schemaSQL = `
CREATE TABLE IF NOT EXISTS server_groups (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL UNIQUE,
    created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS servers (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT    NOT NULL UNIQUE,
    host            TEXT    NOT NULL,
    port            INTEGER NOT NULL DEFAULT 5432,
    username        TEXT    NOT NULL,
    password        TEXT    NOT NULL DEFAULT '',
    database        TEXT    NOT NULL DEFAULT 'postgres',
    ssl_mode        TEXT    NOT NULL DEFAULT 'disable',
    server_group_id INTEGER NULL REFERENCES server_groups (id) ON DELETE SET NULL,
    created_at      INTEGER NOT NULL,
    updated_at      INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_servers_server_group_id ON servers (server_group_id);
`

func ensureSchema(ctx context.Context, db *sql.DB) error {
	if _, err := db.ExecContext(ctx, schemaSQL); err != nil {
		return fmt.Errorf("ensure studio schema: %w", err)
	}
	return nil
}
