package config

import (
	"fmt"
	"os"
	"path/filepath"
	"runtime"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	HTTPPort       int
	StudioDB       string
	FrontendDir    string
	PGBinDir       string
	PoolMaxConns   int
	PoolMinConns   int
	PoolMaxLifeMin int
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	defaultMaxConns := runtime.NumCPU() * 4
	if defaultMaxConns < 8 {
		defaultMaxConns = 8
	}

	cfg := &Config{
		HTTPPort:       8080,
		StudioDB:       getEnv("STUDIO_DB", defaultStudioDBPath()),
		FrontendDir:    getEnv("FRONTEND_DIR", "./web/dist"),
		PGBinDir:       getEnv("PG_BIN_DIR", ""),
		PoolMaxConns:   getEnvInt("POOL_MAX_CONNS", defaultMaxConns),
		PoolMinConns:   getEnvInt("POOL_MIN_CONNS", 2),
		PoolMaxLifeMin: getEnvInt("POOL_MAX_LIFE_MIN", 30),
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

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return fallback
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
