import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from './api';
import { ThemeProvider } from './contexts/ThemeContext';
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
import TableEditDialog from './components/Dialogs/TableEditDialog';
import RoleDialog from './components/Dialogs/RoleDialog';
import DatabaseDialog from './components/Dialogs/DatabaseDialog';
import SchemaDialog from './components/Dialogs/SchemaDialog';
import ViewDialog from './components/Dialogs/ViewDialog';
import SequenceDialog from './components/Dialogs/SequenceDialog';
import FunctionDialog from './components/Dialogs/FunctionDialog';
import ProcedureDialog from './components/Dialogs/ProcedureDialog';
import IndexDialog from './components/Dialogs/IndexDialog';
import ColumnDialog from './components/Dialogs/ColumnDialog';
import ConstraintDialog from './components/Dialogs/ConstraintDialog';
import TriggerDialog from './components/Dialogs/TriggerDialog';
import PolicyDialog from './components/Dialogs/PolicyDialog';
import RuleDialog from './components/Dialogs/RuleDialog';
import PartitionDialog from './components/Dialogs/PartitionDialog';
import TruncateDialog from './components/Dialogs/TruncateDialog';
import ExtensionDialog from './components/Dialogs/ExtensionDialog';
import GrantDialog from './components/Dialogs/GrantDialog';
import ConfirmDialog from './components/Dialogs/ConfirmDialog';
import AboutDialog from './components/Dialogs/AboutDialog';
import BackupDialog from './components/Dialogs/BackupDialog';
import RestoreDialog from './components/Dialogs/RestoreDialog';
import SearchPanel from './components/SearchPanel';
import type { AppTab, ContextAction, MenuDef, MenuId, ModalState, QueryContext, ServerGroup, StudioServer, ToolbarItem, TreeNode } from './types';
import { Fa } from './icons';

let tabSeq = 1;

