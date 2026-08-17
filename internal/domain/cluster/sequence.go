package cluster

type Sequence struct {
	Name      string `json:"name"`
	Schema    string `json:"schema"`
	Owner     string `json:"owner"`
	DataType  string `json:"data_type"`
	Start     int64  `json:"start"`
	Min       int64  `json:"min"`
	Max       int64  `json:"max"`
	Increment int64  `json:"increment"`
	Current   int64  `json:"current"`
	Cache     int64  `json:"cache"`
}
