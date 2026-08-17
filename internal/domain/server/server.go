package server

import "time"

type Server struct {
	ID            int64     `json:"id"`
	Name          string    `json:"name"`
	Host          string    `json:"host"`
	Port          int       `json:"port"`
	Username      string    `json:"username"`
	Password      string    `json:"password,omitempty"`
	Database      string    `json:"database"`
	SSLMode       string    `json:"ssl_mode"`
	ServerGroupID *int64    `json:"server_group_id"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}
