package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"postgres-management-studio/internal/domain/cluster"
)

// registerCRUD registers routes to manage table-level objects
// (columns, constraints, indexes, triggers, policies and rules).
func (h *ClusterHandler) registerCRUD(r *gin.RouterGroup) {
	r.POST("/servers/:id/databases/:database/schemas/:schema/tables/:table/columns", h.addColumn)
	r.PATCH("/servers/:id/databases/:database/schemas/:schema/tables/:table/columns/:column", h.alterColumn)
	r.DELETE("/servers/:id/databases/:database/schemas/:schema/tables/:table/columns/:column", h.dropColumn)

	r.POST("/servers/:id/databases/:database/schemas/:schema/tables/:table/constraints", h.createConstraint)
	r.PATCH("/servers/:id/databases/:database/schemas/:schema/tables/:table/constraints/:constraint", h.alterConstraint)
	r.DELETE("/servers/:id/databases/:database/schemas/:schema/tables/:table/constraints/:constraint", h.dropConstraint)

	r.POST("/servers/:id/databases/:database/schemas/:schema/tables/:table/indexes/:index", h.replaceIndex)
	r.POST("/servers/:id/databases/:database/schemas/:schema/indexes/:index/reindex", h.reindexIndex)

	r.POST("/servers/:id/databases/:database/schemas/:schema/tables/:table/partitions", h.addPartition)
	r.POST("/servers/:id/databases/:database/schemas/:schema/tables/:table/partitions/attach", h.attachPartition)
	r.POST("/servers/:id/databases/:database/schemas/:schema/tables/:table/partitions/:partition/detach", h.detachPartition)

	r.POST("/servers/:id/databases/:database/schemas/:schema/tables/:table/triggers", h.createTrigger)
	r.PATCH("/servers/:id/databases/:database/schemas/:schema/tables/:table/triggers/:trigger", h.replaceTrigger)
	r.DELETE("/servers/:id/databases/:database/schemas/:schema/tables/:table/triggers/:trigger", h.dropTrigger)
	r.POST("/servers/:id/databases/:database/schemas/:schema/tables/:table/triggers/:trigger/enable", h.enableTrigger)
	r.POST("/servers/:id/databases/:database/schemas/:schema/tables/:table/triggers/:trigger/disable", h.disableTrigger)

	r.POST("/servers/:id/databases/:database/schemas/:schema/tables/:table/policies", h.createPolicy)
	r.PATCH("/servers/:id/databases/:database/schemas/:schema/tables/:table/policies/:policy", h.replacePolicy)
	r.DELETE("/servers/:id/databases/:database/schemas/:schema/tables/:table/policies/:policy", h.dropPolicy)

	r.POST("/servers/:id/databases/:database/schemas/:schema/tables/:table/rules", h.createRule)
	r.PATCH("/servers/:id/databases/:database/schemas/:schema/tables/:table/rules/:rule", h.replaceRule)
	r.DELETE("/servers/:id/databases/:database/schemas/:schema/tables/:table/rules/:rule", h.dropRule)
	r.GET("/servers/:id/databases/:database/schemas/:schema/tables/:table/policies", h.listPolicies)
	r.GET("/servers/:id/databases/:database/schemas/:schema/tables/:table/rules", h.listRules)
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

func (h *ClusterHandler) addColumn(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in cluster.AddColumnInput
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.service.AddColumn(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"), in); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "column created"})
}

func (h *ClusterHandler) alterColumn(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in cluster.AlterColumnInput
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.service.AlterColumn(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"), c.Param("column"), in); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "column updated"})
}

func (h *ClusterHandler) dropColumn(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	cascade := c.DefaultQuery("cascade", "false") == "true"
	if err := h.service.DropColumn(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"), c.Param("column"), cascade); err != nil {
		respondError(c, err)
		return
	}
	NoContent(c)
}

// ---------------------------------------------------------------------------
// Constraints
// ---------------------------------------------------------------------------

func (h *ClusterHandler) createConstraint(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in cluster.ConstraintInput
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.service.CreateConstraint(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"), in); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "constraint created"})
}

func (h *ClusterHandler) alterConstraint(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in cluster.ConstraintInput
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.service.AlterConstraint(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"), c.Param("constraint"), in); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "constraint updated"})
}

func (h *ClusterHandler) dropConstraint(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	cascade := c.DefaultQuery("cascade", "false") == "true"
	if err := h.service.DropConstraint(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"), c.Param("constraint"), cascade); err != nil {
		respondError(c, err)
		return
	}
	NoContent(c)
}

// ---------------------------------------------------------------------------
// Indexes
// ---------------------------------------------------------------------------

func (h *ClusterHandler) replaceIndex(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in cluster.IndexInput
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.service.ReplaceIndex(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"), c.Param("index"), in); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "index updated"})
}

func (h *ClusterHandler) reindexIndex(c *gin.Context) {
	h.runObjectAction(c, func() error {
		return h.service.ReindexIndex(c.Request.Context(), mustID(c), c.Param("database"), c.Param("schema"), c.Param("index"))
	})
}

// ---------------------------------------------------------------------------
// Partitions
// ---------------------------------------------------------------------------

func (h *ClusterHandler) addPartition(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in struct {
		Name   string `json:"name"`
		Bounds string `json:"bounds"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.service.AddPartition(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"), in.Name, in.Bounds); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "partition created"})
}

func (h *ClusterHandler) attachPartition(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in struct {
		Partition string `json:"partition"`
		Bounds    string `json:"bounds"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.service.AttachPartition(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"), in.Partition, in.Bounds); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "partition attached"})
}

func (h *ClusterHandler) detachPartition(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	if err := h.service.DetachPartition(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"), c.Param("partition")); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "partition detached"})
}

// ---------------------------------------------------------------------------
// Triggers
// ---------------------------------------------------------------------------

func (h *ClusterHandler) createTrigger(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in cluster.TriggerInput
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.service.CreateTrigger(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"), in); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "trigger created"})
}

func (h *ClusterHandler) replaceTrigger(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in cluster.TriggerInput
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.service.ReplaceTrigger(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"), c.Param("trigger"), in); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "trigger updated"})
}

func (h *ClusterHandler) dropTrigger(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	if err := h.service.DropTrigger(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"), c.Param("trigger")); err != nil {
		respondError(c, err)
		return
	}
	NoContent(c)
}

func (h *ClusterHandler) enableTrigger(c *gin.Context) {
	h.runObjectAction(c, func() error {
		return h.service.SetTriggerEnabled(c.Request.Context(), mustID(c), c.Param("database"), c.Param("schema"), c.Param("table"), c.Param("trigger"), true)
	})
}

func (h *ClusterHandler) disableTrigger(c *gin.Context) {
	h.runObjectAction(c, func() error {
		return h.service.SetTriggerEnabled(c.Request.Context(), mustID(c), c.Param("database"), c.Param("schema"), c.Param("table"), c.Param("trigger"), false)
	})
}

// ---------------------------------------------------------------------------
// Policies
// ---------------------------------------------------------------------------

func (h *ClusterHandler) createPolicy(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in cluster.PolicyInput
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.service.CreatePolicy(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"), in); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "policy created"})
}

func (h *ClusterHandler) replacePolicy(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in cluster.PolicyInput
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.service.ReplacePolicy(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"), c.Param("policy"), in); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "policy updated"})
}

func (h *ClusterHandler) dropPolicy(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	if err := h.service.DropPolicy(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"), c.Param("policy")); err != nil {
		respondError(c, err)
		return
	}
	NoContent(c)
}

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

func (h *ClusterHandler) createRule(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in cluster.RuleInput
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.service.CreateRule(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"), in); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "rule created"})
}

func (h *ClusterHandler) replaceRule(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in cluster.RuleInput
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.service.ReplaceRule(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"), c.Param("rule"), in); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "rule updated"})
}

func (h *ClusterHandler) dropRule(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	if err := h.service.DropRule(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"), c.Param("rule")); err != nil {
		respondError(c, err)
		return
	}
	NoContent(c)
}

func (h *ClusterHandler) listPolicies(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	policies, err := h.service.ListPolicies(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"))
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, policies)
}

func (h *ClusterHandler) listRules(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	rules, err := h.service.ListRules(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"))
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, rules)
}