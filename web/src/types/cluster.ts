export interface Column {
  name: string;
  data_type: string;
  nullable: boolean;
  default?: string | null;
  is_primary: boolean;
  position: number;
}

export interface Index {
  name: string;
  columns: string;
  unique: boolean;
  method: string;
}

export interface Constraint {
  name: string;
  type: string;
  definition: string;
}

export interface Trigger {
  name: string;
  table: string;
  timing: string;
  events: string;
  function: string;
  enabled: string;
}

export interface Table {
  name: string;
  schema: string;
  owner: string;
  size: string;
  comment?: string | null;
}

export interface TableDetail {
  table: Table;
  columns: Column[];
  indexes: Index[];
  constraints: Constraint[];
}

export interface TableStats {
  size: string;
  index_size: string;
  rows: number;
  dead_rows: number;
  seq_scans: number;
  seq_tup_read: number;
  idx_scans: number;
  idx_tup_fetch: number;
  inserts: number;
  updates: number;
  deletes: number;
  last_auto_analyze?: string | null;
  last_analyze?: string | null;
  last_vacuum?: string | null;
}

export interface CompletionColumn {
  name: string;
  data_type: string;
}

export interface CompletionTable {
  schema: string;
  name: string;
  kind: string;
  columns: CompletionColumn[];
}

export interface Session {
  pid: number;
  database: string;
  user: string;
  state: string;
  query: string;
  duration: string;
}

export interface ServerDashboard {
  version: string;
  total_connections: number;
  max_connections: number;
  active_queries: number;
  databases: { name: string; size: string }[];
  sessions: Session[];
}

export interface DatabaseDashboard {
  database_size: string;
  connections: number;
  active_queries: number;
  idle: number;
  sessions: Session[];
}
