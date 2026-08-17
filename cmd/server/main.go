package main

import (
	"context"
	"io/fs"
	"log"
	"os"

	"postgres-management-studio/internal/app"
	"postgres-management-studio/internal/config"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	var frontend fs.FS
	if cfg.FrontendDir != "" {
		frontend = os.DirFS(cfg.FrontendDir)
	}

	application, err := app.Wire(context.Background(), cfg, frontend)
	if err != nil {
		log.Fatalf("bootstrap: %v", err)
	}
	defer application.Close()

	if err := application.Server.Run(cfg.HTTPPort); err != nil {
		log.Fatalf("http server: %v", err)
	}
}
