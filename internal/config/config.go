package config

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	HTTPPort    int
	StudioDB    string
	FrontendDir string
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	cfg := &Config{
		HTTPPort:    8080,
		StudioDB:    getEnv("STUDIO_DB", defaultStudioDBPath()),
		FrontendDir: getEnv("FRONTEND_DIR", "./web/dist"),
	}

	if raw := os.Getenv("HTTP_PORT"); raw != "" {
		port, err := strconv.Atoi(raw)
		if err != nil {
			return nil, fmt.Errorf("invalid HTTP_PORT %q: %w", raw, err)
		}
		cfg.HTTPPort = port
	}

	return cfg, nil
}

// defaultStudioDBPath returns the location of the local SQLite database that
// stores the app's own configuration (saved servers/groups), like pgAdmin does.
// On Windows it lives under %APPDATA%\PostgresManagementStudio; otherwise next to
// the working directory.
func defaultStudioDBPath() string {
	dir := os.Getenv("APPDATA")
	if dir == "" {
		dir = "."
	} else {
		dir = filepath.Join(dir, "PostgresManagementStudio")
	}
	return filepath.Join(dir, "postgres-management-studio.db")
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
