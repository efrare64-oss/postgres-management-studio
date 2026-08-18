package handler

import (
	"encoding/csv"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"postgres-management-studio/internal/domain/cluster"
)

// RegisterActions registers data-grid, maintenance, create/drop, dashboard,
// grants and search routes on the given API group.
func (h *ClusterHandler) registerActions(r *gin.RouterGroup) {
	r.GET("/servers/:id/databases/:database/schemas/:schema/tables/:table/data", h.tableData)
	r.GET("/servers/:id/databases/:database/schemas/:schema/tables/:table/data/export", h.tableDataExport)
	r.POST("/servers/:id/databases/:database/schemas/:schema/tables/:table/data", h.saveTableData)
	r.POST("/servers/:id/databases/:database/schemas/:schema/tables/:table/data/import", h.importCSV)
	r.GET("/servers/:id/databases/:database/schemas/:schema/tables/:table/count", h.countTableRows)
	r.POST("/servers/:id/databases/:database/schemas/:schema/tables/:table/truncate", h.truncateTable)
	r.POST("/servers/:id/databases/:database/schemas/:schema/tables/:table/reindex", h.reindexTable)
	r.POST("/servers/:id/databases/:database/schemas/:schema/tables/:table/analyze", h.analyzeTable)
	r.POST("/servers/:id/databases/:database/analyze", h.analyzeDatabase)
	r.POST("/servers/:id/databases/:database/schemas/:schema/matviews/:matview/refresh", h.refreshMatView)

	r.POST("/servers/:id/databases", h.createDatabase)
	r.DELETE("/servers/:id/databases/:database", h.dropDatabase)
	r.POST("/servers/:id/databases/:database/schemas", h.createSchema)
	r.DELETE("/servers/:id/databases/:database/schemas/:schema", h.dropSchema)
	r.POST("/servers/:id/databases/:database/schemas/:schema/views", h.createView)
	r.DELETE("/servers/:id/databases/:database/schemas/:schema/views/:view", h.dropObject)
	r.POST("/servers/:id/databases/:database/schemas/:schema/matviews", h.createMatView)
	r.DELETE("/servers/:id/databases/:database/schemas/:schema/matviews/:matview", h.dropObject)
	r.POST("/servers/:id/databases/:database/schemas/:schema/sequences", h.createSequence)
	r.DELETE("/servers/:id/databases/:database/schemas/:schema/sequences/:sequence", h.dropObject)
	r.POST("/servers/:id/databases/:database/schemas/:schema/functions", h.createFunction)
	r.DELETE("/servers/:id/databases/:database/schemas/:schema/functions/:function", h.dropFunction)
	r.POST("/servers/:id/databases/:database/schemas/:schema/tables/:table/indexes", h.createIndex)
	r.DELETE("/servers/:id/databases/:database/schemas/:schema/indexes/:index", h.dropObject)
	r.POST("/servers/:id/databases/:database/extensions", h.createExtension)
	r.DELETE("/servers/:id/databases/:database/extensions/:extension", h.dropObject)

	r.GET("/servers/:id/databases/:database/locks", h.listLocks)
	r.GET("/servers/:id/databases/:database/settings", h.listSettings)
	r.POST("/servers/:id/databases/:database/sessions/:pid/cancel", h.cancelSession)
	r.POST("/servers/:id/databases/:database/sessions/:pid/terminate", h.terminateSession)
	r.POST("/servers/:id/databases/:database/grants", h.applyGrants)
	r.GET("/servers/:id/databases/:database/search", h.searchObjects)
	r.GET("/servers/:id/databases/:database/schemas/:schema/objects/:kind/:name/dependencies", h.listDependencies)
	r.GET("/servers/:id/databases/:database/schemas/:schema/objects/:kind/:name/dependents", h.listDependents)
}

// ---------------------------------------------------------------------------
// Data grid
// ---------------------------------------------------------------------------

