package handler

import "postgres-management-studio/internal/domain/cluster"

type tablePatch struct {
	NewName string  `json:"new_name"`
	Comment *string `json:"comment"`
}

type roleInput struct {
	Name        string `json:"name"`
	Password    string `json:"password"`
	Superuser   bool   `json:"superuser"`
	CreateDB    bool   `json:"create_db"`
	CanLogin    bool   `json:"can_login"`
	Replication bool   `json:"replication"`
	ConnLimit   int    `json:"conn_limit"`
}

func (in roleInput) toDomain() cluster.RoleInput {
	return cluster.RoleInput{
		Password:    in.Password,
		Superuser:   in.Superuser,
		CreateDB:    in.CreateDB,
		CanLogin:    in.CanLogin,
		Replication: in.Replication,
		ConnLimit:   in.ConnLimit,
	}
}
