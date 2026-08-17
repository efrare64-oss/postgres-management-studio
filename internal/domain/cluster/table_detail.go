package cluster

type TableDetail struct {
	Table       Table        `json:"table"`
	Columns     []Column     `json:"columns"`
	Indexes     []Index      `json:"indexes"`
	Constraints []Constraint `json:"constraints"`
}
