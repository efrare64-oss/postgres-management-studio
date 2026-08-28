import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { Fa } from '../icons';
import DataGrid from './DataGrid';
import PerformanceView from './PerformanceView';
import type { Dependency, Dependent, TreeNode } from '../types';

const OBJECT_KINDS: Record<string, string> = {
  table: 'table', view: 'view', matview: 'matview', sequence: 'sequence', function: 'function', procedure: 'procedure',
  index: 'index',
};

const DEPENDABLE_KINDS = new Set(['table', 'view', 'matview', 'sequence', 'function', 'index', 'schema', 'role']);

export default function ObjectPanel({ node, kind }: { node: TreeNode; kind: string }) {
  if (kind === 'dashboard-server') return <ServerDashboard node={node} />;
  if (kind === 'dashboard-database') return <DatabaseDashboard node={node} />;
  if (kind === 'search') return <SearchResults node={node} />;
  return <ObjectTabs node={node} />;
}

function TabBar({ tabs, active, onChange }: { tabs: { key: string; label: string }[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className="flex shrink-0 border-t border-border bg-tab-bg">
      {tabs.map((t) => (
        <button
          key={t.key}
          className={`cursor-pointer border-none border-r border-border px-4 py-1.5 text-[13px] text-[#4a5560] hover:bg-[#d7dbe1] ${
            active === t.key ? 'border-t-2 border-pg-blue bg-panel-bg font-medium text-[#1f2937]' : ''
          }`}
          onClick={() => onChange(t.key)}
        >
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

function useFetch<T>(fn: () => Promise<T>, deps: React.DependencyList): FetchState<T> & { refresh: () => void } {
  const [state, setState] = useState<FetchState<T>>({ loading: true, data: null, error: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ loading: true, data: null, error: null });
    fn()
      .then((data) => !cancelled && setState({ loading: false, data, error: null }))
      .catch((error: Error) => !cancelled && setState({ loading: false, data: null, error }));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);
  return { ...state, refresh: () => setTick((t) => t + 1) };
}

function ObjectTabs({ node }: { node: TreeNode }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState('properties');
  const tabs: { key: string; label: string }[] = [{ key: 'properties', label: t('obj.properties') }];
  if (node.type === 'table') {
    tabs.push({ key: 'data', label: t('obj.data') });
    tabs.push({ key: 'sql', label: t('obj.sql') });
    tabs.push({ key: 'statistics', label: t('obj.statistics') });
    tabs.push({ key: 'column-stats', label: t('obj.column_stats') });
    tabs.push({ key: 'triggers', label: t('obj.triggers') });
    tabs.push({ key: 'policies', label: t('obj.policies') });
    tabs.push({ key: 'rules', label: t('obj.rules') });
  } else if (OBJECT_KINDS[node.type]) {
    tabs.push({ key: 'sql', label: t('obj.sql') });
  }
  if (DEPENDABLE_KINDS.has(node.type)) {
    tabs.push({ key: 'dependencies', label: t('obj.dependencies') });
    tabs.push({ key: 'dependents', label: t('obj.dependents') });
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border-soft bg-[#f4f6f8] px-3 py-2">
        <span className="inline-flex shrink-0 text-[#3a6ea5]"><Fa name={node.icon} /></span>
        <span className="text-sm font-medium">{node.schema ? `${node.schema}.${node.name}` : node.name}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {tab === 'properties' && <PropertiesView node={node} />}
        {tab === 'data' && (
          <div className="h-full">
            <DataGrid serverId={node.serverId as number} database={node.database as string} schema={node.schema as string} table={node.name as string} />
          </div>
        )}
        {tab === 'sql' && <SqlView node={node} />}
        {tab === 'statistics' && <StatisticsView node={node} />}
        {tab === 'column-stats' && <ColumnStatsView node={node} />}
        {tab === 'triggers' && <TriggersView node={node} />}
        {tab === 'policies' && <PoliciesView node={node} />}
        {tab === 'rules' && <RulesView node={node} />}
        {tab === 'dependencies' && <DependenciesView node={node} />}
        {tab === 'dependents' && <DependentsView node={node} />}
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
  if (node.type === 'procedure') return keyValue(procProps(node.data as Record<string, unknown>));
  const detail = (node.data as { detail?: string } | undefined)?.detail;
  return keyValue({ name: node.name, type: node.type, ...(detail ? { detail } : {}) });
}

function TableProperties({ node }: { node: TreeNode }) {
  const { t } = useTranslation();
  const { loading, data, error } = useFetch(
    () => api.tableDetail(node.serverId as number, node.database as string, node.schema as string, node.name as string),
    [node.key],
  );
  const stats = useFetch(
    () => api.tableStats(node.serverId as number, node.database as string, node.schema as string, node.name as string),
    [node.key],
  );

  if (loading) return <div className="p-5 italic text-muted">{t('obj.loading')}</div>;
  if (error) return <div className="p-5 text-danger">{error.message}</div>;
  if (!data) return null;

  return (
    <div>
      {keyValue({
        name: data.table.name,
        schema: data.table.schema,
        owner: data.table.owner,
        size: data.table.size,
        comment: data.table.comment,
        row_estimate: data.table.row_estimate,
        tablespace: data.table.tablespace,
        fillfactor: data.table.fillfactor,
        access_method: data.table.access_method,
        persistence: data.table.persistence,
        partition_key: data.table.partition_key,
        has_oids: data.table.has_oids ? 'yes' : 'no',
        indexes_size: data.table.indexes_size,
        toast_size: data.table.toast_size,
        storage_params: (data.table.storage_params || []).join(', '),
        last_analyze: stats.data?.last_analyze || '-',
        last_auto_analyze: stats.data?.last_auto_analyze || '-',
        last_vacuum: stats.data?.last_vacuum || '-',
        last_auto_vacuum: stats.data?.last_auto_vacuum || '-',
      })}
      <h4 className="mt-3.5 mb-1.5 text-xs uppercase tracking-wide text-muted">{t('object.columns')}</h4>
      <DataTable
        headers={['#', 'Name', 'Type', 'Nullable', 'Default', 'PK', 'Width', 'Precision', 'Scale', 'Storage', 'Collation']}
        rows={data.columns.map((c) => [
          c.position, c.name, c.data_type, c.nullable ? 'yes' : 'no', c.default || '', c.is_primary ? 'yes' : '',
          c.width ?? '', c.precision ?? '', c.scale ?? '', c.storage, c.collation,
        ])}
      />
      <h4 className="mt-3.5 mb-1.5 text-xs uppercase tracking-wide text-muted">{t('object.indexes')}</h4>
      <DataTable
        headers={['Name', 'Columns', 'Unique', 'Method', 'Predicate', 'Tablespace', 'Fillfactor', 'Storage Params', 'Clustered']}
        rows={data.indexes.map((i) => [
          i.name, i.columns.join(', '), i.unique ? 'yes' : 'no', i.method, i.predicate || '',
          i.tablespace, i.fillfactor, i.storage_params.join(', '), i.clustered ? 'yes' : 'no',
        ])}
      />
      <h4 className="mt-3.5 mb-1.5 text-xs uppercase tracking-wide text-muted">{t('object.constraints')}</h4>
      <DataTable
        headers={['Name', 'Type', 'Definition', 'Ref Table', 'Ref Columns', 'On Delete', 'On Update', 'Deferrable']}
        rows={data.constraints.map((c) => [
          c.name, c.type, c.definition, c.ref_table || '', (c.ref_columns || []).join(', '),
          c.on_delete || '', c.on_update || '', c.deferrable ? 'yes' : 'no',
        ])}
      />
    </div>
  );
}

function SqlView({ node }: { node: TreeNode }) {
  const { t } = useTranslation();
  const kind = OBJECT_KINDS[node.type];
  const { loading, data, error } = useFetch(
    () => api.objectSql(node.serverId as number, node.database as string, node.schema as string, kind, node.name as string),
    [node.key],
  );
  if (loading) return <div className="p-5 italic text-muted">{t('obj.loading')}</div>;
  if (error) return <div className="p-5 text-danger">{error.message}</div>;
  return <pre className="overflow-auto whitespace-pre-wrap rounded border border-border-soft bg-[#f7f9fb] p-3 font-mono text-[13px] text-text">{data?.sql}</pre>;
}

function StatisticsView({ node }: { node: TreeNode }) {
  const { t } = useTranslation();
  const { loading, data, error } = useFetch(
    () => api.tableStats(node.serverId as number, node.database as string, node.schema as string, node.name as string),
    [node.key],
  );
  if (loading) return <div className="p-5 italic text-muted">{t('obj.loading')}</div>;
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
        'Last auto vacuum': data.last_auto_vacuum || '-',
      })}
    />
  );
}

function ColumnStatsView({ node }: { node: TreeNode }) {
  const { t } = useTranslation();
  const { loading, data, error } = useFetch(
    () => api.columnStats(node.serverId as number, node.database as string, node.schema as string, node.name as string),
    [node.key],
  );
  if (loading) return <div className="p-5 italic text-muted">{t('obj.loading')}</div>;
  if (error) return <div className="p-5 text-danger">{error.message}</div>;
  if (!data || !data.length) return <div className="p-5 italic text-muted">{t('obj.no_stats')}</div>;
  return (
    <DataTable
      headers={['Column', 'Null frac', 'Avg width', 'N distinct', 'Correlation', 'Most common values', 'Most common freqs', 'Histogram bounds']}
      rows={data.map((c) => [
        c.column,
        c.null_frac.toFixed(3),
        c.avg_width,
        c.n_distinct,
        c.correlation.toFixed(3),
        c.most_common_vals.slice(0, 10).join(', '),
        c.most_common_freqs.slice(0, 10).map((f) => f.toFixed(3)).join(', '),
        c.histogram_bounds.slice(0, 10).join(', '),
      ])}
    />
  );
}

function TriggersView({ node }: { node: TreeNode }) {
  const { t } = useTranslation();
  const { loading, data, error } = useFetch(
    () => api.triggers(node.serverId as number, node.database as string, node.schema as string, node.name as string),
    [node.key],
  );
  if (loading) return <div className="p-5 italic text-muted">{t('obj.loading')}</div>;
  if (error) return <div className="p-5 text-danger">{error.message}</div>;
  if (!data || !data.length) return <div className="p-5 italic text-muted">{t('obj.no_triggers')}</div>;
  return (
    <DataTable
      headers={['Name', 'Table', 'Timing', 'Events', 'Function', 'Enabled', 'Definition']}
      rows={data.map((t) => [t.name, t.table, t.timing, t.events, t.function, t.enabled, t.definition])}
    />
  );
}

function PoliciesView({ node }: { node: TreeNode }) {
  const { t } = useTranslation();
  const { loading, data, error } = useFetch(
    () => api.policies(node.serverId as number, node.database as string, node.schema as string, node.name as string),
    [node.key],
  );
  if (loading) return <div className="p-5 italic text-muted">{t('obj.loading')}</div>;
  if (error) return <div className="p-5 text-danger">{error.message}</div>;
  if (!data || !data.length) return <div className="p-5 italic text-muted">{t('obj.no_policies')}</div>;
  return (
    <DataTable
      headers={['Name', 'Command', 'Permissive', 'Roles', 'Using', 'With Check']}
      rows={data.map((p) => [p.name, p.command, p.permissive ? 'yes' : 'no', p.roles.join(', ') || 'PUBLIC', p.using, p.with_check])}
    />
  );
}

function RulesView({ node }: { node: TreeNode }) {
  const { t } = useTranslation();
  const { loading, data, error } = useFetch(
    () => api.rules(node.serverId as number, node.database as string, node.schema as string, node.name as string),
    [node.key],
  );
  if (loading) return <div className="p-5 italic text-muted">{t('obj.loading')}</div>;
  if (error) return <div className="p-5 text-danger">{error.message}</div>;
  if (!data || !data.length) return <div className="p-5 italic text-muted">{t('obj.no_rules')}</div>;
  return (
    <DataTable
      headers={['Name', 'Event', 'Instead', 'Where', 'Action']}
      rows={data.map((r) => [r.name, r.event, r.instead ? 'yes' : 'no', r.where, r.action])}
    />
  );
}

function ServerDashboard({ node }: { node: TreeNode }) {
  const { t } = useTranslation();
  const { loading, data, error } = useFetch(
    () => api.serverDashboard(node.serverId as number),
    [node.key],
  );
  if (loading) return <div className="p-5 italic text-muted">{t('obj.loading')}</div>;
  if (error) return <div className="p-5 text-danger">{error.message}</div>;
  if (!data) return null;

  return (
    <div className="h-full overflow-auto p-3">
      <div className="mb-3.5 flex flex-wrap gap-2.5">
        <StatCard label={t('obj.version')} value={data.version} />
        <StatCard label={t('obj.connections')} value={data.total_connections} />
        <StatCard label={t('obj.max_connections')} value={data.max_connections} />
        <StatCard label={t('obj.active_queries')} value={data.active_queries} />
      </div>
      <h4 className="mt-3.5 mb-1.5 text-xs uppercase tracking-wide text-muted">Databases</h4>
      <DataTable headers={['Name', 'Size']} rows={data.databases.map((d) => [d.name, d.size])} />
      <h4 className="mt-3.5 mb-1.5 text-xs uppercase tracking-wide text-muted">{t('obj.activity')}</h4>
      <SessionsTable sessions={data.sessions} serverId={node.serverId as number} />
      {data.sessions.length > 0 && <DashboardExtras serverId={node.serverId as number} />}
    </div>
  );
}

function DatabaseDashboard({ node }: { node: TreeNode }) {
  const { t } = useTranslation();
  const { loading, data, error } = useFetch(
    () => api.dbDashboard(node.serverId as number, node.database as string),
    [node.key],
  );
  if (loading) return <div className="p-5 italic text-muted">{t('obj.loading')}</div>;
  if (error) return <div className="p-5 text-danger">{error.message}</div>;
  if (!data) return null;

  const serverId = node.serverId as number;
  const database = node.database as string;

  return (
    <div className="h-full overflow-auto p-3">
      <div className="mb-3.5 flex flex-wrap gap-2.5">
        <StatCard label={t('obj.size')} value={data.database_size} />
        <StatCard label={t('obj.connections')} value={data.connections} />
        <StatCard label={t('obj.active_queries')} value={data.active_queries} />
        <StatCard label={t('obj.idle')} value={data.idle} />
      </div>
      <h4 className="mt-3.5 mb-1.5 text-xs uppercase tracking-wide text-muted">{t('obj.activity')}</h4>
      <SessionsTable sessions={data.sessions} serverId={serverId} database={database} />
      <DashboardExtras serverId={serverId} database={database} />
    </div>
  );
}

function DashboardExtras({ serverId, database }: { serverId: number; database?: string }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<'locks' | 'settings' | 'performance'>('locks');
  const locks = useFetch(() => api.locks(serverId, database || 'postgres'), [serverId, database]);
  const settings = useFetch(() => api.settings(serverId, database || 'postgres'), [serverId, database]);

  const terminate = async (pid: number) => {
    try {
      await api.terminateSession(serverId, database || 'postgres', pid);
    } catch { /* ignore */ }
    locks.refresh();
  };

  return (
    <div className="mt-4 border-t border-border pt-2">
      <div className="flex gap-1">
        <button className={`cursor-pointer border-none border-r border-border px-3 py-1 text-[13px] hover:bg-[#d7dbe1] ${tab === 'locks' ? 'border-t-2 border-pg-blue bg-panel-bg font-medium' : ''}`} onClick={() => setTab('locks')}>
          {t('obj.locks')}
        </button>
        <button className={`cursor-pointer border-none border-r border-border px-3 py-1 text-[13px] hover:bg-[#d7dbe1] ${tab === 'settings' ? 'border-t-2 border-pg-blue bg-panel-bg font-medium' : ''}`} onClick={() => setTab('settings')}>
          {t('obj.settings')}
        </button>
        <button className={`cursor-pointer border-none border-r border-border px-3 py-1 text-[13px] hover:bg-[#d7dbe1] ${tab === 'performance' ? 'border-t-2 border-pg-blue bg-panel-bg font-medium' : ''}`} onClick={() => setTab('performance')}>
          {t('obj.performance')}
        </button>
      </div>
      <div className="mt-2">
        {tab === 'locks' && (
          locks.loading ? <div className="italic text-muted">{t('obj.loading')}</div> :
          locks.error ? <div className="text-danger">{locks.error.message}</div> :
          <DataTable
            headers={['PID', 'Database', 'User', 'Relation', 'Mode', 'Granted', 'Action']}
            rows={(locks.data || []).map((l) => [
              l.pid, l.database, l.user, l.relation, l.mode, l.granted ? 'yes' : 'no',
              React.createElement('button', { className: 'cursor-pointer border-none bg-transparent text-pg-blue', onClick: () => terminate(l.pid), title: t('obj.terminate_session') }, t('obj.terminate')),
            ])}
          />
        )}
        {tab === 'settings' && (
          settings.loading ? <div className="italic text-muted">{t('obj.loading')}</div> :
          settings.error ? <div className="text-danger">{settings.error.message}</div> :
          <DataTable
            headers={['Name', 'Value', 'Unit', 'Context', 'Description']}
            rows={(settings.data || []).map((s) => [s.name, s.value, s.unit, s.context, s.description])}
          />
        )}
        {tab === 'performance' && (
          <PerformanceView serverId={serverId} database={database || 'postgres'} />
        )}
      </div>
    </div>
  );
}

function SearchResults({ node }: { node: TreeNode }) {
  const { t } = useTranslation();
  const serverId = node.serverId as number;
  const database = node.database as string;
  const query = node.name || '';
  const { loading, data, error } = useFetch(() => api.searchObjects(serverId, database, query), [node.key]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 border-b border-border-soft bg-[#f4f6f8] px-3 py-2">
        <span className="inline-flex shrink-0 text-[#3a6ea5]"><Fa name="search" /></span>
        <span className="text-sm font-medium">{t('obj.search_header', { query })}</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-3">
        {loading ? <div className="italic text-muted">{t('obj.searching')}</div> :
         error ? <div className="text-danger">{error.message}</div> :
         !data || !data.length ? <div className="italic text-muted">{t('obj.no_search_results')}</div> :
         <DataTable headers={['Schema', 'Name', 'Kind', 'Detail']} rows={(data || []).map((o) => [o.schema, o.name, o.kind, o.detail])} />}
      </div>
    </div>
  );
}

function SessionsTable({ sessions, serverId, database }: { sessions: { pid: number; database: string; user: string; state: string; query: string; duration: string }[]; serverId?: number; database?: string }) {
  const { t } = useTranslation();
  const runAction = async (pid: number, terminate: boolean) => {
    if (!serverId) return;
    try {
      if (terminate) await api.terminateSession(serverId, database || 'postgres', pid);
      else await api.cancelSession(serverId, database || 'postgres', pid);
    } catch { /* ignore */ }
    window.setTimeout(() => window.dispatchEvent(new Event('pms-refresh-dashboard')), 500);
  };

  return (
    <DataTable
      headers={serverId ? ['PID', 'Database', 'User', 'State', 'Query', 'Duration', 'Action'] : ['PID', 'Database', 'User', 'State', 'Query', 'Duration']}
      rows={(sessions || []).map((s) => serverId
        ? [s.pid, s.database, s.user, s.state, s.query, s.duration,
           React.createElement('span', { className: 'flex gap-1' },
             React.createElement('button', { className: 'cursor-pointer border-none bg-transparent text-pg-blue', onClick: () => runAction(s.pid, false), title: t('obj.cancel_query') }, t('obj.cancel')),
             React.createElement('button', { className: 'cursor-pointer border-none bg-transparent text-danger', onClick: () => runAction(s.pid, true), title: t('obj.terminate_session') }, t('obj.terminate')),
           )]
        : [s.pid, s.database, s.user, s.state, s.query, s.duration])}
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

export function DataTable({
  headers,
  rows,
  withRowNumbers,
  selectable,
}: {
  headers: string[];
  rows: React.ReactNode[][];
  withRowNumbers?: boolean;
  selectable?: boolean;
}) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [anchor, setAnchor] = useState<number | null>(null);
  const [copyHint, setCopyHint] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; rowIdx: number | null } | null>(null);

  const cellText = (cell: React.ReactNode): string => {
    if (cell === null || cell === undefined) return '';
    if (typeof cell === 'string' || typeof cell === 'number' || typeof cell === 'boolean') return String(cell);
    return String(cell);
  };

  const rowsAsText = (idxs: number[], includeHeader: boolean, sep: string) => {
    const lines: string[] = [];
    if (includeHeader) lines.push(headers.map((h) => h.includes(sep) ? `"${h.replace(/"/g, '""')}"` : h).join(sep));
    for (const i of idxs) {
      const row = rows[i] || [];
      lines.push(row.map((c) => {
        const s = cellText(c);
        return s.includes(sep) || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(sep));
    }
    return lines.join('\n');
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(ta);
    }
  };

  const handleCopy = async (e: KeyboardEvent) => {
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || (target as HTMLElement).isContentEditable)) {
      return;
    }
    const idxs = selected.size > 0 ? Array.from(selected).sort((a, b) => a - b) : rows.map((_, i) => i);
    const withHeader = e.shiftKey;
    const text = rowsAsText(idxs, withHeader, '\t');
    e.preventDefault();
    await copyToClipboard(text);
    setCopyHint(withHeader
      ? t('obj.copied_header', { count: idxs.length })
      : t('obj.copied', { count: idxs.length }));
    window.setTimeout(() => setCopyHint(null), 2000);
  };

  const onRowClick = (e: React.MouseEvent, idx: number) => {
    if (!selectable) return;
    if (e.shiftKey && anchor != null) {
      const lo = Math.min(anchor, idx);
      const hi = Math.max(anchor, idx);
      const next = new Set<number>();
      for (let i = lo; i <= hi; i++) next.add(i);
      setSelected(next);
    } else if (e.ctrlKey || e.metaKey) {
      const next = new Set(selected);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      setSelected(next);
      setAnchor(idx);
    } else {
      const next = new Set<number>();
      next.add(idx);
      setSelected(next);
      setAnchor(idx);
    }
  };

  const onContextMenu = (e: React.MouseEvent, rowIdx: number | null) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, rowIdx });
  };

  const handleContextAction = async (action: 'copy' | 'copyHeader') => {
    if (!contextMenu) return;
    const idxs = contextMenu.rowIdx !== null
      ? [contextMenu.rowIdx]
      : selected.size > 0
        ? Array.from(selected).sort((a, b) => a - b)
        : rows.map((_, i) => i);
    const withHeader = action === 'copyHeader';
    const text = rowsAsText(idxs, withHeader, '\t');
    await copyToClipboard(text);
    setCopyHint(withHeader
      ? t('obj.copied_header', { count: idxs.length })
      : t('obj.copied', { count: idxs.length }));
    setContextMenu(null);
    window.setTimeout(() => setCopyHint(null), 2000);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!selectable) return;
    if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
      handleCopy(e.nativeEvent);
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A')) {
      e.preventDefault();
      const next = new Set(rows.map((_, i) => i));
      setSelected(next);
    }
  };

  return (
    <div className="flex max-h-full min-h-0 flex-col" tabIndex={selectable ? 0 : -1} onKeyDown={onKeyDown} onContextMenu={(e) => onContextMenu(e, null)}>
      {selectable && copyHint && (
        <div className="shrink-0 border-b border-border bg-[#eef7ee] px-2.5 py-1 text-[12px] text-[#1a5a1a]">{copyHint}</div>
      )}
      <div className="max-h-full min-h-0 flex-1 overflow-auto border border-border bg-panel-bg">
        <table className="border-collapse text-[13px]">
          <thead><tr>{withRowNumbers && <th className="sticky top-0 z-10 w-[44px] border border-border whitespace-nowrap bg-[#f0f2f5] px-2 py-1 text-right text-muted">#</th>}{headers.map((h) => <th key={h} className="sticky top-0 z-10 border border-border whitespace-nowrap bg-[#f0f2f5] px-2 py-1 text-left">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((row, i) => {
              const isSelected = selectable && selected.has(i);
              return (
                <tr
                  key={i}
                  className={`${selectable ? 'cursor-pointer' : ''} ${isSelected ? 'bg-[#cfe0ef] hover:bg-[#cfe0ef]' : 'hover:bg-hover'}`}
                  onClick={(e) => onRowClick(e, i)}
                  onContextMenu={(e) => onContextMenu(e, i)}
                >
                  {withRowNumbers && <td className="whitespace-nowrap border border-[#e2e5e9] bg-[#fafafa] px-2 py-1 text-right font-mono text-muted">{i + 1}</td>}
                  {row.map((cell, j) => <td key={j} className="whitespace-nowrap border border-[#e2e5e9] px-2 py-1 font-mono">{cell === null || cell === undefined ? '' : cell}</td>)}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[180px] rounded border border-border bg-white py-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseLeave={() => setContextMenu(null)}
        >
          <button
            className="flex w-full cursor-pointer items-center gap-2 border-none bg-transparent px-3 py-1.5 text-left text-[13px] hover:bg-[#e8edf2]"
            onClick={() => handleContextAction('copy')}
          >
            {t('obj.copy')}
          </button>
          <button
            className="flex w-full cursor-pointer items-center gap-2 border-none bg-transparent px-3 py-1.5 text-left text-[13px] hover:bg-[#e8edf2]"
            onClick={() => handleContextAction('copyHeader')}
          >
            {t('obj.copy_with_header')}
          </button>
        </div>
      )}
      {selectable && (
        <div className="shrink-0 border-t border-border bg-[#f4f6f8] px-2.5 py-1 text-[11px] text-muted">
          {selected.size > 0 ? t('obj.rows_selected', { count: selected.size }) : t('obj.rows_total', { count: rows.length })}
          {' • '}
          {t('obj.copy_hint')}
        </div>
      )}
    </div>
  );
}

