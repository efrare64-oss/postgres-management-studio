package cluster

type SessionActivity struct {
	PID      int64  `json:"pid"`
	Database string `json:"database"`
	User     string `json:"user"`
	State    string `json:"state"`
	Query    string `json:"query"`
	Duration string `json:"duration"`
}

type DatabaseDashboard struct {
	Connections   int64             `json:"connections"`
	ActiveQueries int64             `json:"active_queries"`
	Idle          int64             `json:"idle"`
	DatabaseSize  string            `json:"database_size"`
	Sessions      []SessionActivity `json:"sessions"`
}

type ServerDashboard struct {
	TotalConnections int64             `json:"total_connections"`
	MaxConnections   int64             `json:"max_connections"`
	ActiveQueries    int64             `json:"active_queries"`
	Idle             int64             `json:"idle"`
	Version          string            `json:"version"`
	StartedAt        string            `json:"started_at"`
	Databases        []Database        `json:"databases"`
	Sessions         []SessionActivity `json:"sessions"`
}
