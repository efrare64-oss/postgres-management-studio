package app

import (
	"context"
	"fmt"
	"io/fs"

	appcluster "postgres-management-studio/internal/application/cluster"
	appgroup "postgres-management-studio/internal/application/group"
	appquery "postgres-management-studio/internal/application/query"
	appserver "postgres-management-studio/internal/application/server"
	apptools "postgres-management-studio/internal/application/tools"
	"postgres-management-studio/internal/config"
	infradb "postgres-management-studio/internal/infrastructure/database"
	httpserver "postgres-management-studio/internal/infrastructure/http"
	"postgres-management-studio/internal/infrastructure/persistence"
	"postgres-management-studio/internal/infrastructure/remote"
)

type App struct {
	Server *httpserver.Server
	clean  func()
}

func (a *App) Close() {
	if a.clean != nil {
		a.clean()
	}
}

func Wire(ctx context.Context, cfg *config.Config, frontend fs.FS) (*App, error) {
	studioDB, err := infradb.OpenStudio(ctx, cfg.StudioDB)
	if err != nil {
		return nil, fmt.Errorf("open studio database: %w", err)
	}

	connManagement := infradb.NewRemoteManagement(cfg.PoolMaxConns, cfg.PoolMinConns, cfg.PoolMaxLifeMin)

	serverRepo := persistence.NewServerRepository(studioDB)
	groupRepo := persistence.NewGroupRepository(studioDB)
	settingsRepo := persistence.NewSettingsRepository(studioDB)
	clusterRepo := remote.NewClusterRepository()
	queryRepo := remote.NewQueryRepository()
	queryHistoryRepo := persistence.NewQueryHistoryRepository(studioDB)

	serverSvc := appserver.NewService(serverRepo, groupRepo, connManagement)
	groupSvc := appgroup.NewService(groupRepo)
	clusterSvc := appcluster.NewService(serverRepo, clusterRepo, connManagement)
	querySvc := appquery.NewService(serverRepo, queryRepo, connManagement, queryHistoryRepo)
	toolsSvc := apptools.NewService(serverRepo, cfg)

	srv := httpserver.New(cfg, serverSvc, clusterSvc, querySvc, groupSvc, toolsSvc, connManagement, frontend, settingsRepo)

	return &App{
		Server: srv,
		clean: func() {
			connManagement.Close()
			studioDB.Close()
		},
	}, nil
}
