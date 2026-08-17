package server

import (
	"postgres-management-studio/internal/domain/connection"
	"postgres-management-studio/internal/domain/server"
)

type Input struct {
	Name          string `json:"name"`
	Host          string `json:"host"`
	Port          int    `json:"port"`
	Username      string `json:"username"`
	Password      string `json:"password"`
	Database      string `json:"database"`
	SSLMode       string `json:"ssl_mode"`
	ServerGroupID *int64 `json:"server_group_id"`
}

func (in Input) ToEntity() *server.Server {
	return &server.Server{
		Name:          in.Name,
		Host:          in.Host,
		Port:          defaultPort(in.Port),
		Username:      in.Username,
		Password:      in.Password,
		Database:      defaultDatabase(in.Database),
		SSLMode:       defaultSSLMode(in.SSLMode),
		ServerGroupID: in.ServerGroupID,
	}
}

func (in Input) ToParams() connection.Params {
	return connection.Params{
		Host:     in.Host,
		Port:     defaultPort(in.Port),
		Username: in.Username,
		Password: in.Password,
		Database: defaultDatabase(in.Database),
		SSLMode:  defaultSSLMode(in.SSLMode),
	}
}

func defaultPort(p int) int {
	if p <= 0 {
		return 5432
	}
	return p
}

func defaultDatabase(db string) string {
	if db == "" {
		return "postgres"
	}
	return db
}

func defaultSSLMode(mode string) string {
	if mode == "" {
		return "disable"
	}
	return mode
}
