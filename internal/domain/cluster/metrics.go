package cluster

import "time"

type MetricSnapshot struct {
	Timestamp       time.Time `json:"timestamp"`
	TotalConn       int64     `json:"total_conn"`
	ActiveQueries   int64     `json:"active_queries"`
	IdleConnections int64     `json:"idle"`
	Commits         int64     `json:"commits"`
	Rollbacks       int64     `json:"rollbacks"`
	TuplesRead      int64     `json:"tuples_read"`
	TuplesFetched   int64     `json:"tuples_fetched"`
	TuplesInserted  int64     `json:"tuples_inserted"`
	TuplesUpdated   int64     `json:"tuples_updated"`
	TuplesDeleted   int64     `json:"tuples_deleted"`
	BlockHits       int64     `json:"block_hits"`
	BlockReads      int64     `json:"block_reads"`
	Deadlocks       int64     `json:"deadlocks"`
	DbSize          int64     `json:"db_size"`
	TempFiles       int64     `json:"temp_files"`
	TempBytes       int64     `json:"temp_bytes"`
}

type MetricsHistory struct {
	Snapshots []MetricSnapshot `json:"snapshots"`
	MaxPoints int              `json:"max_points"`
	Interval  int              `json:"interval_seconds"`
}