func (h *ClusterHandler) tableData(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	limit := 100
	offset := 0
	if v := c.Query("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			limit = n
		}
	}
	if v := c.Query("offset"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			offset = n
		}
	}

	data, err := h.service.GetTableData(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"), limit, offset)
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, data)
}

func (h *ClusterHandler) tableDataExport(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	data, err := h.service.GetTableData(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"), 100000, 0)
	if err != nil {
		respondError(c, err)
		return
	}

	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", fmt.Sprintf("attachment; filename=%q.csv", c.Param("table")))
	writer := csv.NewWriter(c.Writer)
	defer writer.Flush()

	header := make([]string, len(data.Columns))
	for i, col := range data.Columns {
		header[i] = col.Name
	}
	_ = writer.Write(header)
	for _, row := range data.Rows {
		record := make([]string, len(row))
		for i, v := range row {
			record[i] = csvCell(v)
		}
		_ = writer.Write(record)
	}
}

func csvCell(v any) string {
	switch t := v.(type) {
	case nil:
		return ""
	case string:
		return t
	case []byte:
		return string(t)
	default:
		return fmt.Sprintf("%v", t)
	}
}

func (h *ClusterHandler) saveTableData(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in cluster.TableDataSave
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}

	res, err := h.service.SaveTableData(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"), in)
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, res)
}

func (h *ClusterHandler) importCSV(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	file, _, err := c.Request.FormFile("file")
	if err != nil {
		Error(c, http.StatusBadRequest, "missing file: "+err.Error())
		return
	}
	defer file.Close()

	delimiter := c.DefaultPostForm("delimiter", ",")
	delimRune := rune(delimiter[0])
	if len(delimiter) > 1 {
		switch delimiter {
		case "\\t":
			delimRune = '\t'
		default:
			delimRune = rune(delimiter[0])
		}
	}
	skipHeader := c.DefaultPostForm("header", "true") == "true"

	reader := csv.NewReader(file)
	reader.Comma = delimRune
	reader.LazyQuotes = true
	reader.TrimLeadingSpace = true

	records, err := reader.ReadAll()
	if err != nil {
		Error(c, http.StatusBadRequest, "invalid CSV: "+err.Error())
		return
	}
	if len(records) == 0 {
		Error(c, http.StatusBadRequest, "empty CSV")
		return
	}

	var columns []string
	var rows [][]string
	if skipHeader {
		columns = records[0]
		rows = records[1:]
	} else {
		columns = make([]string, len(records[0]))
		for i := range columns {
			columns[i] = fmt.Sprintf("column%d", i+1)
		}
		rows = records
	}

	res, err := h.service.ImportCSV(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"), columns, rows)
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, res)
}

func (h *ClusterHandler) countTableRows(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	count, err := h.service.CountTableRows(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"))
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, cluster.CountResult{Count: count})
}

// ---------------------------------------------------------------------------
// Maintenance
// ---------------------------------------------------------------------------

func (h *ClusterHandler) truncateTable(c *gin.Context) {
	restartIdentity := c.DefaultQuery("restart_identity", "false") == "true"
	cascade := c.DefaultQuery("cascade", "false") == "true"
	h.runObjectAction(c, func() error {
		return h.service.TruncateTable(c.Request.Context(), mustID(c), c.Param("database"), c.Param("schema"), c.Param("table"), restartIdentity, cascade)
	})
}

func (h *ClusterHandler) reindexTable(c *gin.Context) {
	h.runObjectAction(c, func() error {
		return h.service.ReindexTable(c.Request.Context(), mustID(c), c.Param("database"), c.Param("schema"), c.Param("table"))
	})
}

func (h *ClusterHandler) analyzeTable(c *gin.Context) {
	h.runObjectAction(c, func() error {
		return h.service.AnalyzeTable(c.Request.Context(), mustID(c), c.Param("database"), c.Param("schema"), c.Param("table"))
	})
}

func (h *ClusterHandler) analyzeDatabase(c *gin.Context) {
	h.runObjectAction(c, func() error {
		return h.service.AnalyzeDatabase(c.Request.Context(), mustID(c), c.Param("database"))
	})
}

