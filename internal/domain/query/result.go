package query

type Result struct {
	Columns       []string `json:"columns"`
	Rows          [][]any  `json:"rows"`
	RowsAffected  int64    `json:"rows_affected"`
	DurationMs    int64    `json:"duration_ms"`
	StatementType string   `json:"statement_type"`
}
