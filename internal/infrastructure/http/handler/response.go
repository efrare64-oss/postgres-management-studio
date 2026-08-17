package handler

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"modernc.org/sqlite"

	"postgres-management-studio/internal/domain/server"
)

func OK(c *gin.Context, data any) {
	c.JSON(http.StatusOK, gin.H{"data": data})
}

func Created(c *gin.Context, data any) {
	c.JSON(http.StatusCreated, gin.H{"data": data})
}

func NoContent(c *gin.Context) {
	c.Status(http.StatusNoContent)
}

func Error(c *gin.Context, status int, message string) {
	c.JSON(status, gin.H{"error": message})
}

func InternalError(c *gin.Context, err error) {
	Error(c, http.StatusInternalServerError, err.Error())
}

func respondError(c *gin.Context, err error) {
	var sqliteErr *sqlite.Error

	switch {
	case errors.Is(err, server.ErrNotFound):
		Error(c, http.StatusNotFound, err.Error())
	case errors.As(err, &sqliteErr) && sqliteErr.Code()&0xff == 19: // SQLITE_CONSTRAINT (primario)
		Error(c, http.StatusBadRequest, sqliteErr.Error())
	default:
		InternalError(c, err)
	}
}

func parseID(c *gin.Context, name string) (int64, bool) {
	id, err := strconv.ParseInt(c.Param(name), 10, 64)
	if err != nil {
		Error(c, http.StatusBadRequest, "invalid "+name)
		return 0, false
	}
	return id, true
}
