export interface Column {
  name: string;
  data_type: string;
  nullable: boolean;
  default?: string | null;
  is_primary: boolean;
  position: number;
  width?: number | null;
  precision?: number | null;
  scale?: number | null;
  storage: string;
  collation: string;
}

export interface Index {
  name: string;
  columns: string[];
  definition: string;
  unique: boolean;
  method: string;
  predicate?: string | null;
  tablespace: string;
  fillfactor: number;
  storage_params: string[];
  clustered: boolean;
}

export interface Constraint {
  name: string;
  type: string;
  definition: string;
  ref_table?: string;
  ref_columns?: string[];
  on_delete?: string;
  on_update?: string;
  deferrable?: boolean;
}

export interface Trigger {
  name: string;
  table: string;
  timing: string;
  events: string;
  function: string;
  enabled: string;
  definition: string;
}

export interface Table {
  name: string;
  schema: string;
  owner: string;
  size: string;
  comment?: string | null;
  row_estimate?: number;
  tablespace?: string;
  fillfactor?: number;
  storage_params?: string[];
  access_method?: string;
  persistence?: string;
  partition_key?: string | null;
  has_oids?: boolean;
  indexes_size?: string;
  toast_size?: string;
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
  primary_key?: boolean;
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
  last_auto_vacuum?: string | null;
}

export interface ColumnStat {
  column: string;
  null_frac: number;
  avg_width: number;
  n_distinct: number;
  correlation: number;
  most_common_vals: string[];
  most_common_freqs: number[];
  histogram_bounds: string[];
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

export interface MetricSnapshot {
  timestamp: string;
  total_conn: number;
  active_queries: number;
  idle: number;
  commits: number;
  rollbacks: number;
  tuples_read: number;
  tuples_fetched: number;
  tuples_inserted: number;
  tuples_updated: number;
  tuples_deleted: number;
  block_hits: number;
  block_reads: number;
  deadlocks: number;
  db_size: number;
  temp_files: number;
  temp_bytes: number;
}

export interface MetricsHistory {
  snapshots: MetricSnapshot[];
  max_points: number;
  interval_seconds: number;
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

export interface ProcedureInput {
  language: string;
  arguments: string;
  body: string;
  replace: boolean;
}

export interface IndexInput {
  name: string;
  columns: string;
  unique: boolean;
  method: string;
  where: string;
  tablespace: string;
  fillfactor: number;
}

export interface AddColumnInput {
  name: string;
  data_type: string;
  nullable: boolean;
  default: string;
  collation: string;
}

export interface AlterColumnInput {
  new_name?: string | null;
  data_type?: string | null;
  not_null?: boolean | null;
  default?: string | null;
}

export interface ConstraintInput {
  name: string;
  type: string;
  columns: string[];
  check: string;
  ref_table: string;
  ref_columns: string[];
  on_delete: string;
  on_update: string;
  deferrable: boolean;
  exclusion: string;
}

export interface TriggerInput {
  name: string;
  timing: string;
  events: string[];
  function: string;
  for_each_row: boolean;
  when: string;
}

export interface PolicyInput {
  name: string;
  command: string;
  roles: string[];
  permissive: boolean;
  using: string;
  with_check: string;
}

export interface RuleInput {
  name: string;
  event: string;
  instead: boolean;
  where: string;
  action: string;
}

export interface Policy {
  name: string;
  command: string;
  roles: string[];
  permissive: boolean;
  using: string;
  with_check: string;
}

export interface Rule {
  name: string;
  event: string;
  instead: boolean;
  where: string;
  action: string;
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