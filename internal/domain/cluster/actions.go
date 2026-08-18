package cluster

type ActionResult struct {
	Message string `json:"message"`
}

type CountResult struct {
	Count int64 `json:"count"`
}

type TableColumn struct {
	Name     string `json:"name"`
	DataType string `json:"data_type"`
	IsPK     bool   `json:"is_pk"`
}

type TableData struct {
	Columns []TableColumn `json:"columns"`
	Rows    [][]any       `json:"rows"`
	Total   int64         `json:"total"`
	HasPK   bool          `json:"has_pk"`
}

type RowChange struct {
	Old map[string]any `json:"old"`
	New map[string]any `json:"new"`
}

type TableDataSave struct {
	Inserts []map[string]any `json:"inserts"`
	Updates []RowChange      `json:"updates"`
	Deletes []map[string]any `json:"deletes"`
}

type DataSaveResult struct {
	Inserted int `json:"inserted"`
	Updated  int `json:"updated"`
	Deleted  int `json:"deleted"`
}

type Lock struct {
	PID       int64  `json:"pid"`
	Database  string `json:"database"`
	User      string `json:"user"`
	Relation  string `json:"relation"`
	Mode      string `json:"mode"`
	Granted   bool   `json:"granted"`
	WaitEvent string `json:"wait_event"`
}

type Setting struct {
	Name        string `json:"name"`
	Value       string `json:"value"`
	Unit        string `json:"unit"`
	Context     string `json:"context"`
	Category    string `json:"category"`
	Description string `json:"description"`
}

type SearchObject struct {
	Schema string `json:"schema"`
	Name   string `json:"name"`
	Kind   string `json:"kind"`
	Detail string `json:"detail"`
}

type SequenceInput struct {
	DataType  string `json:"data_type"`
	Start     int64  `json:"start"`
	Min       int64  `json:"min"`
	Max       int64  `json:"max"`
	Increment int64  `json:"increment"`
	Cache     int64  `json:"cache"`
	Owner     string `json:"owner"`
}

type FunctionInput struct {
	Language    string `json:"language"`
	Arguments   string `json:"arguments"`
	ReturnType  string `json:"return_type"`
	Body        string `json:"body"`
	Volatility  string `json:"volatility"`
	Owner       string `json:"owner"`
	Replace     bool   `json:"replace"`
}

type IndexInput struct {
	Name       string `json:"name"`
	Columns    string `json:"columns"`
	Unique     bool   `json:"unique"`
	Method     string `json:"method"`
	Where      string `json:"where"`
	Tablespace string `json:"tablespace"`
	Fillfactor int    `json:"fillfactor"`
}

type GrantInput struct {
	Privileges []string `json:"privileges"`
	ObjectKind string   `json:"object_kind"`
	ObjectName string   `json:"object_name"`
	Schema     string   `json:"schema"`
	Roles      []string `json:"roles"`
	WithGrant  bool     `json:"with_grant"`
}

type Dependency struct {
	Type      string `json:"type"`
	Schema    string `json:"schema"`
	Name      string `json:"name"`
	Owner     string `json:"owner"`
	DepType   string `json:"dep_type"`
}

type Dependent struct {
	Type      string `json:"type"`
	Schema    string `json:"schema"`
	Name      string `json:"name"`
	Owner     string `json:"owner"`
	DepType   string `json:"dep_type"`
}

type CSVImportResult struct {
	Inserted int    `json:"inserted"`
	Errors   int    `json:"errors"`
	Message  string `json:"message"`
}