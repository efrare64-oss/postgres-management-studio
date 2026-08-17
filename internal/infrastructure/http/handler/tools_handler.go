package handler

import (
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	apptools "postgres-management-studio/internal/application/tools"
)

type ToolsHandler struct {
	service *apptools.Service
}

func NewToolsHandler(service *apptools.Service) *ToolsHandler {
	return &ToolsHandler{service: service}
}

func (h *ToolsHandler) Register(r *gin.RouterGroup) {
	r.GET("/tools/binaries", h.binaries)
	r.GET("/servers/:id/backup", h.backup)
	r.POST("/servers/:id/restore", h.restore)
}

func (h *ToolsHandler) binaries(c *gin.Context) {
	OK(c, h.service.Binaries())
}

func (h *ToolsHandler) backup(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	opts := apptools.BackupOptions{
		Database:   c.Query("database"),
		Format:     c.DefaultQuery("format", "custom"),
		Filename:   c.Query("filename"),
		Gzip:       c.DefaultQuery("gzip", "false") == "true",
		DataOnly:   c.DefaultQuery("data_only", "false") == "true",
		SchemaOnly: c.DefaultQuery("schema_only", "false") == "true",
		Schema:     c.Query("schema"),
		Table:      c.Query("table"),
		Verbose:    c.DefaultQuery("verbose", "false") == "true",
	}
	if v := c.Query("jobs"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			opts.Jobs = n
		}
	}

	filename := opts.Filename
	if filename == "" {
		filename = backupFilename(opts.Database, opts.Format, opts.Gzip)
	}

	c.Header("Content-Type", "application/octet-stream")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))

	if err := h.service.Backup(c.Request.Context(), id, opts, c.Writer); err != nil {
		c.Header("Content-Type", "application/json")
		InternalError(c, err)
		return
	}
}

func (h *ToolsHandler) restore(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	if err := c.Request.ParseMultipartForm(4 << 20); err != nil {
		Error(c, http.StatusBadRequest, "invalid multipart form: "+err.Error())
		return
	}

	file, _, err := c.Request.FormFile("file")
	if err != nil {
		Error(c, http.StatusBadRequest, "file is required")
		return
	}
	defer file.Close()

	opts := apptools.RestoreOptions{
		Database:   c.Request.FormValue("database"),
		Format:     c.Request.FormValue("format"),
		Clean:      c.Request.FormValue("clean") == "true",
		Create:     c.Request.FormValue("create") == "true",
		DataOnly:   c.Request.FormValue("data_only") == "true",
		SchemaOnly: c.Request.FormValue("schema_only") == "true",
		Verbose:    c.Request.FormValue("verbose") == "true",
	}
	if v := c.Request.FormValue("jobs"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			opts.Jobs = n
		}
	}

	if err := h.service.Restore(c.Request.Context(), id, opts, file); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "restore completed"})
}

func backupFilename(database, format string, gzip bool) string {
	switch format {
	case "plain":
		if gzip {
			return database + ".sql.gz"
		}
		return database + ".sql"
	case "tar":
		return database + ".tar"
	default:
		return database + ".backup"
	}
}