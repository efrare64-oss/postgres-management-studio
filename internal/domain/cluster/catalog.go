package cluster

type CatalogObject struct {
	Name   string `json:"name"`
	Detail string `json:"detail"`
}

type CatalogScope struct {
	Schema string
	Table  string
}