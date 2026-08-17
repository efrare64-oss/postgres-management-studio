package cluster

type Trigger struct {
	Name     string `json:"name"`
	Table    string `json:"table"`
	Timing   string `json:"timing"`
	Events   string `json:"events"`
	Function string `json:"function"`
	Enabled  string `json:"enabled"`
}
