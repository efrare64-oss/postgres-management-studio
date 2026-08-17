package cluster

type View struct {
	Name   string `json:"name"`
	Schema string `json:"schema"`
	Owner  string `json:"owner"`
}
