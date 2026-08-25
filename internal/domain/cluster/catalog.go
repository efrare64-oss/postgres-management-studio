package cluster

type CatalogObject struct {
	Name       string `json:"name"`
	Detail     string `json:"detail"`
	PrimaryKey bool   `json:"primary_key,omitempty"`
}

type CatalogScope struct {
	Schema string
	Table  string
}