function DependenciesView({ node }: { node: TreeNode }) {
  const { t } = useTranslation();
  const schema = (node.schema as string) || '';
  const kind = node.type === 'schema' ? 'schema' : (OBJECT_KINDS[node.type] || node.type);
  const name = (node.name as string) || '';
  const { loading, data, error } = useFetch<Dependency[]>(
    () => api.dependencies(node.serverId as number, node.database as string, schema, kind, name),
    [node.key],
  );
  if (loading) return <div className="p-5 italic text-muted">{t('obj.loading')}</div>;
  if (error) return <div className="p-5 text-danger">{error.message}</div>;
  if (!data || !data.length) return <div className="p-5 italic text-muted">{t('obj.no_dependencies')}</div>;
  return (
    <DataTable
      headers={['Type', 'Schema', 'Name', 'Owner', 'Dep Type']}
      rows={data.map((d) => [d.type, d.schema || '-', d.name, d.owner || '-', d.dep_type])}
    />
  );
}

function DependentsView({ node }: { node: TreeNode }) {
  const { t } = useTranslation();
  const schema = (node.schema as string) || '';
  const kind = node.type === 'schema' ? 'schema' : (OBJECT_KINDS[node.type] || node.type);
  const name = (node.name as string) || '';
  const { loading, data, error } = useFetch<Dependent[]>(
    () => api.dependents(node.serverId as number, node.database as string, schema, kind, name),
    [node.key],
  );
  if (loading) return <div className="p-5 italic text-muted">{t('obj.loading')}</div>;
  if (error) return <div className="p-5 text-danger">{error.message}</div>;
  if (!data || !data.length) return <div className="p-5 italic text-muted">{t('obj.no_dependents')}</div>;
  return (
    <DataTable
      headers={['Type', 'Schema', 'Name', 'Owner', 'Dep Type']}
      rows={data.map((d) => [d.type, d.schema || '-', d.name, d.owner || '-', d.dep_type])}
    />
  );
}

