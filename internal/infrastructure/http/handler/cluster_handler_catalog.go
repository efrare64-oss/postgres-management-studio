package handler

import (
	"github.com/gin-gonic/gin"

	"postgres-management-studio/internal/domain/cluster"
)

func (h *ClusterHandler) listTablespaces(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	out, err := h.service.ListTablespaces(c.Request.Context(), id)
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, out)
}

func (h *ClusterHandler) listDatabaseObjects(c *gin.Context) {
	h.catalogObjects(c, cluster.CatalogScope{})
}

func (h *ClusterHandler) listSchemaObjects(c *gin.Context) {
	h.catalogObjects(c, cluster.CatalogScope{Schema: c.Param("schema")})
}

func (h *ClusterHandler) listTableObjects(c *gin.Context) {
	h.catalogObjects(c, cluster.CatalogScope{Schema: c.Param("schema"), Table: c.Param("table")})
}

func (h *ClusterHandler) listViewObjects(c *gin.Context) {
	h.catalogObjects(c, cluster.CatalogScope{Schema: c.Param("schema"), Table: c.Param("view")})
}

func (h *ClusterHandler) listForeignTableObjects(c *gin.Context) {
	h.catalogObjects(c, cluster.CatalogScope{Schema: c.Param("schema"), Table: c.Param("ftable")})
}

func (h *ClusterHandler) catalogObjects(c *gin.Context, scope cluster.CatalogScope) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	out, err := h.service.ListCatalogObjects(c.Request.Context(), id, c.Param("database"), scope, c.Param("kind"))
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, out)
}