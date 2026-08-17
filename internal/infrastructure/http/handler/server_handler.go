package handler

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"

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
	r.GET("/servers/export", h.export)
	r.POST("/servers/import", h.importServers)
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

func (h *ServerHandler) export(c *gin.Context) {
	out, err := h.service.Export(c.Request.Context())
	if err != nil {
		respondError(c, err)
		return
	}

	c.Header("Content-Disposition", "attachment; filename=servers.json")
	OK(c, out)
}

func (h *ServerHandler) importServers(c *gin.Context) {
	var inputs []appserver.ServerImportInput
	decode := func(r io.Reader) error {
		var raw json.RawMessage
		if err := json.NewDecoder(r).Decode(&raw); err != nil {
			return err
		}
		if len(raw) == 0 {
			return nil
		}
		if raw[0] == '[' {
			return json.Unmarshal(raw, &inputs)
		}
		var envelope struct {
			Data json.RawMessage `json:"data"`
		}
		if err := json.Unmarshal(raw, &envelope); err != nil {
			return err
		}
		if len(envelope.Data) == 0 {
			return json.Unmarshal(raw, &inputs)
		}
		return json.Unmarshal(envelope.Data, &inputs)
	}

	if strings.HasPrefix(c.ContentType(), "multipart/form-data") {
		file, _, err := c.Request.FormFile("file")
		if err != nil {
			Error(c, http.StatusBadRequest, "missing file: "+err.Error())
			return
		}
		defer file.Close()
		if err := decode(file); err != nil {
			Error(c, http.StatusBadRequest, "invalid JSON: "+err.Error())
			return
		}
	} else {
		if err := decode(c.Request.Body); err != nil {
			Error(c, http.StatusBadRequest, "invalid JSON: "+err.Error())
			return
		}
	}

	out, err := h.service.Import(c.Request.Context(), inputs)
	if err != nil {
		respondError(c, err)
		return
	}

	OK(c, out)
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