func (h *ClusterHandler) refreshMatView(c *gin.Context) {
	withData := c.DefaultQuery("with_data", "true") != "false"
	h.runObjectAction(c, func() error {
		return h.service.RefreshMatView(c.Request.Context(), mustID(c), c.Param("database"), c.Param("schema"), c.Param("matview"), withData)
	})
}

func (h *ClusterHandler) runObjectAction(c *gin.Context, fn func() error) {
	if err := fn(); err != nil {
		respondError(c, err)
		return
	}
	OK(c, cluster.ActionResult{Message: "ok"})
}

func mustID(c *gin.Context) int64 {
	id, _ := strconv.ParseInt(c.Param("id"), 10, 64)
	return id
}

// ---------------------------------------------------------------------------
// Create / drop
// ---------------------------------------------------------------------------

func (h *ClusterHandler) createDatabase(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in struct {
		Name  string `json:"name"`
		Owner string `json:"owner"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if in.Name == "" {
		Error(c, http.StatusBadRequest, "name is required")
		return
	}

	if err := h.service.CreateDatabase(c.Request.Context(), id, in.Name, in.Owner); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "database created"})
}

func (h *ClusterHandler) dropDatabase(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	force := c.DefaultQuery("force", "false") == "true"
	if err := h.service.DropDatabase(c.Request.Context(), id, c.Param("database"), force); err != nil {
		respondError(c, err)
		return
	}
	NoContent(c)
}

func (h *ClusterHandler) createSchema(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in struct {
		Name  string `json:"name"`
		Owner string `json:"owner"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if in.Name == "" {
		Error(c, http.StatusBadRequest, "name is required")
		return
	}

	if err := h.service.CreateSchema(c.Request.Context(), id, c.Param("database"), in.Name, in.Owner); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "schema created"})
}

func (h *ClusterHandler) dropSchema(c *gin.Context) {
	h.dropObjectKind(c, "schema", c.Param("schema"))
}

func (h *ClusterHandler) dropObject(c *gin.Context) {
	h.dropObjectKind(c, objectKindFromPath(c), objectNameFromPath(c))
}

func (h *ClusterHandler) dropFunction(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	if err := h.service.DropObject(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("function"), "function", c.DefaultQuery("cascade", "false") == "true"); err != nil {
		respondError(c, err)
		return
	}
	NoContent(c)
}

func (h *ClusterHandler) dropObjectKind(c *gin.Context, kind, name string) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}
	cascade := c.DefaultQuery("cascade", "false") == "true"
	if err := h.service.DropObject(c.Request.Context(), id, c.Param("database"), c.Param("schema"), name, kind, cascade); err != nil {
		respondError(c, err)
		return
	}
	NoContent(c)
}

func objectKindFromPath(c *gin.Context) string {
	switch {
	case c.Param("view") != "":
		return "view"
	case c.Param("matview") != "":
		return "matview"
	case c.Param("sequence") != "":
		return "sequence"
	case c.Param("index") != "":
		return "index"
	case c.Param("extension") != "":
		return "extension"
	}
	return "object"
}

func objectNameFromPath(c *gin.Context) string {
	for _, p := range []string{"view", "matview", "sequence", "index", "extension"} {
		if v := c.Param(p); v != "" {
			return v
		}
	}
	return ""
}

func (h *ClusterHandler) createView(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in struct {
		Name       string `json:"name"`
		Definition string `json:"definition"`
		Replace    bool   `json:"replace"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if in.Name == "" {
		Error(c, http.StatusBadRequest, "name is required")
		return
	}

	if err := h.service.CreateView(c.Request.Context(), id, c.Param("database"), c.Param("schema"), in.Name, in.Definition, in.Replace); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "view created"})
}

func (h *ClusterHandler) createMatView(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in struct {
		Name       string `json:"name"`
		Definition string `json:"definition"`
		WithData   bool   `json:"with_data"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if in.Name == "" {
		Error(c, http.StatusBadRequest, "name is required")
		return
	}

	if err := h.service.CreateMatView(c.Request.Context(), id, c.Param("database"), c.Param("schema"), in.Name, in.Definition, in.WithData); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "materialized view created"})
}

