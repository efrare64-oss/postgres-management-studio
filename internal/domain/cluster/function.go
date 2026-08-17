package cluster

type Function struct {
	Name       string `json:"name"`
	Schema     string `json:"schema"`
	Owner      string `json:"owner"`
	Arguments  string `json:"arguments"`
	ReturnType string `json:"return_type"`
	Language   string `json:"language"`
}
