package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"postgres-management-studio/internal/domain/query"
	appquery "postgres-management-studio/internal/application/query"
)

type QueryHandler struct {
	service *appquery.Service
}

func NewQueryHandler(service *appquery.Service) *QueryHandler {
	return &QueryHandler{service: service}
}

type queryRequest struct {
	ServerID int64  `json:"server_id"`
	Database string `json:"database"`
	Query    string `json:"query"`
	Explain  bool   `json:"explain,omitempty"`
	Analyze  bool   `json:"analyze,omitempty"`
}

type queryBatch struct {
	Results    []*query.Result `json:"results"`
	DurationMs int64           `json:"duration_ms"`
	Error      string          `json:"error,omitempty"`
}

func (h *QueryHandler) Register(r *gin.RouterGroup) {
	r.POST("/query", h.execute)
	r.POST("/servers/:id/query", h.execute)
}

func (h *QueryHandler) execute(c *gin.Context) {
	var in queryRequest
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if in.ServerID <= 0 {
		Error(c, http.StatusBadRequest, "server_id is required")
		return
	}
	if in.Database == "" {
		Error(c, http.StatusBadRequest, "database is required")
		return
	}
	if in.Query == "" {
		Error(c, http.StatusBadRequest, "query is required")
		return
	}

	if in.Explain {
		results, err := h.service.ExplainBatch(c.Request.Context(), in.ServerID, in.Database, in.Query, in.Analyze)
		var total int64
		for _, r := range results {
			total += r.DurationMs
		}
		batch := queryBatch{Results: results, DurationMs: total}
		if err != nil {
			batch.Error = err.Error()
		}
		OK(c, batch)
		return
	}

	results, err := h.service.ExecuteBatch(c.Request.Context(), in.ServerID, in.Database, in.Query)
	var total int64
	for _, r := range results {
		total += r.DurationMs
	}
	batch := queryBatch{Results: results, DurationMs: total}
	if err != nil {
		batch.Error = err.Error()
	}
	OK(c, batch)
}
