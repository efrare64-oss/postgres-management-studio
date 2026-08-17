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

export interface CatalogObject {
  name: string;
  detail?: string | null;
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

export interface TableColumn {
  name: string;
  data_type: string;
  is_pk: boolean;
}

export interface TableData {
  columns: TableColumn[];
  rows: unknown[][];
  total: number;
  has_pk: boolean;
}

export interface RowChange {
  old: Record<string, unknown>;
  new: Record<string, unknown>;
}

export interface TableDataSave {
  inserts: Record<string, unknown>[];
  updates: RowChange[];
  deletes: Record<string, unknown>[];
}

export interface DataSaveResult {
  inserted: number;
  updated: number;
  deleted: number;
}

export interface ActionResult {
  message: string;
}

export interface CountResult {
  count: number;
}

export interface Lock {
  pid: number;
  database: string;
  user: string;
  relation: string;
  mode: string;
  granted: boolean;
  wait_event: string;
}

export interface Setting {
  name: string;
  value: string;
  unit: string;
  context: string;
  category: string;
  description: string;
}

export interface SearchObject {
  schema: string;
  name: string;
  kind: string;
  detail: string;
}

export interface GrantInput {
  privileges: string[];
  object_kind: string;
  object_name: string;
  schema: string;
  roles: string[];
  with_grant: boolean;
}

export interface SequenceInput {
  data_type: string;
  start: number;
  min: number;
  max: number;
  increment: number;
  cache: number;
  owner: string;
}

export interface FunctionInput {
  language: string;
  arguments: string;
  return_type: string;
  body: string;
  volatility: string;
  owner: string;
  replace: boolean;
}

export interface IndexInput {
  name: string;
  columns: string;
  unique: boolean;
  method: string;
  where: string;
}

export interface Dependency {
  type: string;
  schema: string;
  name: string;
  owner: string;
  dep_type: string;
}

export interface Dependent {
  type: string;
  schema: string;
  name: string;
  owner: string;
  dep_type: string;
}

export interface CSVImportResult {
  inserted: number;
  errors: number;
  message: string;
}