const OPENABLE = [
  'table', 'view', 'matview', 'sequence', 'function', 'procedure', 'role', 'column', 'index', 'constraint', 'trigger',
  'tablespace', 'cast', 'event_trigger', 'extension', 'fdw', 'language', 'publication', 'subscription',
  'aggregate', 'collation', 'domain', 'foreign_table', 'fts_configuration', 'fts_dictionary', 'fts_parser',
  'fts_template', 'operator', 'synonym', 'type', 'rule', 'partition', 'rls_policy',
];

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
  const importInputRef = useRef<HTMLInputElement | null>(null);

  const [queryServerId, setQueryServerId] = useState('');
  const [queryDatabase, setQueryDatabase] = useState('');
  const [queryDatabases, setQueryDatabases] = useState<{ name: string; size: string }[]>([]);
  const [queryRunning, setQueryRunning] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const queryRefs = useRef<Record<string, QueryToolHandle>>({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInitialQuery, setSearchInitialQuery] = useState('');

  const activeQueryTab = tabs.find((t) => t.id === activeTab && t.kind === 'query');

  const searchContext = useMemo(() => {
    const activeTabObj = tabs.find((t) => t.id === activeTab);
    if (activeTabObj) {
      if (activeTabObj.kind === 'query') {
        const c = activeTabObj.context;
        if (c?.serverId != null && c.database) return { serverId: c.serverId, database: c.database };
      } else {
        const n = activeTabObj.node;
        if (n?.serverId != null && n.database) return { serverId: n.serverId, database: n.database };
      }
    }
    return { serverId: context.serverId, database: context.database };
  }, [tabs, activeTab, context]);

  const updateQueryTabContext = (tabId: string, context: QueryContext) => {
    setTabs((ts) => ts.map((t) => (t.id === tabId && t.kind === 'query' ? { ...t, context } : t)));
  };

  useEffect(() => {
    if (!activeQueryTab) return;
    const serverId = activeQueryTab.context?.serverId;
    setQueryServerId(serverId != null ? String(serverId) : '');
    setQueryDatabase(activeQueryTab.context?.database ?? '');
  }, [activeQueryTab?.id, activeQueryTab?.context?.serverId, activeQueryTab?.context?.database]);

  useEffect(() => {
    let cancelled = false;
    if (!queryServerId) {
      setQueryDatabases([]);
      setQueryDatabase('');
      return () => { cancelled = true; };
    }

    api.databases(Number(queryServerId))
      .then((dbs) => {
        if (cancelled) return;
        setQueryDatabases(dbs);
        setQueryDatabase((prev) => {
          if (prev && dbs.some((d) => d.name === prev)) return prev;
          return dbs[0]?.name || '';
        });
      })
      .catch(() => {
        if (!cancelled) setQueryDatabases([]);
      });

    return () => { cancelled = true; };
  }, [queryServerId]);

  useEffect(() => {
    if (!activeQueryTab || !queryDatabase) return;
    if (activeQueryTab.context?.database !== queryDatabase) {
      updateQueryTabContext(activeQueryTab.id, { serverId: activeQueryTab.context?.serverId ?? null, database: queryDatabase });
    }
  }, [activeQueryTab?.id, queryDatabase]);

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

  const openQueryTool = (opts?: { initialQuery?: string; title?: string }) => {
    const ctx: QueryContext = { serverId: context.serverId || (servers[0]?.id ?? null), database: context.database || null };
    openTab({ id: `query:${tabSeq++}`, title: opts?.title || 'Query Tool', kind: 'query', context: ctx, ...(opts?.initialQuery ? { initialQuery: opts.initialQuery } : {}) });
  };

  const setActiveQueryServer = (serverId: string) => {
    if (!activeQueryTab) return;
    const nextServerId = serverId ? Number(serverId) : null;
    const nextContext: QueryContext = {
      serverId: nextServerId,
      database: nextServerId === activeQueryTab.context?.serverId ? activeQueryTab.context?.database : null,
    };
    updateQueryTabContext(activeQueryTab.id, nextContext);
    setQueryServerId(serverId);
    setQueryDatabase(nextContext.database ?? '');
  };

  const setActiveQueryDatabase = (database: string) => {
    if (!activeQueryTab) return;
    updateQueryTabContext(activeQueryTab.id, { serverId: activeQueryTab.context?.serverId ?? null, database });
    setQueryDatabase(database);
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

  const handleAction = useCallback((action: ContextAction) => {
    const { serverId, database, schema, name, nodeType, table } = action;
    const refresh = () => {
      loadData();
      setRefreshKey((k) => k + 1);
    };
    switch (action.kind) {
      case 'edit-server':
        if (serverId != null) {
          const s = servers.find((x) => x.id === serverId);
          if (s) setModal({ type: 'connect', server: s });
        }
        break;
      case 'create-server':
        setModal({ type: 'connect', groupId: action.groupId ?? null });
        break;
      case 'rename-group':
        if (action.groupId != null) {
          const g = groups.find((x) => x.id === action.groupId);
          if (g) setModal({ type: 'group', group: g });
        }
        break;
      case 'delete-server':
        if (serverId != null) {
          setModal({
            type: 'confirm', title: 'Deletar servidor', danger: true,
            message: `Deseja realmente deletar o servidor "${name}"?`,
            confirmLabel: 'Deletar',
            onConfirm: async () => { await api.deleteServer(serverId); refresh(); },
          });
        }
        break;
      case 'delete-group':
        setModal({
          type: 'confirm', title: 'Deletar grupo', danger: true,
          message: `Deseja realmente deletar o grupo "${name}"?`,
          confirmLabel: 'Deletar',
          onConfirm: async () => {
            const g = groups.find((x) => x.name === name);
            if (g) await api.deleteGroup(g.id);
            refresh();
          },
        });
        break;
      case 'dashboard-server':
        if (serverId != null) {
          handleSelect({ key: `dash-server:${serverId}`, type: 'server', label: servers.find((x) => x.id === serverId)?.name || String(serverId), icon: 'server', loadable: false, serverId });
        }
        break;
      case 'dashboard-database':
        if (serverId != null && database) {
          handleSelect({ key: `dash-db:${serverId}:${database}`, type: 'database', label: database, icon: 'database', loadable: false, serverId, database });
        }
        break;
      case 'create-database':
        if (serverId != null) setModal({ type: 'database', serverId });
        break;
      case 'create-role':
        if (serverId != null) {
          setContext({ serverId, database: database ?? null, schema: schema ?? null });
          setModal({ type: 'role' });
        }
        break;
      case 'drop-database':
        if (serverId != null && database) {
          setModal({
            type: 'confirm', title: 'Deletar database', danger: true,
            message: `Deseja realmente deletar o database "${database}"?`,
            confirmLabel: 'Deletar',
            onConfirm: async () => { await api.dropDatabase(serverId, database, true); refresh(); },
          });
        }
        break;
      case 'create-schema':
        if (serverId != null && database) setModal({ type: 'schema', serverId, database });
        break;
      case 'drop-schema':
        if (serverId != null && database && schema) {
          setModal({
            type: 'confirm', title: 'Deletar schema', danger: true,
            message: `Deseja realmente deletar o schema "${schema}"?`,
            confirmLabel: 'Deletar',
            onConfirm: async () => { await api.dropSchema(serverId, database, schema, true); refresh(); },
          });
        }
        break;
      case 'create-table':
        if (serverId != null && database) {
          setContext({ serverId, database: database ?? null, schema: schema ?? null });
          setModal({ type: 'table' });
        }
        break;
      case 'edit-table':
        if (serverId != null && database && schema && name) {
          setModal({ type: 'table-edit', serverId, database, schema, table: name });
        }
        break;
      case 'drop-table':
        if (serverId != null && database && schema && name) {
          setModal({
            type: 'confirm', title: 'Deletar tabela', danger: true,
            message: `Deseja realmente deletar a tabela "${schema}.${name}"?`,
            confirmLabel: 'Deletar',
            onConfirm: async () => { await api.delete<void>(`/servers/${serverId}/databases/${encodeURIComponent(database)}/schemas/${encodeURIComponent(schema)}/tables/${encodeURIComponent(name)}`); refresh(); },
          });
        }
        break;
      case 'view-data':
        if (serverId != null && database && schema && name) {
          openTab({ id: `data:${serverId}:${database}:${schema}:${name}`, title: name, kind: 'object', node: { key: `data:${serverId}:${database}:${schema}:${name}`, type: 'table', label: name, icon: 'table', loadable: false, serverId, database, schema, name } });
        }
        break;
      case 'truncate':
        if (serverId != null && database && schema && name) {
          setModal({ type: 'truncate', serverId, database, schema, table: name });
        }
        break;
      case 'reindex-index':
        if (serverId != null && database && schema && name) {
          setStatus(`REINDEX em ${schema}.${name}...`);
          api.reindexIndex(serverId, database, schema, name).then(() => setStatus('REINDEX concluído')).catch((e) => setStatus(e.message));
        }
        break;
      case 'add-partition':
        if (serverId != null && database && schema && table) setModal({ type: 'partition-add', serverId, database, schema, table });
        break;
      case 'attach-partition':
        if (serverId != null && database && schema && table) setModal({ type: 'partition-attach', serverId, database, schema, table });
        break;
      case 'detach-partition':
        if (serverId != null && database && schema && name && table) {
          setModal({
            type: 'confirm', title: 'Desanexar partição', danger: true,
            message: `Deseja realmente desanexar a partição "${name}" da tabela "${schema}.${table}"?`,
            confirmLabel: 'Detach',
            onConfirm: async () => { await api.detachPartition(serverId, database, schema, table, name); refresh(); },
          });
        }
        break;
      case 'reindex':
        if (serverId != null && database && schema && name) {
          setStatus(`REINDEX em ${schema}.${name}...`);
          api.reindexTable(serverId, database, schema, name).then(() => setStatus('REINDEX concluído')).catch((e) => setStatus(e.message));
        }
        break;
      case 'analyze-table':
        if (serverId != null && database && schema && name) {
          setStatus(`ANALYZE em ${schema}.${name}...`);
          api.analyzeTable(serverId, database, schema, name).then(() => setStatus('ANALYZE concluído')).catch((e) => setStatus(e.message));
        }
        break;
      case 'analyze-database':
        if (serverId != null && database) {
          setStatus(`ANALYZE no banco ${database}...`);
          api.analyzeDatabase(serverId, database).then(() => setStatus('ANALYZE no banco concluído')).catch((e) => setStatus(e.message));
        }
        break;
      case 'count-rows':
        if (serverId != null && database && schema && name) {
          api.countTableRows(serverId, database, schema, name).then((r) => setStatus(`Linhas em ${schema}.${name}: ${r.count}`)).catch((e) => setStatus(e.message));
        }
        break;
      case 'refresh-matview':
        if (serverId != null && database && schema && name) {
          api.refreshMatView(serverId, database, schema, name, true).then(() => setStatus(`Matview ${name} atualizada`)).catch((e) => setStatus(e.message));
        }
        break;
      case 'create-view':
        if (serverId != null && database && schema) setModal({ type: 'view', serverId, database, schema, kind: 'view' });
        break;
      case 'create-matview':
        if (serverId != null && database && schema) setModal({ type: 'view', serverId, database, schema, kind: 'matview' });
        break;
      case 'create-sequence':
        if (serverId != null && database && schema) setModal({ type: 'sequence', serverId, database, schema });
        break;
      case 'create-function':
        if (serverId != null && database && schema) setModal({ type: 'function', serverId, database, schema });
        break;
      case 'create-procedure':
        if (serverId != null && database && schema) setModal({ type: 'procedure', serverId, database, schema });
        break;
      case 'create-trigger-function':
        if (serverId != null && database && schema) setModal({ type: 'function', serverId, database, schema, initialReturnType: 'trigger', title: 'Nova Trigger Function' });
        break;
      case 'create-index':
        if (serverId != null && database && schema && name) setModal({ type: 'index', serverId, database, schema, table: name });
        break;
      case 'edit-index':
        if (serverId != null && database && schema && name && table) setModal({ type: 'index-edit', serverId, database, schema, table, index: name });
        break;
      case 'create-column':
        if (serverId != null && database && schema && table) setModal({ type: 'column', serverId, database, schema, table });
        break;
      case 'edit-column':
        if (serverId != null && database && schema && name && table) setModal({ type: 'column', serverId, database, schema, table, column: name });
        break;
      case 'drop-column':
        if (serverId != null && database && schema && name && table) {
          setModal({
            type: 'confirm', title: 'Deletar coluna', danger: true,
            message: `Deseja realmente deletar a coluna "${name}" da tabela "${schema}.${table}"?`,
            confirmLabel: 'Deletar',
            onConfirm: async () => { await api.dropColumn(serverId, database, schema, table, name, true); refresh(); },
          });
        }
        break;
      case 'create-constraint':
        if (serverId != null && database && schema && table) setModal({ type: 'constraint', serverId, database, schema, table });
        break;
      case 'edit-constraint':
        if (serverId != null && database && schema && name && table) setModal({ type: 'constraint', serverId, database, schema, table, constraint: name });
        break;
      case 'drop-constraint':
        if (serverId != null && database && schema && name && table) {
          setModal({
            type: 'confirm', title: 'Deletar constraint', danger: true,
            message: `Deseja realmente deletar a constraint "${name}" da tabela "${schema}.${table}"?`,
            confirmLabel: 'Deletar',
            onConfirm: async () => { await api.dropConstraint(serverId, database, schema, table, name, true); refresh(); },
          });
        }
        break;
      case 'create-trigger':
        if (serverId != null && database && schema && table) setModal({ type: 'trigger', serverId, database, schema, table });
        break;
      case 'edit-trigger':
        if (serverId != null && database && schema && name && table) setModal({ type: 'trigger', serverId, database, schema, table, trigger: name });
        break;
      case 'drop-trigger':
        if (serverId != null && database && schema && name && table) {
          setModal({
            type: 'confirm', title: 'Deletar trigger', danger: true,
            message: `Deseja realmente deletar o trigger "${name}" da tabela "${schema}.${table}"?`,
            confirmLabel: 'Deletar',
            onConfirm: async () => { await api.dropTrigger(serverId, database, schema, table, name); refresh(); },
          });
        }
        break;
      case 'enable-trigger':
        if (serverId != null && database && schema && name && table) {
          api.enableTrigger(serverId, database, schema, table, name).then(() => setStatus(`Trigger ${name} habilitado`)).catch((e) => setStatus(e.message));
        }
        break;
      case 'disable-trigger':
        if (serverId != null && database && schema && name && table) {
          api.disableTrigger(serverId, database, schema, table, name).then(() => setStatus(`Trigger ${name} desabilitado`)).catch((e) => setStatus(e.message));
        }
        break;
      case 'create-policy':
        if (serverId != null && database && schema && table) setModal({ type: 'policy', serverId, database, schema, table });
        break;
      case 'edit-policy':
        if (serverId != null && database && schema && name && table) setModal({ type: 'policy', serverId, database, schema, table, policy: name });
        break;
      case 'drop-policy':
        if (serverId != null && database && schema && name && table) {
          setModal({
            type: 'confirm', title: 'Deletar policy', danger: true,
            message: `Deseja realmente deletar a policy "${name}" da tabela "${schema}.${table}"?`,
            confirmLabel: 'Deletar',
            onConfirm: async () => { await api.dropPolicy(serverId, database, schema, table, name); refresh(); },
          });
        }
        break;
      case 'create-rule':
        if (serverId != null && database && schema && table) setModal({ type: 'rule', serverId, database, schema, table });
        break;
      case 'edit-rule':
        if (serverId != null && database && schema && name && table) setModal({ type: 'rule', serverId, database, schema, table, rule: name });
        break;
      case 'drop-rule':
        if (serverId != null && database && schema && name && table) {
          setModal({
            type: 'confirm', title: 'Deletar rule', danger: true,
            message: `Deseja realmente deletar a rule "${name}" da tabela "${schema}.${table}"?`,
            confirmLabel: 'Deletar',
            onConfirm: async () => { await api.dropRule(serverId, database, schema, table, name); refresh(); },
          });
        }
        break;
      case 'create-extension':
        if (serverId != null && database) setModal({ type: 'extension', serverId, database });
        break;
      case 'drop-procedure':
        if (serverId != null && database && name) {
          setModal({
            type: 'confirm', title: 'Deletar procedure', danger: true,
            message: `Deseja realmente deletar a procedure "${schema ? schema + '.' : ''}${name}"?`,
            confirmLabel: 'Deletar',
            onConfirm: async () => { await api.dropProcedure(serverId, database, schema || 'public', name); refresh(); },
          });
        }
        break;
      case 'drop-view':
      case 'drop-matview':
      case 'drop-sequence':
      case 'drop-function':
      case 'drop-index':
      case 'drop-extension':
        if (serverId != null && database && name) {
          setModal({
            type: 'confirm', title: 'Deletar objeto', danger: true,
            message: `Deseja realmente deletar "${schema ? schema + '.' : ''}${name}"?`,
            confirmLabel: 'Deletar',
            onConfirm: async () => {
              const kinds: Record<string, string> = { 'drop-view': 'view', 'drop-matview': 'matview', 'drop-sequence': 'sequence', 'drop-function': 'function', 'drop-index': 'index', 'drop-extension': 'extension' };
              const kind = kinds[action.kind];
              const urlMap: Record<string, string> = {
                view: `/servers/${serverId}/databases/${encodeURIComponent(database)}/schemas/${encodeURIComponent(schema || 'public')}/views/${encodeURIComponent(name)}?cascade=true`,
                matview: `/servers/${serverId}/databases/${encodeURIComponent(database)}/schemas/${encodeURIComponent(schema || 'public')}/matviews/${encodeURIComponent(name)}?cascade=true`,
                sequence: `/servers/${serverId}/databases/${encodeURIComponent(database)}/schemas/${encodeURIComponent(schema || 'public')}/sequences/${encodeURIComponent(name)}`,
                function: `/servers/${serverId}/databases/${encodeURIComponent(database)}/schemas/${encodeURIComponent(schema || 'public')}/functions/${encodeURIComponent(name)}`,
                index: `/servers/${serverId}/databases/${encodeURIComponent(database)}/schemas/${encodeURIComponent(schema || 'public')}/indexes/${encodeURIComponent(name)}`,
                extension: `/servers/${serverId}/databases/${encodeURIComponent(database)}/extensions/${encodeURIComponent(name)}`,
              };
              await api.delete<void>(urlMap[kind]);
              refresh();
            },
          });
        }
        break;
      case 'drop-role':
        if (serverId != null && name) {
          setModal({
            type: 'confirm', title: 'Deletar role', danger: true,
            message: `Deseja realmente deletar o role "${name}"?`,
            confirmLabel: 'Deletar',
            onConfirm: async () => { await api.dropRole(serverId, name); refresh(); },
          });
        }
        break;
      case 'grants':
        if (serverId != null && database) {
          setModal({ type: 'grants', serverId, database, objectKind: nodeType === 'schema' ? 'schema' : nodeType === 'database' ? 'database' : undefined, objectName: nodeType === 'schema' ? name : nodeType === 'database' ? database : undefined, schema });
        }
        break;
      case 'backup':
        if (serverId != null && database) {
          setModal({ type: 'backup', serverId, database, table: nodeType === 'table' ? `${schema || 'public'}.${name}` : null });
        }
        break;
      case 'restore':
        if (serverId != null && database) {
          setModal({ type: 'restore', serverId, database });
        }
        break;
      case 'search':
        setSearchInitialQuery(name ?? '');
        setSearchOpen(true);
        break;
      case 'open-object':
        if (serverId != null && name) {
          handleSelect({
            key: `obj:${serverId}:${database}:${schema}:${nodeType}:${name}`,
            type: nodeType || 'object', label: name, icon: nodeType || 'object', loadable: false,
            serverId, database: database ?? undefined, schema: schema ?? undefined, name,
          });
        }
        break;
      case 'drop-catalog-object':
        if (serverId != null && name) {
          setModal({
            type: 'confirm', title: `Deletar ${nodeType || 'objeto'}`, danger: true,
            message: `Deseja realmente deletar "${name}"?`,
            confirmLabel: 'Deletar',
            onConfirm: async () => {
              if (nodeType === 'tablespace') {
                await api.delete<void>(`/servers/${serverId}/tablespaces/${encodeURIComponent(name)}`);
              } else if (database) {
                const base = `/servers/${serverId}/databases/${encodeURIComponent(database)}`;
                const url = schema
                  ? `${base}/schemas/${encodeURIComponent(schema)}/objects/${nodeType}/${encodeURIComponent(name)}`
                  : `${base}/objects/${nodeType}/${encodeURIComponent(name)}`;
                await api.delete<void>(url);
              }
              refresh();
            },
          });
        }
        break;
      case 'create-script':
        if (serverId != null && database && name) {
          api.objectSql(serverId, database, schema || 'public', nodeType || 'schema', name)
            .then((r) => {
              const ctx: QueryContext = { serverId, database };
              openTab({ id: `query:${tabSeq++}`, title: `CREATE ${name}`, kind: 'query', context: ctx, initialQuery: r.sql });
            })
            .catch((e) => setStatus(e.message));
        }
        break;
      case 'refresh':
        refresh();
        break;
      default:
        break;
    }
  }, [servers, groups, loadData, context]);

  const doSearch = (q?: string) => {
    setSearchInitialQuery(q ?? '');
    setSearchOpen(true);
  };

  const exportServers = async () => {
    try {
      const servers = await api.exportServers();
      const blob = new Blob([JSON.stringify(servers, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'servers.json';
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setStatus((err as Error).message);
    }
  };

  const importServers = async (file: File) => {
    try {
      await api.importServers(file);
      await loadData();
      setStatus('Servidores importados com sucesso.');
    } catch (err) {
      setStatus((err as Error).message);
    }
  };

  const onImportInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await importServers(file);
  };

  const menuItems: MenuDef[] = useMemo(() => [
    {
      id: 'file',
      label: 'File',
      items: [
        { label: 'New Server...', icon: 'server', onClick: () => setModal({ type: 'connect' }) },
        { label: 'New Server Group...', icon: 'group', onClick: () => setModal({ type: 'group' }) },
        { sep: true },
        { label: 'Export Servers...', icon: 'download', onClick: exportServers },
        { label: 'Import Servers...', icon: 'upload', onClick: () => importInputRef.current?.click() },
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
    <ThemeProvider>
    <div className="flex h-screen flex-col">
      <Header version="v0.3.0" />
      <MenuBar items={menuItems} openMenu={openMenu} onOpenMenu={setOpenMenu} />
      <Toolbar items={toolbar} />

      <div className="flex min-h-0 flex-1">
        <aside style={{ width: sidebarWidth }} className="flex shrink-0 flex-col overflow-auto border-r border-border bg-panel-bg">
          <BrowserPanel
            servers={servers}
            groups={groups}
            selectedKey={selectedKey}
            refreshKey={refreshKey}
            onSelect={handleSelect}
            onManageServer={(srv) => setModal({ type: 'connect', server: srv })}
            onRefresh={loadData}
            onAction={handleAction}
          />
          <button
            className="flex h-9 shrink-0 cursor-pointer items-center justify-center gap-2 border-t border-border bg-[#f4f6f8] px-2 text-muted hover:text-text"
            onClick={() => doSearch()}
            title="Buscar objetos na aba em foco"
          >
            <Fa name="search" />
          </button>
        </aside>
        <div
          className={`w-[5px] shrink-0 cursor-col-resize border-r border-border bg-panel-bg ${resizing ? 'bg-pg-blue' : 'hover:bg-pg-blue'}`}
          onMouseDown={() => setResizing(true)}
          title="Arraste para redimensionar"
        />

        <section className="flex min-w-0 flex-1 flex-col bg-pg-bg">
          <input
            ref={importInputRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={onImportInputChange}
          />
          {activeQueryTab && (
            <QueryToolbar
              servers={servers}
              serverId={queryServerId}
              onServerChange={setActiveQueryServer}
              databases={queryDatabases}
              database={queryDatabase}
              onDatabaseChange={setActiveQueryDatabase}
              running={queryRunning}
              onExecute={() => activeTab && queryRefs.current[activeTab]?.run('execute')}
              onExplain={() => activeTab && queryRefs.current[activeTab]?.run('explain')}
              onExplainAnalyze={() => activeTab && queryRefs.current[activeTab]?.run('explain-analyze')}
              onFormat={() => activeTab && queryRefs.current[activeTab]?.format()}
              onGotoLine={() => activeTab && queryRefs.current[activeTab]?.gotoLine()}
              onToggleComment={() => activeTab && queryRefs.current[activeTab]?.toggleComment()}
              onUppercase={() => activeTab && queryRefs.current[activeTab]?.uppercase()}
              onLowercase={() => activeTab && queryRefs.current[activeTab]?.lowercase()}
              onClear={() => activeTab && queryRefs.current[activeTab]?.clear()}
              onToggleHistory={() => activeTab && queryRefs.current[activeTab]?.toggleHistory()}
              onNew={() => activeTab && queryRefs.current[activeTab]?.newFile()}
              onOpen={() => activeTab && queryRefs.current[activeTab]?.openFile()}
              onSave={() => activeTab && queryRefs.current[activeTab]?.saveFile()}
              onSaveAs={() => activeTab && queryRefs.current[activeTab]?.saveFileAs()}
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
                        initialQuery={t.initialQuery}
                        onServerChange={setActiveQueryServer}
                        onDatabaseChange={setActiveQueryDatabase}
                        onRunningChange={setQueryRunning}
                        onTitleChange={(title) => setTabs((ts) => ts.map((tab) => tab.id === t.id ? { ...tab, title } : tab))}
                        onCloseRequest={closeTab}
                        tabId={t.id}
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
        <ConnectDialog server={modal.server} groupId={modal.groupId ?? null} groups={groups} onSaved={() => { loadData(); }} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'group' && (
        <GroupDialog group={modal.group} onSaved={loadData} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'table' && (
        <CreateTableDialog serverId={context.serverId} database={context.database} schema={context.schema} onSaved={loadData} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'table-edit' && (
        <TableEditDialog serverId={modal.serverId} database={modal.database} schema={modal.schema} table={modal.table} onSaved={() => setRefreshKey((k) => k + 1)} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'role' && (
        <RoleDialog serverId={context.serverId} role={modal.role} onSaved={loadData} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'about' && (
        <AboutDialog onClose={() => setModal(null)} />
      )}
      {modal?.type === 'database' && (
        <DatabaseDialog serverId={modal.serverId} onSaved={() => { loadData(); setRefreshKey((k) => k + 1); }} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'schema' && (
        <SchemaDialog serverId={modal.serverId} database={modal.database} onSaved={() => { loadData(); setRefreshKey((k) => k + 1); }} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'view' && (
        <ViewDialog serverId={modal.serverId} database={modal.database} schema={modal.schema} kind={modal.kind} onSaved={() => setRefreshKey((k) => k + 1)} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'sequence' && (
        <SequenceDialog serverId={modal.serverId} database={modal.database} schema={modal.schema} onSaved={() => setRefreshKey((k) => k + 1)} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'function' && (
        <FunctionDialog serverId={modal.serverId} database={modal.database} schema={modal.schema} initialReturnType={modal.initialReturnType} title={modal.title} onSaved={() => setRefreshKey((k) => k + 1)} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'procedure' && (
        <ProcedureDialog serverId={modal.serverId} database={modal.database} schema={modal.schema} onSaved={() => setRefreshKey((k) => k + 1)} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'index' && (
        <IndexDialog serverId={modal.serverId} database={modal.database} schema={modal.schema} table={modal.table} onSaved={() => setRefreshKey((k) => k + 1)} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'index-edit' && (
        <IndexDialog serverId={modal.serverId} database={modal.database} schema={modal.schema} table={modal.table} index={modal.index} onSaved={() => setRefreshKey((k) => k + 1)} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'column' && (
        <ColumnDialog serverId={modal.serverId} database={modal.database} schema={modal.schema} table={modal.table} column={modal.column} onSaved={() => setRefreshKey((k) => k + 1)} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'constraint' && (
        <ConstraintDialog serverId={modal.serverId} database={modal.database} schema={modal.schema} table={modal.table} constraint={modal.constraint} onSaved={() => setRefreshKey((k) => k + 1)} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'trigger' && (
        <TriggerDialog serverId={modal.serverId} database={modal.database} schema={modal.schema} table={modal.table} trigger={modal.trigger} onSaved={() => setRefreshKey((k) => k + 1)} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'policy' && (
        <PolicyDialog serverId={modal.serverId} database={modal.database} schema={modal.schema} table={modal.table} policy={modal.policy} onSaved={() => setRefreshKey((k) => k + 1)} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'rule' && (
        <RuleDialog serverId={modal.serverId} database={modal.database} schema={modal.schema} table={modal.table} rule={modal.rule} onSaved={() => setRefreshKey((k) => k + 1)} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'partition-add' && (
        <PartitionDialog mode="add" serverId={modal.serverId} database={modal.database} schema={modal.schema} table={modal.table} onSaved={() => setRefreshKey((k) => k + 1)} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'partition-attach' && (
        <PartitionDialog mode="attach" serverId={modal.serverId} database={modal.database} schema={modal.schema} table={modal.table} onSaved={() => setRefreshKey((k) => k + 1)} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'truncate' && (
        <TruncateDialog serverId={modal.serverId} database={modal.database} schema={modal.schema} table={modal.table} onSaved={() => setRefreshKey((k) => k + 1)} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'extension' && (
        <ExtensionDialog serverId={modal.serverId} database={modal.database} onSaved={() => setRefreshKey((k) => k + 1)} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'grants' && (
        <GrantDialog serverId={modal.serverId} database={modal.database} objectKind={modal.objectKind} objectName={modal.objectName} schema={modal.schema} onSaved={() => { setStatus('Privilégios aplicados'); }} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'backup' && (
        <BackupDialog serverId={modal.serverId} database={modal.database} table={modal.table} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'restore' && (
        <RestoreDialog serverId={modal.serverId} database={modal.database} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'confirm' && (
        <ConfirmDialog title={modal.title} message={modal.message} confirmLabel={modal.confirmLabel} danger={modal.danger} onConfirm={modal.onConfirm} onClose={() => setModal(null)} />
      )}

      <SearchPanel
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        serverId={searchContext.serverId}
        database={searchContext.database}
        initialQuery={searchInitialQuery}
        onOpenObject={handleSelect}
      />
    </div>
    </ThemeProvider>
  );
}
