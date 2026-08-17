package cluster

type TableStats struct {
	TableName       string  `json:"table_name"`
	Size            string  `json:"size"`
	IndexSize       string  `json:"index_size"`
	Rows            int64   `json:"rows"`
	DeadRows        int64   `json:"dead_rows"`
	SeqScans        int64   `json:"seq_scans"`
	SeqTupRead      int64   `json:"seq_tup_read"`
	IdxScans        int64   `json:"idx_scans"`
	IdxTupFetch     int64   `json:"idx_tup_fetch"`
	Inserts         int64   `json:"inserts"`
	Updates         int64   `json:"updates"`
	Deletes         int64   `json:"deletes"`
	LastAutoAnalyze *string `json:"last_auto_analyze"`
	LastAnalyze     *string `json:"last_analyze"`
	LastVacuum      *string `json:"last_vacuum"`
}
