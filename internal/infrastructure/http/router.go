package httpserver

import (
	"fmt"
	"io"
	"io/fs"
	"mime"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/gin-gonic/gin"

	appcluster "postgres-management-studio/internal/application/cluster"
	appgroup "postgres-management-studio/internal/application/group"
	appquery "postgres-management-studio/internal/application/query"
	appserver "postgres-management-studio/internal/application/server"
	apptools "postgres-management-studio/internal/application/tools"
	"postgres-management-studio/internal/domain/connection"
	"postgres-management-studio/internal/infrastructure/http/handler"
	"postgres-management-studio/internal/infrastructure/http/middleware"
)

type Server struct {
	engine *gin.Engine
}

func New(serverSvc *appserver.Service, clusterSvc *appcluster.Service, querySvc *appquery.Service, groupSvc *appgroup.Service, toolsSvc *apptools.Service, conn connection.Provider, frontend fs.FS) *Server {
	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery(), middleware.CORS())

	serverH := handler.NewServerHandler(serverSvc)
	clusterH := handler.NewClusterHandler(clusterSvc, conn)
	queryH := handler.NewQueryHandler(querySvc)
	groupH := handler.NewGroupHandler(groupSvc)
	toolsH := handler.NewToolsHandler(toolsSvc)

	api := r.Group("/api")
	api.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})
	serverH.Register(api)
	clusterH.Register(api)
	queryH.Register(api)
	groupH.Register(api)
	toolsH.Register(api)

	if frontend != nil {
		r.NoRoute(func(c *gin.Context) {
			if strings.HasPrefix(c.Request.URL.Path, "/api/") {
				c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
				return
			}
			serveFrontend(c, frontend)
		})
	}

	return &Server{engine: r}
}

func serveFrontend(c *gin.Context, fsys fs.FS) {
	path := strings.TrimPrefix(c.Request.URL.Path, "/")
	if path == "" {
		path = "index.html"
	}

	f, err := fsys.Open(path)
	if err == nil {
		info, statErr := f.Stat()
		if statErr == nil && !info.IsDir() {
			c.Status(http.StatusOK)
			c.Writer.Header().Set("Content-Type", mime.TypeByExtension(filepath.Ext(path)))
			_, _ = io.Copy(c.Writer, f)
			f.Close()
			return
		}
		f.Close()
	}

	data, err := fs.ReadFile(fsys, "index.html")
	if err != nil {
		c.Status(http.StatusNotFound)
		return
	}
	c.Data(http.StatusOK, mime.TypeByExtension(".html"), data)
}

func (s *Server) Run(port int) error {
	addr := fmt.Sprintf(":%d", port)
	return s.engine.Run(addr)
}

func (s *Server) Handler() http.Handler {
	return s.engine
}
