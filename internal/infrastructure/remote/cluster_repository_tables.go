package remote

import (
	"context"
	"fmt"
	"strings"

	"postgres-management-studio/internal/domain/cluster"
	"postgres-management-studio/internal/domain/connection"
)

func (r *ClusterRepository) CreateTable(ctx context.Context, q connection.Querier, schema string, input cluster.CreateTableInput) error {
	if len(input.Columns) == 0 {
		return fmt.Errorf("table must have at least one column")
	}

	var defs []string
	var primaryKeys []string

	for _, col := range input.Columns {
		parts := []string{quoteIdent(col.Name), col.Type}
		if !col.Nullable {
			parts = append(parts, "NOT NULL")
		}
		if col.Default != "" {
			parts = append(parts, "DEFAULT "+col.Default)
		}
		if col.Primary {
			primaryKeys = append(primaryKeys, quoteIdent(col.Name))
		}
		defs = append(defs, strings.Join(parts, " "))
	}

	if len(primaryKeys) > 0 {
		defs = append(defs, "PRIMARY KEY ("+strings.Join(primaryKeys, ", ")+")")
	}

	sql := "CREATE TABLE " + qualifiedName(schema, input.Name) + " (\n  " + strings.Join(defs, ",\n  ") + "\n)"
	if _, err := q.Query(ctx, sql); err != nil {
		return fmt.Errorf("create table: %w", err)
	}
	return nil
}

func (r *ClusterRepository) RenameTable(ctx context.Context, q connection.Querier, schema, table, newName string) error {
	sql := "ALTER TABLE " + qualifiedName(schema, table) + " RENAME TO " + quoteIdent(newName)
	if _, err := q.Query(ctx, sql); err != nil {
		return fmt.Errorf("rename table: %w", err)
	}
	return nil
}

func (r *ClusterRepository) CommentTable(ctx context.Context, q connection.Querier, schema, table, comment string) error {
	sql := "COMMENT ON TABLE " + qualifiedName(schema, table) + " IS '" + escapeSQL(comment) + "'"
	if _, err := q.Query(ctx, sql); err != nil {
		return fmt.Errorf("comment table: %w", err)
	}
	return nil
}

func (r *ClusterRepository) DropTable(ctx context.Context, q connection.Querier, schema, table string) error {
	sql := "DROP TABLE " + qualifiedName(schema, table)
	if _, err := q.Query(ctx, sql); err != nil {
		return fmt.Errorf("drop table: %w", err)
	}
	return nil
}
