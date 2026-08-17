export interface QueryResult {
  columns: string[];
  rows: unknown[][];
  rows_affected: number;
  duration_ms: number;
  error?: string;
}

export interface QueryBatch {
  results: QueryResult[];
  duration_ms: number;
  error?: string;
}

export interface SqlText {
  sql: string;
}

export interface HistoryItem {
  id: number;
  query: string;
  server_id: number;
  database: string;
  success: boolean;
  error: string;
  created_at: string;
}