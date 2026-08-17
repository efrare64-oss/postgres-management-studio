package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	appcluster "postgres-management-studio/internal/application/cluster"
	"postgres-management-studio/internal/domain/cluster"
)

type ClusterHandler struct {
	service *appcluster.Service
}

func NewClusterHandler(service *appcluster.Service) *ClusterHandler {
	return &ClusterHandler{service: service}
}

func (h *ClusterHandler) Register(r *gin.RouterGroup) {
	r.GET("/servers/:id/dashboard", h.serverDashboard)
	r.GET("/servers/:id/databases/:database/dashboard", h.databaseDashboard)
	r.GET("/servers/:id/databases", h.listDatabases)
	r.GET("/servers/:id/databases/:database/schemas", h.listSchemas)
	r.GET("/servers/:id/databases/:database/schemas/:schema/tables", h.listTables)
	r.GET("/servers/:id/databases/:database/schemas/:schema/views", h.listViews)
	r.GET("/servers/:id/databases/:database/schemas/:schema/matviews", h.listMatViews)
	r.GET("/servers/:id/databases/:database/schemas/:schema/sequences", h.listSequences)
	r.GET("/servers/:id/databases/:database/schemas/:schema/functions", h.listFunctions)
	r.GET("/servers/:id/databases/:database/schemas/:schema/sql/:kind/:name", h.objectSQL)
	r.GET("/servers/:id/databases/:database/schemas/:schema/tables/:table", h.tableDetail)
	r.GET("/servers/:id/databases/:database/schemas/:schema/tables/:table/triggers", h.listTriggers)
	r.GET("/servers/:id/databases/:database/schemas/:schema/tables/:table/statistics", h.tableStatistics)
	r.GET("/servers/:id/databases/:database/completion-schema", h.completionSchema)
	r.POST("/servers/:id/databases/:database/schemas/:schema/tables", h.createTable)
	r.PATCH("/servers/:id/databases/:database/schemas/:schema/tables/:table", h.patchTable)
	r.DELETE("/servers/:id/databases/:database/schemas/:schema/tables/:table", h.dropTable)
	r.GET("/servers/:id/roles", h.listRoles)
	r.POST("/servers/:id/roles", h.createRole)
	r.PATCH("/servers/:id/roles/:name", h.alterRole)
	r.DELETE("/servers/:id/roles/:name", h.dropRole)
}

func (h *ClusterHandler) listDatabases(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	databases, err := h.service.ListDatabases(c.Request.Context(), id)
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, databases)
}

func (h *ClusterHandler) listSchemas(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	schemas, err := h.service.ListSchemas(c.Request.Context(), id, c.Param("database"))
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, schemas)
}

func (h *ClusterHandler) listTables(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	tables, err := h.service.ListTables(c.Request.Context(), id, c.Param("database"), c.Param("schema"))
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, tables)
}

func (h *ClusterHandler) tableDetail(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	detail, err := h.service.GetTableDetail(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"))
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, detail)
}

func (h *ClusterHandler) createTable(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in cluster.CreateTableInput
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.service.CreateTable(c.Request.Context(), id, c.Param("database"), c.Param("schema"), in); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "table created"})
}

func (h *ClusterHandler) patchTable(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in tablePatch
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}

	database := c.Param("database")
	schema := c.Param("schema")
	table := c.Param("table")

	if in.NewName != "" {
		if err := h.service.RenameTable(c.Request.Context(), id, database, schema, table, in.NewName); err != nil {
			respondError(c, err)
			return
		}
		table = in.NewName
	}
	if in.Comment != nil {
		if err := h.service.CommentTable(c.Request.Context(), id, database, schema, table, *in.Comment); err != nil {
			respondError(c, err)
			return
		}
	}
	OK(c, gin.H{"message": "table updated"})
}

func (h *ClusterHandler) dropTable(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	if err := h.service.DropTable(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table")); err != nil {
		respondError(c, err)
		return
	}
	NoContent(c)
}

func (h *ClusterHandler) listRoles(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	roles, err := h.service.ListRoles(c.Request.Context(), id)
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, roles)
}

func (h *ClusterHandler) createRole(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in roleInput
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if in.Name == "" {
		Error(c, http.StatusBadRequest, "name is required")
		return
	}

	if err := h.service.CreateRole(c.Request.Context(), id, in.Name, in.toDomain()); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "role created"})
}

func (h *ClusterHandler) alterRole(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in roleInput
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.service.AlterRole(c.Request.Context(), id, c.Param("name"), in.toDomain()); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "role updated"})
}

func (h *ClusterHandler) dropRole(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	if err := h.service.DropRole(c.Request.Context(), id, c.Param("name")); err != nil {
		respondError(c, err)
		return
	}
	NoContent(c)
}

func (h *ClusterHandler) completionSchema(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	schema, err := h.service.GetCompletionSchema(c.Request.Context(), id, c.Param("database"))
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, schema)
}
