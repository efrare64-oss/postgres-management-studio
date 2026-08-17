package cluster

type CompletionColumn struct {
	Name     string `json:"name"`
	DataType string `json:"data_type"`
}

type CompletionTable struct {
	Schema  string            `json:"schema"`
	Name    string            `json:"name"`
	Kind    string            `json:"kind"`
	Columns []CompletionColumn `json:"columns"`
}
