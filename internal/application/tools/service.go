package tools

import (
	"context"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"

	"postgres-management-studio/internal/config"
	"postgres-management-studio/internal/domain/server"
)

type Service struct {
	servers server.Repository
	binDir  string
}

func NewService(servers server.Repository, cfg *config.Config) *Service {
	return &Service{servers: servers, binDir: cfg.PGBinDir}
}

type Binary struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	Found   bool   `json:"found"`
	Message string `json:"message"`
}

// Binaries reports the location and availability of the PostgreSQL client
// binaries used by Backup/Restore (pg_dump, pg_restore, psql).
func (s *Service) Binaries() []Binary {
	out := make([]Binary, 0, 3)
	for _, name := range []string{"pg_dump", "pg_restore", "psql"} {
		path, err := s.lookup(name)
		b := Binary{Name: name, Path: path, Found: err == nil}
		if err != nil {
			b.Message = err.Error()
		}
		out = append(out, b)
	}
	return out
}

// BackupOptions controls a pg_dump invocation. Format is one of
// custom (default), plain or tar.
type BackupOptions struct {
	Database   string `json:"database"`
	Format     string `json:"format"`
	Filename   string `json:"filename"`
	Gzip       bool   `json:"gzip"`
	Jobs       int    `json:"jobs"`
	DataOnly   bool   `json:"data_only"`
	SchemaOnly bool   `json:"schema_only"`
	Schema     string `json:"schema"`
	Table      string `json:"table"`
	Verbose    bool   `json:"verbose"`
}

// Backup streams a pg_dump archive of the given database into out.
func (s *Service) Backup(ctx context.Context, serverID int64, opts BackupOptions, out io.Writer) error {
	svr, err := s.servers.FindByID(ctx, serverID)
	if err != nil {
		return err
	}

	if opts.Database == "" {
		return fmt.Errorf("database is required")
	}
	if opts.DataOnly && opts.SchemaOnly {
		return fmt.Errorf("data-only and schema-only are mutually exclusive")
	}

	format := strings.ToLower(opts.Format)
	switch format {
	case "":
		format = "custom"
	case "custom", "plain", "tar":
	default:
		return fmt.Errorf("unsupported backup format %q", opts.Format)
	}

	bin, err := s.lookup("pg_dump")
	if err != nil {
		return err
	}

	args := []string{
		"-h", svr.Host,
		"-p", fmt.Sprintf("%d", svr.Port),
		"-U", svr.Username,
		"--no-password",
		"-d", opts.Database,
		"-F", format,
	}
	if format != "plain" {
		if opts.Gzip {
			args = append(args, "-Z", "9")
		}
		if opts.Jobs > 1 {
			args = append(args, "-j", fmt.Sprintf("%d", opts.Jobs))
		}
	}
	if opts.DataOnly {
		args = append(args, "--data-only")
	}
	if opts.SchemaOnly {
		args = append(args, "--schema-only")
	}
	if opts.Schema != "" {
		args = append(args, "--schema", opts.Schema)
	}
	if opts.Table != "" {
		args = append(args, "--table", opts.Table)
	}
	if opts.Verbose {
		args = append(args, "--verbose")
	}

	cmd := exec.CommandContext(ctx, bin, args...)
	cmd.Env = s.connEnv(svr)

	if format == "plain" && opts.Gzip {
		gw := newGzipWriter(out)
		cmd.Stdout = gw
		if err := runCmd(cmd, "pg_dump"); err != nil {
			return err
		}
		return gw.Close()
	}

	cmd.Stdout = out
	return runCmd(cmd, "pg_dump")
}

// RestoreOptions controls a pg_restore/psql invocation. Format is one of
// auto (default), plain, custom or tar.
type RestoreOptions struct {
	Database   string `json:"database"`
	Format     string `json:"format"`
	Clean      bool   `json:"clean"`
	Create     bool   `json:"create"`
	DataOnly   bool   `json:"data_only"`
	SchemaOnly bool   `json:"schema_only"`
	Jobs       int    `json:"jobs"`
	Verbose    bool   `json:"verbose"`
}

// Restore feeds the uploaded archive (in) into pg_restore (or psql for plain
// SQL dumps) targeting the given database.
func (s *Service) Restore(ctx context.Context, serverID int64, opts RestoreOptions, in io.Reader) error {
	svr, err := s.servers.FindByID(ctx, serverID)
	if err != nil {
		return err
	}

	if opts.Database == "" {
		return fmt.Errorf("database is required")
	}
	if opts.DataOnly && opts.SchemaOnly {
		return fmt.Errorf("data-only and schema-only are mutually exclusive")
	}

	format := strings.ToLower(opts.Format)
	switch format {
	case "", "auto":
		format = ""
	case "plain", "custom", "tar":
	default:
		return fmt.Errorf("unsupported restore format %q", opts.Format)
	}

	// Plain SQL dumps are executed with psql; anything else with pg_restore.
	if format == "plain" {
		bin, err := s.lookup("psql")
		if err != nil {
			return err
		}
		args := []string{
			"-h", svr.Host,
			"-p", fmt.Sprintf("%d", svr.Port),
			"-U", svr.Username,
			"--no-password",
			"-d", opts.Database,
			"-v", "ON_ERROR_STOP=1",
			"-f", "-",
		}
		cmd := exec.CommandContext(ctx, bin, args...)
		cmd.Env = s.connEnv(svr)
		cmd.Stdin = in
		return runCmd(cmd, "psql")
	}

	bin, err := s.lookup("pg_restore")
	if err != nil {
		return err
	}

	args := []string{
		"-h", svr.Host,
		"-p", fmt.Sprintf("%d", svr.Port),
		"-U", svr.Username,
		"--no-password",
		"--dbname", opts.Database,
	}
	if format != "" {
		args = append(args, "-F", format)
	}
	if opts.Clean {
		args = append(args, "--clean")
	}
	if opts.Create {
		args = append(args, "--create")
	}
	if opts.DataOnly {
		args = append(args, "--data-only")
	}
	if opts.SchemaOnly {
		args = append(args, "--schema-only")
	}
	if opts.Jobs > 1 {
		args = append(args, "-j", fmt.Sprintf("%d", opts.Jobs))
	}
	if opts.Verbose {
		args = append(args, "--verbose")
	}

	cmd := exec.CommandContext(ctx, bin, args...)
	cmd.Env = s.connEnv(svr)
	cmd.Stdin = in
	return runCmd(cmd, "pg_restore")
}

func (s *Service) lookup(name string) (string, error) {
	if s.binDir != "" {
		path := filepath.Join(s.binDir, name+".exe")
		if fi, err := os.Stat(path); err == nil && !fi.IsDir() {
			return path, nil
		}
	}
	path, err := exec.LookPath(name)
	if err != nil {
		return "", fmt.Errorf("binary %q not found; configure PG_BIN_DIR in .env or add it to PATH", name)
	}
	return path, nil
}

func (s *Service) connEnv(svr *server.Server) []string {
	return append(os.Environ(),
		"PGPASSWORD="+svr.Password,
		"PGSSLMODE="+svr.SSLMode,
	)
}