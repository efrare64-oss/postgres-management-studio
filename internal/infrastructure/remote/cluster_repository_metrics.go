package remote

import (
	"context"
	"fmt"
	"sync"
	"time"

	"postgres-management-studio/internal/domain/cluster"
	"postgres-management-studio/internal/domain/connection"
)

const (
	maxSnapshots    = 120
	collectInterval = 5 * time.Second
)

type metricsCollector struct {
	mu      sync.RWMutex
	servers map[int64]*serverMetrics
}

type serverMetrics struct {
	db        string
	snapshots []cluster.MetricSnapshot
	cancel    context.CancelFunc
}

var metricsStore = &metricsCollector{
	servers: make(map[int64]*serverMetrics),
}

func (m *metricsCollector) Start(serverID int64, db string, conn connection.Provider, params connection.Params) {
	m.mu.Lock()
	defer m.mu.Unlock()

	if existing, ok := m.servers[serverID]; ok {
		existing.cancel()
	}

	ctx, cancel := context.WithCancel(context.Background())
	sm := &serverMetrics{db: db, cancel: cancel}
	m.servers[serverID] = sm

	go m.collectLoop(ctx, serverID, sm, conn, params)
}

func (m *metricsCollector) Stop(serverID int64) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if sm, ok := m.servers[serverID]; ok {
		sm.cancel()
		delete(m.servers, serverID)
	}
}

func (m *metricsCollector) GetHistory(serverID int64) []cluster.MetricSnapshot {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if sm, ok := m.servers[serverID]; ok {
		out := make([]cluster.MetricSnapshot, len(sm.snapshots))
		copy(out, sm.snapshots)
		return out
	}
	return nil
}

func (m *metricsCollector) collectLoop(ctx context.Context, serverID int64, sm *serverMetrics, conn connection.Provider, params connection.Params) {
	ticker := time.NewTicker(collectInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			q, err := conn.Acquire(ctx, params)
			if err != nil {
				continue
			}
			snap, err := collectSnapshot(ctx, q, sm.db)
			q.Close()
			if err != nil {
				continue
			}
			m.mu.Lock()
			sm.snapshots = append(sm.snapshots, snap)
			if len(sm.snapshots) > maxSnapshots {
				sm.snapshots = sm.snapshots[len(sm.snapshots)-maxSnapshots:]
			}
			m.mu.Unlock()
		}
	}
}

func collectSnapshot(ctx context.Context, q connection.Querier, dbName string) (cluster.MetricSnapshot, error) {
	var snap cluster.MetricSnapshot
	snap.Timestamp = time.Now()

	// Database size
	if dbName != "" {
		var size int64
		err := q.QueryRow(ctx, fmt.Sprintf("SELECT pg_database_size('%s')", dbName)).Scan(&size)
		if err == nil {
			snap.DbSize = size
		}
	}

	// pg_stat_database
	dbQuery := "SELECT numbackends, xact_commit, xact_rollback, tup_fetched, tup_inserted, tup_updated, tup_deleted, blks_hit, blks_read, deadlocks, temp_files, temp_bytes FROM pg_stat_database WHERE datname = current_database()"
	if dbName != "" {
		dbQuery = fmt.Sprintf("SELECT numbackends, xact_commit, xact_rollback, tup_fetched, tup_inserted, tup_updated, tup_deleted, blks_hit, blks_read, deadlocks, temp_files, temp_bytes FROM pg_stat_database WHERE datname = '%s'", dbName)
	}

	err := q.QueryRow(ctx, dbQuery).Scan(
		&snap.TotalConn, &snap.Commits, &snap.Rollbacks,
		&snap.TuplesFetched, &snap.TuplesInserted, &snap.TuplesUpdated, &snap.TuplesDeleted,
		&snap.BlockHits, &snap.BlockReads, &snap.Deadlocks, &snap.TempFiles, &snap.TempBytes,
	)
	if err != nil {
		return snap, fmt.Errorf("pg_stat_database: %w", err)
	}

	// Active/idle from pg_stat_activity
	var active, idle int64
	actQuery := "SELECT count(*) FILTER (WHERE state = 'active'), count(*) FILTER (WHERE state = 'idle') FROM pg_stat_activity"
	if dbName != "" {
		actQuery = fmt.Sprintf("SELECT count(*) FILTER (WHERE state = 'active'), count(*) FILTER (WHERE state = 'idle') FROM pg_stat_activity WHERE datname = '%s'", dbName)
	}
	_ = q.QueryRow(ctx, actQuery).Scan(&active, &idle)
	snap.ActiveQueries = active
	snap.IdleConnections = idle

	return snap, nil
}

func StartMetricsCollection(serverID int64, db string, conn connection.Provider, params connection.Params) {
	metricsStore.Start(serverID, db, conn, params)
}

func StopMetricsCollection(serverID int64) {
	metricsStore.Stop(serverID)
}

func GetMetricsHistory(serverID int64) cluster.MetricsHistory {
	snaps := metricsStore.GetHistory(serverID)
	return cluster.MetricsHistory{
		Snapshots: snaps,
		MaxPoints: maxSnapshots,
		Interval:  5,
	}
}
