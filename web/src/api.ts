import type {
  ActionResult, BackupOptions, CatalogObject, CompletionTable, CountResult, CSVImportResult, DataSaveResult, DatabaseDashboard,
  DatabaseInfo, Dependency, Dependent, FunctionInput, GrantInput, HistoryItem, IndexInput, Lock, QueryBatch,
  RestoreOptions, Role, SchemaInfo, SearchObject, SequenceInput, ServerDashboard, Setting, SqlText, StudioServer,
  ServerGroup, ServerExport, TableData, TableDataSave, TableDetail, TableStats, ToolBinary, Trigger,
} from './types';

interface ApiEnvelope {
  data?: unknown;
  error?: string;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } };
  if (body !== undefined) opts.body = JSON.stringify(body);

  const res = await fetch('/api' + path, opts);
  const data = (await res.json().catch(() => ({}))) as ApiEnvelope;
  if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
  return data.data as T;
}

export const api = {
  get: <T>(p: string) => request<T>('GET', p),
  post: <T>(p: string, b?: unknown) => request<T>('POST', p, b),
  put: <T>(p: string, b?: unknown) => request<T>('PUT', p, b),
  patch: <T>(p: string, b?: unknown) => request<T>('PATCH', p, b),
  delete: <T>(p: string) => request<T>('DELETE', p),

  servers: () => api.get<StudioServer[]>('/servers'),
  serverGroups: () => api.get<ServerGroup[]>('/server-groups'),
  exportServers: async () => {
    const res = await fetch('/api/servers/export');
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as ApiEnvelope;
      throw new Error(data.error || 'HTTP ' + res.status);
    }
    return (await res.json()) as ServerExport[];
  },
  importServers: async (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/servers/import', { method: 'POST', body: fd });
    const data = (await res.json().catch(() => ({}))) as ApiEnvelope;
    if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
    return data.data as StudioServer[];
  },
  testServer: (payload: Omit<StudioServer, 'id'>) => api.post<void>('/servers/test', payload),
  deleteServer: (serverId: number) => api.delete<void>(`/servers/${serverId}`),
  deleteGroup: (groupId: number) => api.delete<void>(`/server-groups/${groupId}`),
  databases: (serverId: number) => api.get<DatabaseInfo[]>(`/servers/${serverId}/databases`),
  createDatabase: (serverId: number, name: string, owner: string) =>
    api.post(`/servers/${serverId}/databases`, { name, owner }),
  dropDatabase: (serverId: number, db: string, force: boolean) =>
    api.delete<void>(`/servers/${serverId}/databases/${encodeURIComponent(db)}?force=${force}`),
  schemas: (serverId: number, db: string) =>
    api.get<SchemaInfo[]>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas`),
  createSchema: (serverId: number, db: string, name: string, owner: string) =>
    api.post(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas`, { name, owner }),
  dropSchema: (serverId: number, db: string, schema: string, cascade: boolean) =>
    api.delete<void>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}?cascade=${cascade}`),
  roles: (serverId: number) => api.get<Role[]>(`/servers/${serverId}/roles`),
  dropRole: (serverId: number, name: string) => api.delete<void>(`/servers/${serverId}/roles/${encodeURIComponent(name)}`),
  tablespaces: (serverId: number) => api.get<CatalogObject[]>(`/servers/${serverId}/tablespaces`),

  databaseObjects: (serverId: number, db: string, kind: string) =>
    api.get<CatalogObject[]>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/objects/${kind}`),
  schemaObjects: (serverId: number, db: string, schema: string, kind: string) =>
    api.get<CatalogObject[]>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/objects/${kind}`),
  tableObjects: (serverId: number, db: string, schema: string, table: string, kind: string) =>
    api.get<CatalogObject[]>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/tables/${encodeURIComponent(table)}/objects/${kind}`),
  viewObjects: (serverId: number, db: string, schema: string, view: string, kind: string) =>
    api.get<CatalogObject[]>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/views/${encodeURIComponent(view)}/objects/${kind}`),
  foreignTableObjects: (serverId: number, db: string, schema: string, table: string, kind: string) =>
    api.get<CatalogObject[]>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/foreign-tables/${encodeURIComponent(table)}/objects/${kind}`),

  tableDetail: (serverId: number, db: string, schema: string, table: string) =>
    api.get<TableDetail>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/tables/${encodeURIComponent(table)}`),
  triggers: (serverId: number, db: string, schema: string, table: string) =>
    api.get<Trigger[]>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/tables/${encodeURIComponent(table)}/triggers`),
  tableStats: (serverId: number, db: string, schema: string, table: string) =>
    api.get<TableStats>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/tables/${encodeURIComponent(table)}/statistics`),

  tableData: (serverId: number, db: string, schema: string, table: string, limit = 100, offset = 0) =>
    api.get<TableData>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/tables/${encodeURIComponent(table)}/data?limit=${limit}&offset=${offset}`),
  tableDataExportUrl: (serverId: number, db: string, schema: string, table: string) =>
    `/api/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/tables/${encodeURIComponent(table)}/data/export`,
  saveTableData: (serverId: number, db: string, schema: string, table: string, save: TableDataSave) =>
    api.post<DataSaveResult>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/tables/${encodeURIComponent(table)}/data`, save),
  importCSV: async (serverId: number, db: string, schema: string, table: string, file: File, delimiter = ',', header = true): Promise<CSVImportResult> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('delimiter', delimiter);
    fd.append('header', String(header));
    const res = await fetch(`/api/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/tables/${encodeURIComponent(table)}/data/import`, { method: 'POST', body: fd });
    const data = (await res.json().catch(() => ({}))) as ApiEnvelope;
    if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
    return data.data as CSVImportResult;
  },
  countTableRows: (serverId: number, db: string, schema: string, table: string) =>
    api.get<CountResult>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/tables/${encodeURIComponent(table)}/count`),
  truncateTable: (serverId: number, db: string, schema: string, table: string) =>
    api.post<ActionResult>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/tables/${encodeURIComponent(table)}/truncate`),
  vacuumTable: (serverId: number, db: string, schema: string, table: string) =>
    api.post<ActionResult>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/tables/${encodeURIComponent(table)}/vacuum`),
  reindexTable: (serverId: number, db: string, schema: string, table: string) =>
    api.post<ActionResult>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/tables/${encodeURIComponent(table)}/reindex`),
  analyzeTable: (serverId: number, db: string, schema: string, table: string) =>
    api.post<ActionResult>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/tables/${encodeURIComponent(table)}/analyze`),
  vacuumDatabase: (serverId: number, db: string, full = false, analyze = false) =>
    api.post<ActionResult>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/vacuum?full=${full}&analyze=${analyze}`),
  analyzeDatabase: (serverId: number, db: string) =>
    api.post<ActionResult>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/analyze`),
  refreshMatView: (serverId: number, db: string, schema: string, matview: string, withData: boolean) =>
    api.post<ActionResult>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/matviews/${encodeURIComponent(matview)}/refresh?with_data=${withData}`),

  createView: (serverId: number, db: string, schema: string, name: string, definition: string, replace: boolean) =>
    api.post(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/views`, { name, definition, replace }),
  dropView: (serverId: number, db: string, schema: string, name: string, cascade: boolean) =>
    api.delete<void>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/views/${encodeURIComponent(name)}?cascade=${cascade}`),
  createMatView: (serverId: number, db: string, schema: string, name: string, definition: string, withData: boolean) =>
    api.post(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/matviews`, { name, definition, with_data: withData }),
  dropMatView: (serverId: number, db: string, schema: string, name: string, cascade: boolean) =>
    api.delete<void>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/matviews/${encodeURIComponent(name)}?cascade=${cascade}`),
  createSequence: (serverId: number, db: string, schema: string, name: string, seq: SequenceInput) =>
    api.post(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/sequences`, { name, sequence: seq }),
  dropSequence: (serverId: number, db: string, schema: string, name: string) =>
    api.delete<void>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/sequences/${encodeURIComponent(name)}`),
  createFunction: (serverId: number, db: string, schema: string, name: string, fn: FunctionInput) =>
    api.post(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/functions`, { name, function: fn }),
  dropFunction: (serverId: number, db: string, schema: string, name: string) =>
    api.delete<void>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/functions/${encodeURIComponent(name)}`),
  createIndex: (serverId: number, db: string, schema: string, table: string, index: IndexInput) =>
    api.post(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/tables/${encodeURIComponent(table)}/indexes`, index),
  createExtension: (serverId: number, db: string, name: string, schema: string) =>
    api.post(`/servers/${serverId}/databases/${encodeURIComponent(db)}/extensions`, { name, schema }),
  dropExtension: (serverId: number, db: string, name: string) =>
    api.delete<void>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/extensions/${encodeURIComponent(name)}`),

  locks: (serverId: number, db: string) =>
    api.get<Lock[]>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/locks`),
  settings: (serverId: number, db: string) =>
    api.get<Setting[]>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/settings`),
  cancelSession: (serverId: number, db: string, pid: number) =>
    api.post(`/servers/${serverId}/databases/${encodeURIComponent(db)}/sessions/${pid}/cancel`),
  terminateSession: (serverId: number, db: string, pid: number) =>
    api.post(`/servers/${serverId}/databases/${encodeURIComponent(db)}/sessions/${pid}/terminate`),
  applyGrants: (serverId: number, db: string, grant: GrantInput) =>
    api.post(`/servers/${serverId}/databases/${encodeURIComponent(db)}/grants`, grant),
  searchObjects: (serverId: number, db: string, q: string) =>
    api.get<SearchObject[]>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/search?q=${encodeURIComponent(q)}`),

  dependencies: (serverId: number, db: string, schema: string, kind: string, name: string) =>
    api.get<Dependency[]>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/objects/${encodeURIComponent(kind)}/${encodeURIComponent(name)}/dependencies`),
  dependents: (serverId: number, db: string, schema: string, kind: string, name: string) =>
    api.get<Dependent[]>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/objects/${encodeURIComponent(kind)}/${encodeURIComponent(name)}/dependents`),

  queryHistory: () => api.get<HistoryItem[]>('/query/history'),
  clearQueryHistory: () => api.delete<void>('/query/history'),

  completionSchema: (serverId: number, db: string) =>
    api.get<CompletionTable[]>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/completion-schema`),

  objectSql: (serverId: number, db: string, schema: string, kind: string, name: string) =>
    api.get<SqlText>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/sql/${kind}/${encodeURIComponent(name)}`),

  serverDashboard: (serverId: number) => api.get<ServerDashboard>(`/servers/${serverId}/dashboard`),
  dbDashboard: (serverId: number, db: string) =>
    api.get<DatabaseDashboard>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/dashboard`),

  runQuery: (serverId: number, database: string, query: string, explain: boolean, analyze: boolean) =>
    api.post<QueryBatch>(`/servers/${serverId}/query`, { server_id: serverId, database, query, explain, analyze }),

  toolsBinaries: () => api.get<ToolBinary[]>('/tools/binaries'),

  backup: async (serverId: number, opts: BackupOptions): Promise<{ filename: string; blob: Blob }> => {
    const qs = new URLSearchParams({
      database: opts.database,
      format: opts.format,
      gzip: String(opts.gzip),
      jobs: String(opts.jobs),
      data_only: String(opts.data_only),
      schema_only: String(opts.schema_only),
      verbose: String(opts.verbose),
    });
    if (opts.filename) qs.set('filename', opts.filename);
    if (opts.schema) qs.set('schema', opts.schema);
    if (opts.table) qs.set('table', opts.table);

    const res = await fetch(`/api/servers/${serverId}/backup?` + qs.toString());
    if (!res.ok) {
      const data = await res.json().catch(() => ({})) as ApiEnvelope;
      throw new Error(data.error || 'HTTP ' + res.status);
    }
    const header = res.headers.get('Content-Disposition') || '';
    const match = /filename="?([^";]+)"?/.exec(header);
    const filename = (match && match[1]) || `${opts.database}.backup`;
    return { filename, blob: await res.blob() };
  },

  restore: async (serverId: number, opts: RestoreOptions, file: File): Promise<void> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('database', opts.database);
    fd.append('format', opts.format);
    fd.append('clean', String(opts.clean));
    fd.append('create', String(opts.create));
    fd.append('data_only', String(opts.data_only));
    fd.append('schema_only', String(opts.schema_only));
    fd.append('jobs', String(opts.jobs));
    fd.append('verbose', String(opts.verbose));

    const res = await fetch('/api/servers/' + serverId + '/restore', { method: 'POST', body: fd });
    const data = (await res.json().catch(() => ({}))) as ApiEnvelope;
    if (!res.ok) throw new Error(data.error || 'HTTP ' + res.status);
  },
};