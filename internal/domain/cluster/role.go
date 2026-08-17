package cluster

type Role struct {
	Name        string `json:"name"`
	Superuser   bool   `json:"superuser"`
	CreateDB    bool   `json:"create_db"`
	CanLogin    bool   `json:"can_login"`
	Replication bool   `json:"replication"`
	MemberOf    string `json:"member_of"`
	ConnLimit   int    `json:"conn_limit"`
}
