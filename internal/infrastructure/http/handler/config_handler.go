package handler

import (
	"net/http"

	"postgres-management-studio/internal/config"
	"postgres-management-studio/internal/infrastructure/persistence"

	"github.com/gin-gonic/gin"
)

type ConfigHandler struct {
	cfg      *config.Config
	settings *persistence.SettingsRepository
}

func NewConfigHandler(cfg *config.Config, settings *persistence.SettingsRepository) *ConfigHandler {
	return &ConfigHandler{cfg: cfg, settings: settings}
}

func (h *ConfigHandler) Register(r *gin.RouterGroup) {
	r.GET("/config", h.getConfig)
	r.PUT("/config/language", h.setLanguage)
	r.GET("/config/setup-status", h.getSetupStatus)
}

func (h *ConfigHandler) getConfig(c *gin.Context) {
	lang := h.cfg.Language
	if h.settings != nil {
		if stored, err := h.settings.Get(c.Request.Context(), "language"); err == nil && stored != "" {
			lang = stored
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"language": lang,
	})
}

func (h *ConfigHandler) setLanguage(c *gin.Context) {
	var body struct {
		Language string `json:"language" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "language is required"})
		return
	}

	validLanguages := map[string]bool{
		"en": true, "de": true, "ja": true, "es": true, "ko": true,
		"ru": true, "it": true, "fr": true, "zh-Hans": true, "zh-Hant": true, "pt-BR": true,
	}
	if !validLanguages[body.Language] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid language"})
		return
	}

	if err := h.settings.Set(c.Request.Context(), "language", body.Language); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save language"})
		return
	}

	h.cfg.Language = body.Language

	c.JSON(http.StatusOK, gin.H{"language": body.Language})
}

func (h *ConfigHandler) getSetupStatus(c *gin.Context) {
	lang, _ := h.settings.Get(c.Request.Context(), "language")
	completed := lang != ""
	c.JSON(http.StatusOK, gin.H{"completed": completed})
}
