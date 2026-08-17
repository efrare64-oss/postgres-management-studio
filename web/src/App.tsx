import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import Header from './components/Header';
import MenuBar from './components/MenuBar';
import Toolbar from './components/Toolbar';
import TabBar from './components/TabBar';
import StatusBar from './components/StatusBar';
import Welcome from './components/Welcome';
import BrowserPanel from './components/BrowserPanel';
import ObjectPanel from './components/ObjectPanel';
import QueryTool, { type QueryToolHandle } from './components/QueryTool';
import QueryToolbar from './components/QueryToolbar';
import ConnectDialog from './components/Dialogs/ConnectDialog';
import GroupDialog from './components/Dialogs/GroupDialog';
import CreateTableDialog from './components/Dialogs/CreateTableDialog';
import RoleDialog from './components/Dialogs/RoleDialog';
import AboutDialog from './components/Dialogs/AboutDialog';
import type { AppTab, MenuDef, MenuId, ModalState, QueryContext, ServerGroup, StudioServer, ToolbarItem, TreeNode } from './types';

let tabSeq = 1;

const OPENABLE = ['table', 'view', 'matview', 'sequence', 'function', 'role', 'column', 'index', 'constraint', 'trigger'];

export default function App() {
  const [servers, setServers] = useState<StudioServer[]>([]);
  const [groups, setGroups] = useState<ServerGroup[]>([]);
  const [tabs, setTabs] = useState<AppTab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [openMenu, setOpenMenu] = useState<MenuId>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [context, setContext] = useState<{ serverId: number | null; database: string | null; schema: string | null }>({ serverId: null, database: null, schema: null });
  const [status, setStatus] = useState('');
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [resizing, setResizing] = useState(false);

  const [queryDatabases, setQueryDatabases] = useState<{ name: string; size: string }[]>([]);
  const [queryRunning, setQueryRunning] = useState(false);
  const queryRefs = useRef<Record<string, QueryToolHandle>>({});

  const activeQueryTab = useMemo(
    () => tabs.find((t) => t.id === activeTab && t.kind === 'query') ?? null,
    [tabs, activeTab],
  );
  const queryServerId = activeQueryTab?.context?.serverId != null ? String(activeQueryTab.context.serverId) : '';
  const queryDatabase = activeQueryTab?.context?.database ?? '';

  const setQueryContext = (patch: Partial<QueryContext>) => {
    if (!activeQueryTab) return;
    setTabs((ts) => ts.map((t) => (t.id === activeQueryTab.id ? { ...t, context: { ...(t.context ?? { serverId: null, database: null }), ...patch } } : t)));
  };

  const updateTabContext = (tabId: string, patch: Partial<QueryContext>) => {
    setTabs((ts) => ts.map((t) => (t.id === tabId && t.kind === 'query' ? { ...t, context: { ...(t.context ?? { serverId: null, database: null }), ...patch } } : t)));
  };

  useEffect(() => {
    if (!queryServerId) { setQueryDatabases([]); return; }
    api.databases(Number(queryServerId))
      .then((dbs) => {
        setQueryDatabases(dbs);
        const names = dbs.map((d) => d.name);
        if (!names.includes(queryDatabase)) setQueryContext({ database: names[0] || null });
      })
      .catch(() => setQueryDatabases([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryServerId, activeQueryTab?.id]);

  useEffect(() => {
    if (!resizing) return;
    const onMove = (e: MouseEvent) => {
      setSidebarWidth((w) => Math.min(Math.max(e.clientX, 200), 560));
    };
    const onUp = () => setResizing(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [resizing]);

  const loadData = useCallback(async () => {
    try {
      const [s, g] = await Promise.all([api.servers(), api.serverGroups()]);
      setServers(s);
      setGroups(g);
      setStatus('');
    } catch (err) {
      setStatus((err as Error).message);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const updateContext = (node: TreeNode) => {
    if (node.serverId != null) {
      setContext((c) => ({
        serverId: node.serverId!,
        database: node.database ?? c.database,
        schema: node.schema ?? c.schema,
      }));
    }
  };

  const openTab = (tab: AppTab) => {
    setTabs((ts) => (ts.some((t) => t.id === tab.id) ? ts : [...ts, tab]));
    setActiveTab(tab.id);
  };

  const closeTab = (id: string) => {
    setTabs((ts) => {
      const next = ts.filter((t) => t.id !== id);
      if (activeTab === id) setActiveTab(next.length ? next[next.length - 1].id : null);
      return next;
    });
  };

  const handleSelect = (node: TreeNode) => {
    setSelectedKey(node.key);
    updateContext(node);

    if (node.type === 'server') {
      openTab({ id: `dash-server:${node.serverId}`, title: node.label, kind: 'dashboard-server', node: { ...node, serverId: node.serverId } });
    } else if (node.type === 'database') {
      openTab({ id: `dash-db:${node.serverId}:${node.database}`, title: node.label, kind: 'dashboard-database', node: { ...node } });
    } else if (node.type === 'schema') {
      openTab({
        id: `dash-schema:${node.serverId}:${node.database}:${node.schema}`,
        title: node.label,
        kind: 'dashboard-database',
        node: { key: node.key, type: 'schema', label: node.label, icon: 'schema', loadable: false, serverId: node.serverId, database: node.database, name: node.schema ?? undefined },
      });
    } else if (OPENABLE.includes(node.type)) {
      openTab({ id: `obj:${node.key}`, title: node.label, kind: 'object', node: { ...node } });
    }
  };

  const openQueryTool = () => {
    const ctx: QueryContext = { serverId: context.serverId || (servers[0]?.id ?? null), database: context.database || null };
    openTab({ id: `query:${tabSeq++}`, title: 'Query Tool', kind: 'query', context: ctx });
  };

  const openDashboard = (which: 'server' | 'database') => {
    if (which === 'server' && context.serverId != null) {
      handleSelect({ key: `dash-server:${context.serverId}`, type: 'server', label: selectedServerName(), icon: 'server', loadable: false, serverId: context.serverId });
    } else if (which === 'database' && context.serverId != null && context.database) {
      handleSelect({ key: `dash-db:${context.serverId}:${context.database}`, type: 'database', label: context.database, icon: 'database', loadable: false, serverId: context.serverId, database: context.database });
    }
  };

  const selectedServerName = () => {
    const s = servers.find((x) => x.id === context.serverId);
    return s ? s.name : '';
  };

  const menuItems: MenuDef[] = useMemo(() => [
    {
      id: 'file',
      label: 'File',
      items: [
        { label: 'New Server...', icon: 'server', onClick: () => setModal({ type: 'connect' }) },
        { label: 'New Server Group...', icon: 'group', onClick: () => setModal({ type: 'group' }) },
        { sep: true },
        { label: 'Exit', icon: 'close', onClick: () => window.close() },
      ],
    },
    {
      id: 'object',
      label: 'Object',
      items: [
        { label: 'New Table...', icon: 'table', enabled: !!context.serverId && !!context.database, onClick: () => context.serverId && context.database && setModal({ type: 'table' }) },
        { label: 'New Role...', icon: 'role', enabled: !!context.serverId, onClick: () => context.serverId && setModal({ type: 'role' }) },
        { label: 'Edit Server...', icon: 'edit', enabled: !!context.serverId, onClick: () => { const s = servers.find((x) => x.id === context.serverId); if (s) setModal({ type: 'connect', server: s }); } },
        { sep: true },
        { label: 'Refresh', icon: 'refresh', onClick: loadData },
      ],
    },
    {
      id: 'tools',
      label: 'Tools',
      items: [
        { label: 'Query Tool', icon: 'sql', onClick: openQueryTool },
        { sep: true },
        { label: 'Server Dashboard', icon: 'chart', enabled: !!context.serverId, onClick: () => openDashboard('server') },
        { label: 'Database Dashboard', icon: 'chart', enabled: !!context.serverId && !!context.database, onClick: () => openDashboard('database') },
      ],
    },
    {
      id: 'help',
      label: 'Help',
      items: [
        { label: 'About', icon: 'info', onClick: () => setModal({ type: 'about' }) },
      ],
    },
  ], [context, servers, loadData]);

  const toolbar: ToolbarItem[] = useMemo(() => [
    { key: 'new-server', icon: 'server', label: 'New Server', onClick: () => setModal({ type: 'connect' }) },
    { key: 'new-group', icon: 'group', label: 'New Group', onClick: () => setModal({ type: 'group' }) },
    { key: 'new-table', icon: 'table', label: 'New Table', enabled: !!context.serverId && !!context.database, onClick: () => context.serverId && context.database && setModal({ type: 'table' }) },
    { key: 'new-role', icon: 'role', label: 'New Role', enabled: !!context.serverId, onClick: () => context.serverId && setModal({ type: 'role' }) },
    { key: 'sep1', sep: true },
    { key: 'query', icon: 'sql', label: 'Query Tool', onClick: openQueryTool },
    { key: 'refresh', icon: 'refresh', label: 'Refresh', onClick: loadData },
  ], [context, loadData]);

  const statusText = status || (
    context.serverId
      ? `Servidor: ${selectedServerName() || context.serverId}${context.database ? ` • Banco: ${context.database}` : ''}${context.schema ? ` • Schema: ${context.schema}` : ''}`
      : 'Nenhum servidor selecionado'
  );

  return (
    <div className="flex h-screen flex-col">
      <Header version="v0.2.0" />
      <MenuBar items={menuItems} openMenu={openMenu} onOpenMenu={setOpenMenu} />
      <Toolbar items={toolbar} />

      <div className="flex min-h-0 flex-1">
        <aside style={{ width: sidebarWidth }} className="flex shrink-0 flex-col overflow-auto border-r border-border bg-panel-bg">
          <BrowserPanel
            servers={servers}
            groups={groups}
            selectedKey={selectedKey}
            onSelect={handleSelect}
            onManageServer={(srv) => setModal({ type: 'connect', server: srv })}
            onRefresh={loadData}
          />
        </aside>
        <div
          className={`w-[5px] shrink-0 cursor-col-resize border-r border-border bg-panel-bg ${resizing ? 'bg-pg-blue' : 'hover:bg-pg-blue'}`}
          onMouseDown={() => setResizing(true)}
          title="Arraste para redimensionar"
        />

        <section className="flex min-w-0 flex-1 flex-col bg-pg-bg">
          {tabs.some((t) => t.kind === 'query') && (
            <QueryToolbar
              servers={servers}
              serverId={queryServerId}
              onServerChange={(id) => setQueryContext({ serverId: id ? Number(id) : null })}
              databases={queryDatabases}
              database={queryDatabase}
              onDatabaseChange={(db) => setQueryContext({ database: db })}
              running={queryRunning}
              onExecute={() => activeTab && queryRefs.current[activeTab]?.run('execute')}
              onExplain={() => activeTab && queryRefs.current[activeTab]?.run('explain')}
              onExplainAnalyze={() => activeTab && queryRefs.current[activeTab]?.run('explain-analyze')}
              onClear={() => activeTab && queryRefs.current[activeTab]?.clear()}
              onToggleHistory={() => activeTab && queryRefs.current[activeTab]?.toggleHistory()}
            />
          )}
          {tabs.length === 0 ? (
            <Welcome />
          ) : (
            <>
              <TabBar tabs={tabs} activeTab={activeTab} onSelect={setActiveTab} onClose={closeTab} />
              <div className="relative min-h-0 flex-1">
                {tabs.map((t) => (
                  <div key={t.id} className={`absolute inset-0 h-full w-full ${activeTab === t.id ? 'flex' : 'hidden'}`}>
                    {t.kind === 'query' ? (
                      <QueryTool
                        ref={(el) => {
                          if (el) queryRefs.current[t.id] = el;
                          else delete queryRefs.current[t.id];
                        }}
                        servers={servers}
                        serverId={t.context?.serverId != null ? String(t.context.serverId) : ''}
                        database={t.context?.database ?? ''}
                        databases={queryDatabases}
                        running={queryRunning}
                        onServerChange={(id) => updateTabContext(t.id, { serverId: id ? Number(id) : null })}
                        onDatabaseChange={(db) => updateTabContext(t.id, { database: db })}
                        onRunningChange={setQueryRunning}
                      />
                    ) : (
                      <ObjectPanel node={t.node!} kind={t.kind} />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <StatusBar text={statusText} error={!!status} right={`${servers.length} servidor(es)`} />

      {modal?.type === 'connect' && (
        <ConnectDialog server={modal.server} groups={groups} onSaved={() => { loadData(); }} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'group' && (
        <GroupDialog group={modal.group} onSaved={loadData} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'table' && (
        <CreateTableDialog serverId={context.serverId} database={context.database} schema={context.schema} onSaved={loadData} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'role' && (
        <RoleDialog serverId={context.serverId} role={modal.role} onSaved={loadData} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'about' && (
        <AboutDialog onClose={() => setModal(null)} />
      )}
    </div>
  );
}
