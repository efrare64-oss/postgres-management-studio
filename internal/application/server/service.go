package server

import (
	"context"
	"time"

	"postgres-management-studio/internal/domain/connection"
	"postgres-management-studio/internal/domain/group"
	"postgres-management-studio/internal/domain/server"
)

type ServerImportInput struct {
	Name            string  `json:"name"`
	Host            string  `json:"host"`
	Port            int     `json:"port"`
	Username        string  `json:"username"`
	Password        string  `json:"password"`
	Database        string  `json:"database"`
	SSLMode         string  `json:"ssl_mode"`
	ServerGroupID   *int64  `json:"server_group_id,omitempty"`
	ServerGroupName *string `json:"server_group_name,omitempty"`
}

type ServerExport struct {
	server.Server
	ServerGroupName *string `json:"server_group_name,omitempty"`
}

type Service struct {
	repo      server.Repository
	groupRepo group.Repository
	conn      connection.Provider
}

func NewService(repo server.Repository, groupRepo group.Repository, conn connection.Provider) *Service {
	return &Service{repo: repo, groupRepo: groupRepo, conn: conn}
}

func (s *Service) Create(ctx context.Context, in Input) (*server.Server, error) {
	ent := in.ToEntity()
	ent.CreatedAt = time.Now().UTC()
	ent.UpdatedAt = ent.CreatedAt

	if err := s.repo.Create(ctx, ent); err != nil {
		return nil, err
	}
	return ent, nil
}

func (s *Service) List(ctx context.Context) ([]server.Server, error) {
	return s.repo.List(ctx)
}

func (s *Service) Get(ctx context.Context, id int64) (*server.Server, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *Service) Update(ctx context.Context, id int64, in Input) (*server.Server, error) {
	ent, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if in.Name != "" {
		ent.Name = in.Name
	}
	if in.Host != "" {
		ent.Host = in.Host
	}
	if in.Port > 0 {
		ent.Port = in.Port
	}
	if in.Username != "" {
		ent.Username = in.Username
	}
	if in.Password != "" {
		ent.Password = in.Password
	}
	if in.Database != "" {
		ent.Database = in.Database
	}
	if in.SSLMode != "" {
		ent.SSLMode = in.SSLMode
	}
	ent.ServerGroupID = in.ServerGroupID
	ent.UpdatedAt = time.Now().UTC()

	if err := s.repo.Update(ctx, ent); err != nil {
		return nil, err
	}
	return ent, nil
}

func (s *Service) Delete(ctx context.Context, id int64) error {
	return s.repo.Delete(ctx, id)
}

func (s *Service) Export(ctx context.Context) ([]ServerExport, error) {
	servers, err := s.repo.List(ctx)
	if err != nil {
		return nil, err
	}

	groups, err := s.groupRepo.List(ctx)
	if err != nil {
		return nil, err
	}

	groupNames := make(map[int64]string, len(groups))
	for _, g := range groups {
		groupNames[g.ID] = g.Name
	}

	out := make([]ServerExport, len(servers))
	for i, srv := range servers {
		export := ServerExport{Server: srv}
		if srv.ServerGroupID != nil {
			if name, ok := groupNames[*srv.ServerGroupID]; ok {
				export.ServerGroupName = &name
			}
		}
		out[i] = export
	}

	return out, nil
}

func (s *Service) Import(ctx context.Context, inputs []ServerImportInput) ([]*server.Server, error) {
	groups, err := s.groupRepo.List(ctx)
	if err != nil {
		return nil, err
	}

	groupByName := make(map[string]int64, len(groups))
	for _, g := range groups {
		groupByName[g.Name] = g.ID
	}

	var out []*server.Server
	for _, in := range inputs {
		var groupID *int64
		if in.ServerGroupID != nil {
			groupID = in.ServerGroupID
		} else if in.ServerGroupName != nil {
			if id, ok := groupByName[*in.ServerGroupName]; ok {
				groupID = &id
			} else {
				g := &group.Group{Name: *in.ServerGroupName, CreatedAt: time.Now().UTC()}
				if err := s.groupRepo.Create(ctx, g); err != nil {
					return nil, err
				}
				groupID = &g.ID
				groupByName[g.Name] = g.ID
			}
		}

		ent := &server.Server{
			Name:          in.Name,
			Host:          in.Host,
			Port:          defaultPort(in.Port),
			Username:      in.Username,
			Password:      in.Password,
			Database:      defaultDatabase(in.Database),
			SSLMode:       defaultSSLMode(in.SSLMode),
			ServerGroupID: groupID,
			CreatedAt:     time.Now().UTC(),
			UpdatedAt:     time.Now().UTC(),
		}

		if err := s.repo.Create(ctx, ent); err != nil {
			return nil, err
		}
		out = append(out, ent)
	}

	return out, nil
}

func (s *Service) TestConnection(ctx context.Context, in Input) error {
	return s.conn.TestConnection(ctx, in.ToParams())
}