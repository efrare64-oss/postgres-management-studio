package cluster

type ColumnInput struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Nullable bool   `json:"nullable"`
	Default  string `json:"default"`
	Primary  bool   `json:"primary"`
}

type CreateTableInput struct {
	Name    string        `json:"name"`
	Columns []ColumnInput `json:"columns"`
}

type RoleInput struct {
	Password    string `json:"password"`
	Superuser   bool   `json:"superuser"`
	CreateDB    bool   `json:"create_db"`
	CanLogin    bool   `json:"can_login"`
	Replication bool   `json:"replication"`
	ConnLimit   int    `json:"conn_limit"`
}

type AddColumnInput struct {
	Name      string `json:"name"`
	DataType  string `json:"data_type"`
	Nullable  bool   `json:"nullable"`
	Default   string `json:"default"`
	Collation string `json:"collation"`
}

type AlterColumnInput struct {
	NewName  *string `json:"new_name"`
	DataType *string `json:"data_type"`
	NotNull  *bool   `json:"not_null"`
	Default  *string `json:"default"`
}

type ConstraintInput struct {
	Name       string   `json:"name"`
	Type       string   `json:"type"`
	Columns    []string `json:"columns"`
	Check      string   `json:"check"`
	RefTable   string   `json:"ref_table"`
	RefColumns []string `json:"ref_columns"`
	OnDelete   string   `json:"on_delete"`
	OnUpdate   string   `json:"on_update"`
	Deferrable bool     `json:"deferrable"`
	Exclusion  string   `json:"exclusion"`
}

type TriggerInput struct {
	Name       string   `json:"name"`
	Timing     string   `json:"timing"`
	Events     []string `json:"events"`
	Function   string   `json:"function"`
	ForEachRow bool     `json:"for_each_row"`
	When       string   `json:"when"`
}

type PolicyInput struct {
	Name       string   `json:"name"`
	Command    string   `json:"command"`
	Roles      []string `json:"roles"`
	Permissive bool     `json:"permissive"`
	Using      string   `json:"using"`
	WithCheck  string   `json:"with_check"`
}

type RuleInput struct {
	Name    string `json:"name"`
	Event   string `json:"event"`
	Instead bool   `json:"instead"`
	Where   string `json:"where"`
	Action  string `json:"action"`
}

type Policy struct {
	Name       string   `json:"name"`
	Command    string   `json:"command"`
	Roles      []string `json:"roles"`
	Permissive bool     `json:"permissive"`
	Using      string   `json:"using"`
	WithCheck  string   `json:"with_check"`
}

type Rule struct {
	Name    string `json:"name"`
	Event   string `json:"event"`
	Instead bool   `json:"instead"`
	Where   string `json:"where"`
	Action  string `json:"action"`
}
