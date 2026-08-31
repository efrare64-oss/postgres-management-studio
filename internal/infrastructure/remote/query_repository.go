package remote

import (
	"context"
	"fmt"
	"net"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"

	"postgres-management-studio/internal/domain/connection"
	"postgres-management-studio/internal/domain/query"
)

type QueryRepository struct{}

func NewQueryRepository() *QueryRepository {
	return &QueryRepository{}
}

var _ query.Repository = (*QueryRepository)(nil)

func (r *QueryRepository) Execute(ctx context.Context, q connection.Querier, sql string) (*query.Result, error) {
	start := time.Now()

	rows, err := q.Query(ctx, sql)
	if err != nil {
		return nil, fmt.Errorf("execute query: %w", err)
	}
	defer rows.Close()

	return r.collect(start, rows, sql)
}

func (r *QueryRepository) ExecuteBatch(ctx context.Context, q connection.Querier, sql string) ([]*query.Result, error) {
	statements := SplitStatements(sql)

	var results []*query.Result
	for _, stmt := range statements {
		res, err := r.Execute(ctx, q, stmt)
		if err != nil {
			return results, err
		}
		results = append(results, res)
	}
	return results, nil
}

func (r *QueryRepository) Explain(ctx context.Context, q connection.Querier, sql string, analyze bool) (*query.Result, error) {
	start := time.Now()

	explain := "EXPLAIN (ANALYZE " + boolStr(analyze) + ", VERBOSE false, COSTS true, BUFFERS false) " + sql

	rows, err := q.Query(ctx, explain)
	if err != nil {
		return nil, fmt.Errorf("execute explain: %w", err)
	}
	defer rows.Close()

	return r.collect(start, rows, sql)
}

func (r *QueryRepository) ExplainBatch(ctx context.Context, q connection.Querier, sql string, analyze bool) ([]*query.Result, error) {
	statements := SplitStatements(sql)

	var results []*query.Result
	for _, stmt := range statements {
		res, err := r.Explain(ctx, q, stmt, analyze)
		if err != nil {
			return results, err
		}
		results = append(results, res)
	}
	return results, nil
}

func (r *QueryRepository) collect(start time.Time, rows pgx.Rows, sql string) (*query.Result, error) {
	fields := rows.FieldDescriptions()
	columns := make([]string, len(fields))
	for i, f := range fields {
		columns[i] = f.Name
	}

	result := make([][]any, 0)
	for rows.Next() {
		values, err := rows.Values()
		if err != nil {
			return nil, fmt.Errorf("read row values: %w", err)
		}
		for i := range values {
			values[i] = normalizeCell(values[i])
		}
		result = append(result, values)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate rows: %w", err)
	}

	stmtType := detectStatementType(sql)

	return &query.Result{
		Columns:       columns,
		Rows:          result,
		RowsAffected:  rows.CommandTag().RowsAffected(),
		DurationMs:    time.Since(start).Milliseconds(),
		StatementType: stmtType,
	}, nil
}

// normalizeCell converts pgx raw values into JSON-friendly representations.
// pgx decodes uuid as [16]byte and bytea as []byte, which encoding/json turns
// into arrays/base64 instead of the human-readable text.
func normalizeCell(v any) any {
	switch t := v.(type) {
	case [16]byte:
		return formatUUID(t)
	case []byte:
		return string(t)
	case pgtype.Numeric:
		if !t.Valid {
			return nil
		}
		s, err := t.Value()
		if err != nil {
			return fmt.Sprintf("%v", t)
		}
		return s
	case pgtype.UUID:
		if !t.Valid {
			return nil
		}
		return formatUUID(t.Bytes)
	case pgtype.Date:
		if !t.Valid {
			return nil
		}
		return t.Time.Format("2006-01-02")
	case pgtype.Timestamp:
		if !t.Valid {
			return nil
		}
		return t.Time.Format("2006-01-02 15:04:05")
	case pgtype.Timestamptz:
		if !t.Valid {
			return nil
		}
		return t.Time.Format("2006-01-02 15:04:05 -0700")
	case pgtype.Interval:
		if !t.Valid {
			return nil
		}
		return fmt.Sprintf("%d months %d days %d seconds", t.Months, t.Days, t.Microseconds/1000000)
	case pgtype.Range[pgtype.Int4]:
		return fmt.Sprintf("[%d,%d)", t.Lower, t.Upper)
	case pgtype.Range[pgtype.Int8]:
		return fmt.Sprintf("[%d,%d)", t.Lower, t.Upper)
	case pgtype.Range[pgtype.Numeric]:
		return fmt.Sprintf("[any,any)")
	case net.IPNet:
		return t.String()
	case net.HardwareAddr:
		return t.String()
	case net.IP:
		return t.String()
	default:
		return v
	}
}

