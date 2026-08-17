import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { Fa } from '../icons';
import type { TreeNode } from '../types';

const OBJECT_KINDS: Record<string, string> = {
  table: 'table', view: 'view', matview: 'matview', sequence: 'sequence', function: 'function',
};

export default function ObjectPanel({ node, kind }: { node: TreeNode; kind: string }) {
  if (kind === 'dashboard-server') return <ServerDashboard node={node} />;
  if (kind === 'dashboard-database') return <DatabaseDashboard node={node} />;
  return <ObjectTabs node={node} />;
}

function TabBar({ tabs, active, onChange }: { tabs: { key: string; label: string; icon: string }[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className="flex shrink-0 border-t border-border bg-tab-bg">
      {tabs.map((t) => (
        <button
          key={t.key}
          className={`inline-flex cursor-pointer items-center gap-1.5 border-none border-r border-border px-4 py-1.5 text-[13px] text-[#4a5560] hover:bg-[#d7dbe1] ${
            active === t.key ? 'border-t-2 border-pg-blue bg-panel-bg font-medium text-[#1f2937]' : ''
          }`}
          onClick={() => onChange(t.key)}
          title={t.label}
        >
          <Fa name={t.icon} />
          {t.label}
        </button>
      ))}
    </div>
  );
}

interface FetchState<T> {
  loading: boolean;
  data: T | null;
  error: Error | null;
}

function useFetch<T>(fn: () => Promise<T>, deps: React.DependencyList): FetchState<T> {
  const [state, setState] = useState<FetchState<T>>({ loading: true, data: null, error: null });
  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, data: null, error: null });
    fn()
      .then((data) => !cancelled && setState({ loading: false, data, error: null }))
      .catch((error: Error) => !cancelled && setState({ loading: false, data: null, error }));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

