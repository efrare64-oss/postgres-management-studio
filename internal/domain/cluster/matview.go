package cluster

type MatView struct {
	Name      string `json:"name"`
	Schema    string `json:"schema"`
	Owner     string `json:"owner"`
	Populated bool   `json:"populated"`
}
