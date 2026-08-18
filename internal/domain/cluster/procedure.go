package cluster

type Procedure struct {
	Name      string `json:"name"`
	Schema    string `json:"schema"`
	Owner     string `json:"owner"`
	Arguments string `json:"arguments"`
	Language  string `json:"language"`
}