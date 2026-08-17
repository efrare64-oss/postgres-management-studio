package database

import (
	"context"
	"fmt"
	"net/url"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"postgres-management-studio/internal/domain/connection"
)

type remoteEntry struct {
	pool   *pgxpool.Pool
	expiry time.Time
}

type pooledConn struct {
	conn *pgxpool.Conn
}

func (c *pooledConn) Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error) {
	return c.conn.Query(ctx, sql, args...)
}

func (c *pooledConn) QueryRow(ctx context.Context, sql string, args ...any) pgx.Row {
	return c.conn.QueryRow(ctx, sql, args...)
}

func (c *pooledConn) Close() {
	c.conn.Release()
}

type RemoteManagement struct {
	ttl   time.Duration
	mu    sync.Mutex
	pools sync.Map
	stop  chan struct{}
}

func NewRemoteManagement() *RemoteManagement {
	m := &RemoteManagement{
		ttl:  5 * time.Minute,
		stop: make(chan struct{}),
	}
	go m.cleanup()
	return m
}

func (m *RemoteManagement) Acquire(ctx context.Context, p connection.Params) (connection.Querier, error) {
	pool, err := m.poolFor(ctx, p)
	if err != nil {
		return nil, err
	}

	acquireCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	conn, err := pool.Acquire(acquireCtx)
	if err != nil {
		return nil, fmt.Errorf("acquire connection: %w", err)
	}
	return &pooledConn{conn: conn}, nil
}

func (m *RemoteManagement) TestConnection(ctx context.Context, p connection.Params) error {
	pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	pool, err := pgxpool.New(pingCtx, m.dsn(p))
	if err != nil {
		return err
	}
	defer pool.Close()

	return pool.Ping(pingCtx)
}

func (m *RemoteManagement) Close() {
	close(m.stop)
	m.pools.Range(func(_, v any) bool {
		v.(*remoteEntry).pool.Close()
		return true
	})
}

func (m *RemoteManagement) poolFor(ctx context.Context, p connection.Params) (*pgxpool.Pool, error) {
	dsn := m.dsn(p)

	m.mu.Lock()
	defer m.mu.Unlock()

	if e, ok := m.pools.Load(dsn); ok {
		entry := e.(*remoteEntry)
		if time.Now().Before(entry.expiry) {
			return entry.pool, nil
		}
		entry.pool.Close()
		m.pools.Delete(dsn)
	}

	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		return nil, fmt.Errorf("create pool: %w", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping server: %w", err)
	}

	m.pools.Store(dsn, &remoteEntry{pool: pool, expiry: time.Now().Add(m.ttl)})
	return pool, nil
}

func (m *RemoteManagement) cleanup() {
	ticker := time.NewTicker(time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-m.stop:
			return
		case now := <-ticker.C:
			m.pools.Range(func(key, v any) bool {
				entry := v.(*remoteEntry)
				if now.After(entry.expiry) {
					entry.pool.Close()
					m.pools.Delete(key)
				}
				return true
			})
		}
	}
}

func (m *RemoteManagement) dsn(p connection.Params) string {
	return fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=%s",
		url.QueryEscape(p.Username), url.QueryEscape(p.Password),
		p.Host, p.Port, url.QueryEscape(p.Database), p.SSLMode)
}
