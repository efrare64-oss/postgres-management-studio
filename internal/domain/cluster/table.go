package cluster

type Table struct {
	Name          string   `json:"name"`
	Schema        string   `json:"schema"`
	Owner         string   `json:"owner"`
	Columns       int      `json:"columns"`
	Size          string   `json:"size"`
	Comment       string   `json:"comment"`
	RowEstimate   int64    `json:"row_estimate"`
	Tablespace    string   `json:"tablespace"`
	Fillfactor    int      `json:"fillfactor"`
	StorageParams []string `json:"storage_params"`
	AccessMethod  string   `json:"access_method"`
	Persistence   string   `json:"persistence"`
	PartitionKey  string   `json:"partition_key"`
	HasOIDs       bool     `json:"has_oids"`
	IndexesSize   string   `json:"indexes_size"`
	ToastSize     string   `json:"toast_size"`
}
