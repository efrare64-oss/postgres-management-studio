package cluster

type Column struct {
	Name      string `json:"name"`
	DataType  string `json:"data_type"`
	Nullable  bool   `json:"nullable"`
	Default   string `json:"default"`
	IsPrimary bool   `json:"is_primary"`
	Position  int    `json:"position"`
}
