import type {
  CompletionTable, DatabaseDashboard, DatabaseInfo, QueryBatch,
  Role, SchemaInfo, ServerDashboard, SqlText, StudioServer,
  ServerGroup, TableDetail, TableStats, Trigger,
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

  servers: () => api.get<StudioServer[]>('/servers'),
  serverGroups: () => api.get<ServerGroup[]>('/server-groups'),
  databases: (serverId: number) => api.get<DatabaseInfo[]>(`/servers/${serverId}/databases`),
  schemas: (serverId: number, db: string) =>
    api.get<SchemaInfo[]>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas`),
  roles: (serverId: number) => api.get<Role[]>(`/servers/${serverId}/roles`),

  tableDetail: (serverId: number, db: string, schema: string, table: string) =>
    api.get<TableDetail>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/tables/${encodeURIComponent(table)}`),
  triggers: (serverId: number, db: string, schema: string, table: string) =>
    api.get<Trigger[]>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/tables/${encodeURIComponent(table)}/triggers`),
  tableStats: (serverId: number, db: string, schema: string, table: string) =>
    api.get<TableStats>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/tables/${encodeURIComponent(table)}/statistics`),

  completionSchema: (serverId: number, db: string) =>
    api.get<CompletionTable[]>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/completion-schema`),

  objectSql: (serverId: number, db: string, schema: string, kind: string, name: string) =>
    api.get<SqlText>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}/sql/${kind}/${encodeURIComponent(name)}`),

  serverDashboard: (serverId: number) => api.get<ServerDashboard>(`/servers/${serverId}/dashboard`),
  dbDashboard: (serverId: number, db: string) =>
    api.get<DatabaseDashboard>(`/servers/${serverId}/databases/${encodeURIComponent(db)}/dashboard`),

  runQuery: (serverId: number, database: string, query: string, explain: boolean, analyze: boolean) =>
    api.post<QueryBatch>(`/servers/${serverId}/query`, { server_id: serverId, database, query, explain, analyze }),
};
