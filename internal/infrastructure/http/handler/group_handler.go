package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	appgroup "postgres-management-studio/internal/application/group"
)

type GroupHandler struct {
	service *appgroup.Service
}

func NewGroupHandler(service *appgroup.Service) *GroupHandler {
	return &GroupHandler{service: service}
}

type groupInput struct {
	Name string `json:"name"`
}

func (h *GroupHandler) Register(r *gin.RouterGroup) {
	r.GET("/server-groups", h.list)
	r.POST("/server-groups", h.create)
	r.PATCH("/server-groups/:id", h.rename)
	r.DELETE("/server-groups/:id", h.delete)
}

func (h *GroupHandler) list(c *gin.Context) {
	groups, err := h.service.List(c.Request.Context())
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, groups)
}

func (h *GroupHandler) create(c *gin.Context) {
	var in groupInput
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if in.Name == "" {
		Error(c, http.StatusBadRequest, "name is required")
		return
	}

	g, err := h.service.Create(c.Request.Context(), in.Name)
	if err != nil {
		respondError(c, err)
		return
	}
	Created(c, g)
}

func (h *GroupHandler) rename(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in groupInput
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}

	g, err := h.service.Rename(c.Request.Context(), id, in.Name)
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, g)
}

func (h *GroupHandler) delete(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	if err := h.service.Delete(c.Request.Context(), id); err != nil {
		respondError(c, err)
		return
	}
	NoContent(c)
}
