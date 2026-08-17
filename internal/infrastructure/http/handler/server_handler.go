package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	appserver "postgres-management-studio/internal/application/server"
)

type ServerHandler struct {
	service *appserver.Service
}

func NewServerHandler(service *appserver.Service) *ServerHandler {
	return &ServerHandler{service: service}
}

func (h *ServerHandler) Register(r *gin.RouterGroup) {
	r.POST("/servers", h.create)
	r.GET("/servers", h.list)
	r.POST("/servers/test", h.testConnection)
	r.GET("/servers/:id", h.get)
	r.PUT("/servers/:id", h.update)
	r.DELETE("/servers/:id", h.delete)
}

func (h *ServerHandler) create(c *gin.Context) {
	var in appserver.Input
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}

	s, err := h.service.Create(c.Request.Context(), in)
	if err != nil {
		respondError(c, err)
		return
	}
	Created(c, s)
}

func (h *ServerHandler) list(c *gin.Context) {
	servers, err := h.service.List(c.Request.Context())
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, servers)
}

func (h *ServerHandler) get(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	s, err := h.service.Get(c.Request.Context(), id)
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, s)
}

func (h *ServerHandler) update(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in appserver.Input
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}

	s, err := h.service.Update(c.Request.Context(), id, in)
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, s)
}

func (h *ServerHandler) delete(c *gin.Context) {
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

func (h *ServerHandler) testConnection(c *gin.Context) {
	var in appserver.Input
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.service.TestConnection(c.Request.Context(), in); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "connection successful"})
}
