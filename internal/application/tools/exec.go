package tools

import (
	"bytes"
	"compress/gzip"
	"fmt"
	"io"
	"os/exec"
	"strings"
)

// gzipWriter wraps an io.Writer so the bytes written are compressed. The
// underlying writer stays open; only the gzip stream is closed on Close.
type gzipWriter struct {
	*gzip.Writer
}

func newGzipWriter(w io.Writer) *gzipWriter {
	gw, _ := gzip.NewWriterLevel(w, gzip.BestCompression)
	return &gzipWriter{Writer: gw}
}

// runCmd executes cmd capturing stderr; on failure the stderr text is
// included in the returned error.
func runCmd(cmd *exec.Cmd, label string) error {
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		msg := strings.TrimSpace(stderr.String())
		if msg == "" {
			return fmt.Errorf("%s failed: %w", label, err)
		}
		return fmt.Errorf("%s failed: %s", label, msg)
	}
	return nil
}