func formatUUID(b [16]byte) string {
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

// detectStatementType determines the type of a SQL statement by inspecting its
// first keyword. Returns one of: SELECT, INSERT, UPDATE, DELETE, DDL, COPY, SHOW, EXPLAIN.
func detectStatementType(sql string) string {
	trimmed := strings.TrimSpace(sql)
	upper := strings.ToUpper(trimmed)

	switch {
	case strings.HasPrefix(upper, "SELECT") || strings.HasPrefix(upper, "WITH") || strings.HasPrefix(upper, "TABLE") || strings.HasPrefix(upper, "VALUES"):
		return "SELECT"
	case strings.HasPrefix(upper, "INSERT"):
		return "INSERT"
	case strings.HasPrefix(upper, "UPDATE"):
		return "UPDATE"
	case strings.HasPrefix(upper, "DELETE"):
		return "DELETE"
	case strings.HasPrefix(upper, "TRUNCATE"):
		return "TRUNCATE"
	case strings.HasPrefix(upper, "COPY"):
		return "COPY"
	case strings.HasPrefix(upper, "EXPLAIN"):
		return "EXPLAIN"
	case strings.HasPrefix(upper, "SHOW"):
		return "SHOW"
	case strings.HasPrefix(upper, "CREATE") || strings.HasPrefix(upper, "ALTER") || strings.HasPrefix(upper, "DROP") || strings.HasPrefix(upper, "RENAME") || strings.HasPrefix(upper, "COMMENT") || strings.HasPrefix(upper, "GRANT") || strings.HasPrefix(upper, "REVOKE") || strings.HasPrefix(upper, "SET") || strings.HasPrefix(upper, "RESET") || strings.HasPrefix(upper, "VACUUM") || strings.HasPrefix(upper, "ANALYZE") || strings.HasPrefix(upper, "CLUSTER") || strings.HasPrefix(upper, "REINDEX") || strings.HasPrefix(upper, "REFRESH") || strings.HasPrefix(upper, "DISCARD") || strings.HasPrefix(upper, "LISTEN") || strings.HasPrefix(upper, "UNLISTEN") || strings.HasPrefix(upper, "NOTIFY") || strings.HasPrefix(upper, "DO") || strings.HasPrefix(upper, "BEGIN") || strings.HasPrefix(upper, "START") || strings.HasPrefix(upper, "COMMIT") || strings.HasPrefix(upper, "ROLLBACK") || strings.HasPrefix(upper, "SAVEPOINT") || strings.HasPrefix(upper, "RELEASE") || strings.HasPrefix(upper, "LOCK") || strings.HasPrefix(upper, "UNLOCK") || strings.HasPrefix(upper, "DEALLOCATE") || strings.HasPrefix(upper, "PREPARE") || strings.HasPrefix(upper, "EXECUTE") || strings.HasPrefix(upper, "IMPORT") || strings.HasPrefix(upper, "EXPORT"):
		return "DDL"
	default:
		return "DDL"
	}
}

func boolStr(b bool) string {
	if b {
		return "true"
	}
	return "false"
}

// SplitStatements divides a SQL script into individual statements on top-level
// semicolons, ignoring semicolons inside string literals, quoted identifiers,
// dollar-quoted blocks, and comments. Like SSMS/psql, empty and comment-only
// fragments are dropped.
func SplitStatements(sql string) []string {
	statements := []string{}
	var cur strings.Builder
	hasCode := false

	i := 0
	n := len(sql)
	for i < n {
		c := sql[i]

		switch {
		case c == '\'':
			writeQuote(sql, &cur, &i, '\'')
			hasCode = true
		case c == '"':
			writeQuote(sql, &cur, &i, '"')
			hasCode = true
		case c == '-' && i+1 < n && sql[i+1] == '-':
			// line comment: skip to end of line, only keep it if inside a statement
			start := i
			for i < n && sql[i] != '\n' {
				i++
			}
			if hasCode {
				cur.WriteString(sql[start:i])
			}
		case c == '/' && i+1 < n && sql[i+1] == '*':
			// block comment: skip to closing marker, only keep it if inside a statement
			start := i
			i += 2
			for i+1 < n && !(sql[i] == '*' && sql[i+1] == '/') {
				i++
			}
			if i+1 < n {
				i += 2
			}
			if hasCode {
				cur.WriteString(sql[start:i])
			}
		case c == '$':
			if tag, ok := dollarQuoteTag(sql, i); ok {
				start := i
				i += len(tag)
				close := strings.Index(sql[i:], tag)
				if close < 0 {
					i = n
				} else {
					i += close + len(tag)
				}
				cur.WriteString(sql[start:i])
				hasCode = true
			} else {
				cur.WriteByte(c)
				hasCode = true
				i++
			}
		case c == ';':
			if hasCode && strings.TrimSpace(cur.String()) != "" {
				statements = append(statements, strings.TrimSpace(cur.String()))
			}
			cur.Reset()
			hasCode = false
			i++
		default:
			cur.WriteByte(c)
			if c != ' ' && c != '\t' && c != '\n' && c != '\r' {
				hasCode = true
			}
			i++
		}
	}

	if hasCode && strings.TrimSpace(cur.String()) != "" {
		statements = append(statements, strings.TrimSpace(cur.String()))
	}

	return statements
}

func writeQuote(sql string, cur *strings.Builder, i *int, q byte) {
	start := *i
	*i++
	n := len(sql)
	for *i < n {
		if sql[*i] == '\\' && *i+1 < n {
			*i += 2
			continue
		}
		if sql[*i] == q {
			// doubled quote is an escaped quote inside the literal
			if *i+1 < n && sql[*i+1] == q {
				*i += 2
				continue
			}
			*i++
			break
		}
		*i++
	}
	cur.WriteString(sql[start:*i])
}

func dollarQuoteTag(sql string, i int) (string, bool) {
	// $tag$ where tag is empty or [A-Za-z0-9_]+
	j := i + 1
	for j < len(sql) {
		c := sql[j]
		if c == '_' || c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' {
			j++
			continue
		}
		break
	}
	if j < len(sql) && sql[j] == '$' {
		return sql[i : j+1], true
	}
	return "", false
}
