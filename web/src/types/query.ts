export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  rows_affected: number;
  duration_ms: number;
}

export interface QueryBatch {
  results: QueryResult[];
  duration_ms: number;
  error?: string;
}

export interface SqlText {
  sql: string;
}
