package cluster

type ColumnInput struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Nullable bool   `json:"nullable"`
	Default  string `json:"default"`
	Primary  bool   `json:"primary"`
}

type CreateTableInput struct {
	Name    string        `json:"name"`
	Columns []ColumnInput `json:"columns"`
}

type RoleInput struct {
	Password    string `json:"password"`
	Superuser   bool   `json:"superuser"`
	CreateDB    bool   `json:"create_db"`
	CanLogin    bool   `json:"can_login"`
	Replication bool   `json:"replication"`
	ConnLimit   int    `json:"conn_limit"`
}