function columnProps(c: Record<string, unknown>) {
  return {
    name: c.name, type: c.data_type, nullable: c.nullable ? 'yes' : 'no', default: c.default || '',
    primary_key: c.is_primary ? 'yes' : 'no', position: c.position, width: c.width ?? '',
    precision: c.precision ?? '', scale: c.scale ?? '', storage: c.storage || '', collation: c.collation || '',
  };
}
function indexProps(i: Record<string, unknown>) {
  return {
    name: i.name, columns: Array.isArray(i.columns) ? (i.columns as unknown[]).join(', ') : (i.columns ?? ''),
    unique: i.unique ? 'yes' : 'no', method: i.method || '', predicate: i.predicate || '',
    tablespace: i.tablespace || '', fillfactor: i.fillfactor ?? '',
    storage_params: Array.isArray(i.storage_params) ? (i.storage_params as unknown[]).join(', ') : '', clustered: i.clustered ? 'yes' : 'no',
  };
}
function constraintProps(c: Record<string, unknown>) {
  return {
    name: c.name, type: c.type, definition: c.definition, ref_table: c.ref_table || '',
    ref_columns: Array.isArray(c.ref_columns) ? (c.ref_columns as unknown[]).join(', ') : '', on_delete: c.on_delete || '',
    on_update: c.on_update || '', deferrable: c.deferrable ? 'yes' : 'no',
  };
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
function procProps(p: Record<string, unknown>) {
  return { name: p.name, schema: p.schema, language: p.language, arguments: p.arguments };
}
