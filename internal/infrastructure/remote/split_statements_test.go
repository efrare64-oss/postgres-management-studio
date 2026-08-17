package remote

import (
	"reflect"
	"testing"
)

func TestSplitStatements(t *testing.T) {
	cases := []struct {
		name string
		sql  string
		want []string
	}{
		{
			name: "two selects",
			sql:  "select * from users; select * from roles;",
			want: []string{"select * from users", "select * from roles"},
		},
		{
			name: "semicolon inside string literal",
			sql:  "select 'a;b'; select 2;",
			want: []string{"select 'a;b'", "select 2"},
		},
		{
			name: "quoted identifier with semicolon",
			sql:  "select \"x;y\" from t;",
			want: []string{"select \"x;y\" from t"},
		},
		{
			name: "dollar quoted",
			sql:  "select $$a;b$$; select 1;",
			want: []string{"select $$a;b$$", "select 1"},
		},
		{
			name: "line comment with semicolon",
			sql:  "select 1; -- nota; aqui\nselect 2;",
			want: []string{"select 1", "select 2"},
		},
		{
			name: "comment only fragment dropped",
			sql:  "select 1; -- fim\n",
			want: []string{"select 1"},
		},
		{
			name: "empty and whitespace only",
			sql:  "   \n  ",
			want: []string{},
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := SplitStatements(tc.sql)
			if !reflect.DeepEqual(got, tc.want) {
				t.Errorf("SplitStatements(%q) = %#v, want %#v", tc.sql, got, tc.want)
			}
		})
	}
}
