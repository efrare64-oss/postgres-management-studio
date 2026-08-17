package remote

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"

	"postgres-management-studio/internal/domain/cluster"
	"postgres-management-studio/internal/domain/connection"
)

func (r *ClusterRepository) GetTableStats(ctx context.Context, q connection.Querier, schema, table string) (*cluster.TableStats, error) {
	var s cluster.TableStats
	err := q.QueryRow(ctx, `
		SELECT c.relname,
		       pg_size_pretty(pg_total_relation_size(c.oid)),
		       pg_size_pretty(pg_indexes_size(c.oid)),
		       COALESCE(stat.n_live_tup, 0),
		       COALESCE(stat.n_dead_tup, 0),
		       COALESCE(stat.seq_scan, 0),
		       COALESCE(stat.seq_tup_read, 0),
		       COALESCE(stat.idx_scan, 0),
		       COALESCE(stat.idx_tup_fetch, 0),
		       COALESCE(stat.n_tup_ins, 0),
		       COALESCE(stat.n_tup_upd, 0),
		       COALESCE(stat.n_tup_del, 0),
		       stat.last_autoanalyze::text,
		       stat.last_analyze::text,
		       stat.last_vacuum::text
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		LEFT JOIN pg_stat_user_tables stat ON stat.relid = c.oid
		WHERE n.nspname = $1 AND c.relname = $2 AND c.relkind IN ('r', 'p')`,
		schema, table,
	).Scan(
		&s.TableName, &s.Size, &s.IndexSize, &s.Rows, &s.DeadRows,
		&s.SeqScans, &s.SeqTupRead, &s.IdxScans, &s.IdxTupFetch,
		&s.Inserts, &s.Updates, &s.Deletes,
		&s.LastAutoAnalyze, &s.LastAnalyze, &s.LastVacuum,
	)
	if err != nil {
		return nil, fmt.Errorf("load table statistics: %w", err)
	}
	return &s, nil
}

func (r *ClusterRepository) GetServerDashboard(ctx context.Context, q connection.Querier) (*cluster.ServerDashboard, error) {
	var d cluster.ServerDashboard

	err := q.QueryRow(ctx, `
		SELECT current_setting('server_version'),
		       current_setting('max_connections')::int,
		       pg_postmaster_start_time()::text`).
		Scan(&d.Version, &d.MaxConnections, &d.StartedAt)
	if err != nil {
		return nil, fmt.Errorf("load server info: %w", err)
	}

	d.Sessions, err = r.sessions(ctx, q, "")
	if err != nil {
		return nil, err
	}

	d.TotalConnections = int64(len(d.Sessions))
	for _, s := range d.Sessions {
		if s.State == "active" {
			d.ActiveQueries++
		} else if s.State == "idle" {
			d.Idle++
		}
	}

	d.Databases, err = r.ListDatabases(ctx, q)
	if err != nil {
		return nil, err
	}

	return &d, nil
}

func (r *ClusterRepository) GetDatabaseDashboard(ctx context.Context, q connection.Querier) (*cluster.DatabaseDashboard, error) {
	var d cluster.DatabaseDashboard

	err := q.QueryRow(ctx, `
		SELECT pg_size_pretty(pg_database_size(current_database()))`).
		Scan(&d.DatabaseSize)
	if err != nil {
		return nil, fmt.Errorf("load database size: %w", err)
	}

	d.Sessions, err = r.sessions(ctx, q, "")
	if err != nil {
		return nil, err
	}

	d.Connections = int64(len(d.Sessions))
	for _, s := range d.Sessions {
		if s.State == "active" {
			d.ActiveQueries++
		} else if s.State == "idle" {
			d.Idle++
		}
	}

	return &d, nil
}

func (r *ClusterRepository) sessions(ctx context.Context, q connection.Querier, database string) ([]cluster.SessionActivity, error) {
	base := `
		SELECT pid,
		       COALESCE(datname, ''),
		       COALESCE(usename, ''),
		       COALESCE(state, ''),
		       COALESCE(left(query, 150), ''),
		       COALESCE((now() - query_start)::text, '')
		FROM pg_stat_activity
		WHERE pid <> pg_backend_pid()`

	var (
		rows pgx.Rows
		err  error
	)
	if database != "" {
		rows, err = q.Query(ctx, base+` AND datname = $1 ORDER BY query_start`, database)
	} else {
		rows, err = q.Query(ctx, base+` ORDER BY query_start`)
	}
	if err != nil {
		return nil, fmt.Errorf("list sessions: %w", err)
	}
	defer rows.Close()

	out := make([]cluster.SessionActivity, 0)
	for rows.Next() {
		var s cluster.SessionActivity
		if err := rows.Scan(&s.PID, &s.Database, &s.User, &s.State, &s.Query, &s.Duration); err != nil {
			return nil, fmt.Errorf("scan session: %w", err)
		}
		out = append(out, s)
	}
	return out, rows.Err()
}
