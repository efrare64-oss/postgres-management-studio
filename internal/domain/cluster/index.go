package cluster

type Index struct {
	Name          string   `json:"name"`
	Columns       []string `json:"columns"`
	Definition    string   `json:"definition"`
	Unique        bool     `json:"unique"`
	Method        string   `json:"method"`
	Predicate     string   `json:"predicate"`
	Tablespace    string   `json:"tablespace"`
	Fillfactor    int      `json:"fillfactor"`
	StorageParams []string `json:"storage_params"`
	Clustered     bool     `json:"clustered"`
}
