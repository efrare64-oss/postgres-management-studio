package cluster

type Constraint struct {
	Name       string   `json:"name"`
	Type       string   `json:"type"`
	Definition string   `json:"definition"`
	RefTable   string   `json:"ref_table"`
	RefColumns []string `json:"ref_columns"`
	OnDelete   string   `json:"on_delete"`
	OnUpdate   string   `json:"on_update"`
	Deferrable bool     `json:"deferrable"`
}