func (h *ClusterHandler) createSequence(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in struct {
		Name string                `json:"name"`
		Seq  cluster.SequenceInput `json:"sequence"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if in.Name == "" {
		Error(c, http.StatusBadRequest, "name is required")
		return
	}

	if err := h.service.CreateSequence(c.Request.Context(), id, c.Param("database"), c.Param("schema"), in.Name, in.Seq); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "sequence created"})
}

func (h *ClusterHandler) createFunction(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in struct {
		Name string                `json:"name"`
		Fn   cluster.FunctionInput `json:"function"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if in.Name == "" {
		Error(c, http.StatusBadRequest, "name is required")
		return
	}

	if err := h.service.CreateFunction(c.Request.Context(), id, c.Param("database"), c.Param("schema"), in.Name, in.Fn); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "function created"})
}

func (h *ClusterHandler) createIndex(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in cluster.IndexInput
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.service.CreateIndex(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("table"), in); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "index created"})
}

func (h *ClusterHandler) createExtension(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in struct {
		Name   string `json:"name"`
		Schema string `json:"schema"`
	}
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}
	if in.Name == "" {
		Error(c, http.StatusBadRequest, "name is required")
		return
	}

	if err := h.service.CreateExtension(c.Request.Context(), id, c.Param("database"), in.Name, in.Schema); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "extension created"})
}

// ---------------------------------------------------------------------------
// Dashboard / grants / search
// ---------------------------------------------------------------------------

func (h *ClusterHandler) listLocks(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	locks, err := h.service.ListLocks(c.Request.Context(), id, c.Param("database"))
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, locks)
}

func (h *ClusterHandler) listSettings(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	settings, err := h.service.ListSettings(c.Request.Context(), id, c.Param("database"))
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, settings)
}

func (h *ClusterHandler) cancelSession(c *gin.Context) {
	h.runPIDAction(c, false)
}

func (h *ClusterHandler) terminateSession(c *gin.Context) {
	h.runPIDAction(c, true)
}

func (h *ClusterHandler) runPIDAction(c *gin.Context, terminate bool) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	pid, ok := parseID(c, "pid")
	if !ok {
		return
	}

	var err error
	if terminate {
		err = h.service.TerminateSession(c.Request.Context(), id, c.Param("database"), pid)
	} else {
		err = h.service.CancelSession(c.Request.Context(), id, c.Param("database"), pid)
	}
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "ok"})
}

func (h *ClusterHandler) applyGrants(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	var in cluster.GrantInput
	if err := c.ShouldBindJSON(&in); err != nil {
		Error(c, http.StatusBadRequest, err.Error())
		return
	}

	if err := h.service.ApplyGrants(c.Request.Context(), id, c.Param("database"), in); err != nil {
		respondError(c, err)
		return
	}
	OK(c, gin.H{"message": "grant applied"})
}

func (h *ClusterHandler) searchObjects(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	query := c.Query("q")
	if query == "" {
		OK(c, []cluster.SearchObject{})
		return
	}

	results, err := h.service.SearchObjects(c.Request.Context(), id, c.Param("database"), query, 100)
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, results)
}

// ---------------------------------------------------------------------------
// Dependencies / Dependents
// ---------------------------------------------------------------------------

func (h *ClusterHandler) listDependencies(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	results, err := h.service.GetDependencies(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("name"), c.Param("kind"))
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, results)
}

func (h *ClusterHandler) listDependents(c *gin.Context) {
	id, ok := parseID(c, "id")
	if !ok {
		return
	}

	results, err := h.service.GetDependents(c.Request.Context(), id, c.Param("database"), c.Param("schema"), c.Param("name"), c.Param("kind"))
	if err != nil {
		respondError(c, err)
		return
	}
	OK(c, results)
}