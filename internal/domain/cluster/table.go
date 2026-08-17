package cluster

type Table struct {
	Name    string `json:"name"`
	Schema  string `json:"schema"`
	Owner   string `json:"owner"`
	Columns int    `json:"columns"`
	Size    string `json:"size"`
	Comment string `json:"comment"`
}
