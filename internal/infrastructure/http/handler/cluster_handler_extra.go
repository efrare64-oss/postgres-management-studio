package handler

import (
	"github.com/gin-gonic/gin"

	"postgres-management-studio/internal/infrastructure/remote"
)

func (h *ClusterHandler) listViews(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	out, err := h.service.ListViews(c.Request.Context(), id, c.Param("database"), c.Param("schema"))
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, out)
}

func (h *ClusterHandler) listMatViews(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	out, err := h.service.ListMatViews(c.Request.Context(), id, c.Param("database"), c.Param("schema"))
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, out)
}

func (h *ClusterHandler) listSequences(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	out, err := h.service.ListSequences(c.Request.Context(), id, c.Param("database"), c.Param("schema"))
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, out)
}

func (h *ClusterHandler) listFunctions(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	out, err := h.service.ListFunctions(c.Request.Context(), id, c.Param("database"), c.Param("schema"))
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, out)
}

func (h *ClusterHandler) listProcedures(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	out, err := h.service.ListProcedures(c.Request.Context(), id, c.Param("database"), c.Param("schema"))
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, out)
}

func (h *ClusterHandler) listTriggers(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	out, err := h.service.ListTriggers(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"))
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, out)
}

func (h *ClusterHandler) objectSQL(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	out, err := h.service.GetObjectSQL(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("name"), c.Param("kind"))
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"sql": out})
}

func (h *ClusterHandler) tableStatistics(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	out, err := h.service.GetTableStats(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"))
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, out)
}

func (h *ClusterHandler) columnStats(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	out, err := h.service.GetColumnStats(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"))
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, out)
}

func (h *ClusterHandler) serverDashboard(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	out, err := h.service.GetServerDashboard(c.Request.Context(), id)
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, out)
}

func (h *ClusterHandler) databaseDashboard(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	out, err := h.service.GetDatabaseDashboard(c.Request.Context(), id, c.Param("database"))
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, out)
}

func (h *ClusterHandler) startMetrics(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	db := c.Param("database")
	params, err := h.service.GetDatabaseParams(c.Request.Context(), id, db)
	if err != nil {
		respondError(c, err)
		return
	}
	remote.StartMetricsCollection(id, db, h.conn, params)
	OK(c, gin.H{"status": "started"})
}

func (h *ClusterHandler) stopMetrics(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	remote.StopMetricsCollection(id)
	OK(c, gin.H{"status": "stopped"})
}

func (h *ClusterHandler) getMetricsHistory(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	history := remote.GetMetricsHistory(id)
	OK(c, history)
}