function ObjectTabs({ node }: { node: TreeNode }) {
  const [tab, setTab] = useState('properties');
  const tabs: { key: string; label: string; icon: string }[] = [{ key: 'properties', label: 'Properties', icon: 'properties' }];
  if (node.type === 'table') {
    tabs.push({ key: 'sql', label: 'SQL', icon: 'sql' });
    tabs.push({ key: 'statistics', label: 'Statistics', icon: 'statistics' });
  } else if (OBJECT_KINDS[node.type]) {
    tabs.push({ key: 'sql', label: 'SQL', icon: 'sql' });
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border-soft bg-[#f4f6f8] px-3 py-2">
        <span className="inline-flex shrink-0 text-[#3a6ea5]"><Fa name={node.icon} /></span>
        <span className="text-sm font-medium">{node.schema ? `${node.schema}.${node.name}` : node.name}</span>
      </div>
      <div className="flex-1 overflow-auto p-3">
        {tab === 'properties' && <PropertiesView node={node} />}
        {tab === 'sql' && <SqlView node={node} />}
        {tab === 'statistics' && <StatisticsView node={node} />}
      </div>
      <TabBar tabs={tabs} active={tab} onChange={setTab} />
    </div>
  );
}

function keyValue(kv: Record<string, unknown>) {
  return (
    <table className="mb-2.5 border-collapse">
      <tbody>
        {Object.entries(kv).map(([k, v]) => (
          <tr key={k}>
            <td className="w-[180px] border-b border-[#e5e5e5] bg-[#fafafa] px-2.5 py-1 text-[13px] font-medium text-muted">{k}</td>
            <td className="border-b border-[#e5e5e5] px-2.5 py-1 text-[13px] font-mono">{v === null || v === undefined ? '' : String(v)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PropertiesView({ node }: { node: TreeNode }) {
  if (node.type === 'table') return <TableProperties node={node} />;
  if (node.type === 'column') return keyValue(columnProps(node.data as Record<string, unknown>));
  if (node.type === 'index') return keyValue(indexProps(node.data as Record<string, unknown>));
  if (node.type === 'constraint') return keyValue(constraintProps(node.data as Record<string, unknown>));
  if (node.type === 'trigger') return keyValue(triggerProps(node.data as Record<string, unknown>));
  if (node.type === 'role') return keyValue(roleProps(node.data as Record<string, unknown>));
  if (node.type === 'sequence') return keyValue(seqProps(node.data as Record<string, unknown>));
  if (node.type === 'function') return keyValue(fnProps(node.data as Record<string, unknown>));
  return keyValue({ name: node.name, type: node.type });
}

function TableProperties({ node }: { node: TreeNode }) {
  const { loading, data, error } = useFetch(
    () => api.tableDetail(node.serverId as number, node.database as string, node.schema as string, node.name as string),
    [node.key],
  );

  if (loading) return <div className="p-5 italic text-muted">Carregando...</div>;
  if (error) return <div className="p-5 text-danger">{error.message}</div>;
  if (!data) return null;

  return (
    <div>
      {keyValue({ name: data.table.name, schema: data.table.schema, owner: data.table.owner, size: data.table.size, comment: data.table.comment })}
      <h4 className="mt-3.5 mb-1.5 text-xs uppercase tracking-wide text-muted">Columns</h4>
      <DataTable
        headers={['#', 'Name', 'Type', 'Nullable', 'Default', 'PK']}
        rows={data.columns.map((c) => [c.position, c.name, c.data_type, c.nullable ? 'yes' : 'no', c.default || '', c.is_primary ? 'yes' : ''])}
      />
      <h4 className="mt-3.5 mb-1.5 text-xs uppercase tracking-wide text-muted">Indexes</h4>
      <DataTable
        headers={['Name', 'Definition', 'Unique', 'Method']}
        rows={data.indexes.map((i) => [i.name, i.columns, i.unique ? 'yes' : 'no', i.method])}
      />
      <h4 className="mt-3.5 mb-1.5 text-xs uppercase tracking-wide text-muted">Constraints</h4>
      <DataTable
        headers={['Name', 'Type', 'Definition']}
        rows={data.constraints.map((c) => [c.name, c.type, c.definition])}
      />
    </div>
  );
}

function SqlView({ node }: { node: TreeNode }) {
  const kind = OBJECT_KINDS[node.type];
  const { loading, data, error } = useFetch(
    () => api.objectSql(node.serverId as number, node.database as string, node.schema as string, kind, node.name as string),
    [node.key],
  );
  if (loading) return <div className="p-5 italic text-muted">Carregando...</div>;
  if (error) return <div className="p-5 text-danger">{error.message}</div>;
  return <pre className="overflow-auto whitespace-pre-wrap rounded border border-border-soft bg-[#f7f9fb] p-3 font-mono text-[13px] text-text">{data?.sql}</pre>;
}

function StatisticsView({ node }: { node: TreeNode }) {
  const { loading, data, error } = useFetch(
    () => api.tableStats(node.serverId as number, node.database as string, node.schema as string, node.name as string),
    [node.key],
  );
  if (loading) return <div className="p-5 italic text-muted">Carregando...</div>;
  if (error) return <div className="p-5 text-danger">{error.message}</div>;
  if (!data) return null;
  return (
    <DataTable
      headers={['Metric', 'Value']}
      rows={Object.entries({
        'Table size': data.size,
        'Index size': data.index_size,
        'Rows': data.rows,
        'Dead rows': data.dead_rows,
        'Seq scans': data.seq_scans,
        'Seq tuples read': data.seq_tup_read,
        'Idx scans': data.idx_scans,
        'Idx tuples fetched': data.idx_tup_fetch,
        'Inserts': data.inserts,
        'Updates': data.updates,
        'Deletes': data.deletes,
        'Last auto analyze': data.last_auto_analyze || '-',
        'Last analyze': data.last_analyze || '-',
        'Last vacuum': data.last_vacuum || '-',
      })}
    />
  );
}

function ServerDashboard({ node }: { node: TreeNode }) {
  const { loading, data, error } = useFetch(
    () => api.serverDashboard(node.serverId as number),
    [node.key],
  );
  if (loading) return <div className="p-5 italic text-muted">Carregando...</div>;
  if (error) return <div className="p-5 text-danger">{error.message}</div>;
  if (!data) return null;

  return (
    <div className="h-full overflow-auto p-3">
      <div className="mb-3.5 flex flex-wrap gap-2.5">
        <StatCard label="Versão" value={data.version} />
        <StatCard label="Conexões" value={data.total_connections} />
        <StatCard label="Máx. conexões" value={data.max_connections} />
        <StatCard label="Queries ativas" value={data.active_queries} />
      </div>
      <h4 className="mt-3.5 mb-1.5 text-xs uppercase tracking-wide text-muted">Databases</h4>
      <DataTable headers={['Name', 'Size']} rows={data.databases.map((d) => [d.name, d.size])} />
      <h4 className="mt-3.5 mb-1.5 text-xs uppercase tracking-wide text-muted">Atividade (sessões)</h4>
      <SessionsTable sessions={data.sessions} />
    </div>
  );
}

function DatabaseDashboard({ node }: { node: TreeNode }) {
  const { loading, data, error } = useFetch(
    () => api.dbDashboard(node.serverId as number, node.database as string),
    [node.key],
  );
  if (loading) return <div className="p-5 italic text-muted">Carregando...</div>;
  if (error) return <div className="p-5 text-danger">{error.message}</div>;
  if (!data) return null;

  return (
    <div className="h-full overflow-auto p-3">
      <div className="mb-3.5 flex flex-wrap gap-2.5">
        <StatCard label="Tamanho" value={data.database_size} />
        <StatCard label="Conexões" value={data.connections} />
        <StatCard label="Queries ativas" value={data.active_queries} />
        <StatCard label="Idle" value={data.idle} />
      </div>
      <h4 className="mt-3.5 mb-1.5 text-xs uppercase tracking-wide text-muted">Atividade (sessões)</h4>
      <SessionsTable sessions={data.sessions} />
    </div>
  );
}

function SessionsTable({ sessions }: { sessions: { pid: number; database: string; user: string; state: string; query: string; duration: string }[] }) {
  return (
    <DataTable
      headers={['PID', 'Database', 'User', 'State', 'Query', 'Duration']}
      rows={(sessions || []).map((s) => [s.pid, s.database, s.user, s.state, s.query, s.duration])}
    />
  );
}

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-[130px] rounded border border-border bg-panel-bg px-4 py-2.5">
      <div className="text-[22px] font-medium text-pg-blue">{value}</div>
      <div className="text-xs uppercase tracking-[0.4px] text-muted">{label}</div>
    </div>
  );
}

export function DataTable({ headers, rows, withRowNumbers }: { headers: string[]; rows: unknown[][]; withRowNumbers?: boolean }) {
  return (
    <div className="max-h-full overflow-auto border border-border bg-panel-bg">
      <table className="border-collapse text-[13px]">
        <thead><tr>{withRowNumbers && <th key="#line" className="sticky top-0 z-10 w-[44px] border border-border whitespace-nowrap bg-[#f0f2f5] px-2 py-1 text-right text-muted">#</th>}{headers.map((h) => <th key={h} className="sticky top-0 z-10 border border-border whitespace-nowrap bg-[#f0f2f5] px-2 py-1 text-left">{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-hover">
              {withRowNumbers && <td className="whitespace-nowrap border border-[#e2e5e9] bg-[#fafafa] px-2 py-1 text-right font-mono text-muted">{i + 1}</td>}
              {row.map((cell, j) => <td key={j} className="whitespace-nowrap border border-[#e2e5e9] px-2 py-1 font-mono">{cell === null || cell === undefined ? '' : String(cell)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function columnProps(c: Record<string, unknown>) {
  return { name: c.name, type: c.data_type, nullable: c.nullable ? 'yes' : 'no', default: c.default || '', primary_key: c.is_primary ? 'yes' : 'no', position: c.position };
}
function indexProps(i: Record<string, unknown>) {
  return { name: i.name, unique: i.unique ? 'yes' : 'no', method: i.method, definition: i.columns };
}
function constraintProps(c: Record<string, unknown>) {
  return { name: c.name, type: c.type, definition: c.definition };
}
function triggerProps(t: Record<string, unknown>) {
  return { name: t.name, table: t.table, timing: t.timing, events: t.events, function: t.function, enabled: t.enabled };
}
function roleProps(r: Record<string, unknown>) {
  return { name: r.name, can_login: r.can_login ? 'yes' : 'no', superuser: r.superuser ? 'yes' : 'no', create_db: r.create_db ? 'yes' : 'no', replication: r.replication ? 'yes' : 'no', member_of: r.member_of || '', conn_limit: r.conn_limit };
}
function seqProps(s: Record<string, unknown>) {
  return { name: s.name, schema: s.schema, data_type: s.data_type, start: s.start, min: s.min, max: s.max, increment: s.increment, current: s.current, cache: s.cache };
}
function fnProps(f: Record<string, unknown>) {
  return { name: f.name, schema: f.schema, language: f.language, arguments: f.arguments, return_type: f.return_type };
}
