import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { Fa } from '../icons';
import ContextMenu, { type ContextItem, type ContextMenuState } from './ContextMenu';
import type { CatalogObject, ContextAction, ServerGroup, StudioServer, TreeNode } from '../types';

interface ObjGroup {
  type: string;
  kind: string;
  label: string;
  loadable: boolean;
  children?: ObjGroup[];
}

const DB_OBJECTS: ObjGroup[] = [
  { type: 'casts', kind: 'casts', label: 'Casts', loadable: true },
  { type: 'event_triggers', kind: 'event_triggers', label: 'Event Triggers', loadable: true },
  { type: 'extensions', kind: 'extensions', label: 'Extensions', loadable: true },
  { type: 'foreign_data_wrappers', kind: 'foreign_data_wrappers', label: 'Foreign Data Wrappers', loadable: true },
  { type: 'languages', kind: 'languages', label: 'Languages', loadable: true },
  { type: 'publications', kind: 'publications', label: 'Publications', loadable: true },
  { type: 'subscriptions', kind: 'subscriptions', label: 'Subscriptions', loadable: true },
];

const SCHEMA_OBJECTS: ObjGroup[] = [
  { type: 'aggregates', kind: 'aggregates', label: 'Aggregates', loadable: true },
  { type: 'collations', kind: 'collations', label: 'Collations', loadable: true },
  { type: 'domains', kind: 'domains', label: 'Domains', loadable: true },
  { type: 'foreign_tables', kind: 'foreign_tables', label: 'Foreign Tables', loadable: true },
  { type: 'fts_configurations', kind: 'fts_configurations', label: 'FTS Configurations', loadable: true },
  { type: 'fts_dictionaries', kind: 'fts_dictionaries', label: 'FTS Dictionaries', loadable: true },
  { type: 'fts_parsers', kind: 'fts_parsers', label: 'FTS Parsers', loadable: true },
  { type: 'fts_templates', kind: 'fts_templates', label: 'FTS Templates', loadable: true },
  { type: 'operators', kind: 'operators', label: 'Operators', loadable: true },
  { type: 'synonyms', kind: 'synonyms', label: 'Synonyms', loadable: true },
  { type: 'types', kind: 'types', label: 'Types', loadable: true },
];

const CONSTRAINT_SUBGROUPS: ObjGroup[] = [
  { type: 'constraints:check', kind: 'constraints:check', label: 'Check Constraints', loadable: true },
  { type: 'constraints:fk', kind: 'constraints:fk', label: 'Foreign Keys', loadable: true },
  { type: 'constraints:exclusion', kind: 'constraints:exclusion', label: 'Exclusion Constraints', loadable: true },
  { type: 'constraints:index', kind: 'constraints:index', label: 'Index Constraints', loadable: true },
];

const TABLE_CHILDREN: ObjGroup[] = [
  { type: 'columns', kind: 'columns', label: 'Columns', loadable: true },
  {
    type: 'constraints', kind: 'constraints', label: 'Constraints', loadable: true,
    children: CONSTRAINT_SUBGROUPS,
  },
  { type: 'indexes', kind: 'indexes', label: 'Indexes', loadable: true },
  { type: 'partitions', kind: 'partitions', label: 'Partitions', loadable: true },
  { type: 'row_security_policies', kind: 'row_security_policies', label: 'Row Security Policies', loadable: true },
  { type: 'rules', kind: 'rules', label: 'Rules', loadable: true },
  { type: 'triggers', kind: 'triggers', label: 'Triggers', loadable: true },
];

const VIEW_CHILDREN: ObjGroup[] = [
  { type: 'columns', kind: 'columns', label: 'Columns', loadable: true },
  { type: 'indexes', kind: 'indexes', label: 'Indexes', loadable: true },
  { type: 'triggers', kind: 'triggers', label: 'Triggers', loadable: true },
  { type: 'rules', kind: 'rules', label: 'Rules', loadable: true },
];

const FOREIGN_TABLE_CHILDREN: ObjGroup[] = [
  { type: 'columns', kind: 'columns', label: 'Columns', loadable: true },
  {
    type: 'constraints', kind: 'constraints', label: 'Constraints', loadable: true,
    children: CONSTRAINT_SUBGROUPS,
  },
  { type: 'indexes', kind: 'indexes', label: 'Indexes', loadable: true },
  { type: 'rules', kind: 'rules', label: 'Rules', loadable: true },
  { type: 'triggers', kind: 'triggers', label: 'Triggers', loadable: true },
];

const LEAF_TYPES: Record<string, string> = {
  columns: 'column',
  indexes: 'index',
  triggers: 'trigger',
  rules: 'rule',
  partitions: 'partition',
  row_security_policies: 'rls_policy',
  constraints: 'constraint',
  'constraints:check': 'constraint',
  'constraints:fk': 'constraint',
  'constraints:exclusion': 'constraint',
  'constraints:index': 'constraint',
  casts: 'cast',
  event_triggers: 'event_trigger',
  extensions: 'extension',
  foreign_data_wrappers: 'fdw',
  languages: 'language',
  publications: 'publication',
  subscriptions: 'subscription',
  aggregates: 'aggregate',
  collations: 'collation',
  domains: 'domain',
  foreign_tables: 'foreign_table',
  fts_configurations: 'fts_configuration',
  fts_dictionaries: 'fts_dictionary',
  fts_parsers: 'fts_parser',
  fts_templates: 'fts_template',
  operators: 'operator',
  synonyms: 'synonym',
  types: 'type',
};

const COMMON_LEAF_KINDS = new Set([
  'column', 'index', 'constraint', 'trigger', 'rule', 'partition', 'rls_policy',
  'cast', 'event_trigger', 'extension', 'fdw', 'language', 'publication', 'subscription',
  'aggregate', 'collation', 'domain', 'foreign_table', 'fts_configuration', 'fts_dictionary',
  'fts_parser', 'fts_template', 'operator', 'synonym', 'type', 'tablespace',
  'sequence', 'function', 'procedure', 'view', 'matview',
]);

const SQL_COPY_KINDS = new Set(['table', 'view', 'matview', 'sequence', 'function', 'procedure', 'type', 'domain', 'collation', 'foreign_table', 'fts_configuration', 'fts_dictionary', 'fts_parser', 'fts_template', 'language', 'publication', 'fdw', 'event_trigger']);

const SCHEMA_CATALOG_KINDS = new Set([
  'aggregate', 'collation', 'domain', 'foreign_table', 'fts_configuration', 'fts_dictionary',
  'fts_parser', 'fts_template', 'operator', 'synonym', 'type',
]);
const DATABASE_CATALOG_KINDS = new Set(['cast', 'event_trigger', 'fdw', 'language', 'publication', 'subscription']);
const DROPPABLE_CATALOG_KINDS = new Set([
  'event_trigger', 'language', 'publication', 'subscription', 'fdw',
  'collation', 'domain', 'type', 'fts_configuration', 'fts_dictionary', 'fts_parser', 'fts_template',
  'foreign_table', 'tablespace',
]);
const CATALOG_LEAF_KINDS = new Set([...SCHEMA_CATALOG_KINDS, ...DATABASE_CATALOG_KINDS, 'extension', 'tablespace']);

const FOLDER_TYPES = new Set([
  'group', 'server', 'database', 'schema',
  'databases', 'roles', 'tablespaces', 'schemas',
  'tables', 'views', 'matviews', 'sequences', 'functions', 'procedures',
  'columns', 'indexes', 'triggers', 'rules', 'row_security_policies', 'partitions',
  'constraints', 'constraints:check', 'constraints:fk', 'constraints:exclusion', 'constraints:index',
  ...DB_OBJECTS.map((g) => g.type),
  ...SCHEMA_OBJECTS.map((g) => g.type),
]);

const DATABASE_KINDS = new Set(DB_OBJECTS.map((g) => g.kind));
const SCHEMA_KINDS = new Set(SCHEMA_OBJECTS.map((g) => g.kind));

const TYPE_COLORS: Record<string, string> = {
  group: 'text-[#8a5a00]',
  server: 'text-[#3a6ea5]',
  database: 'text-[#a03a3a]',
  schema: 'text-[#5a7a2a]',
  role: 'text-[#7a3aa0]',
  table: 'text-[#2a7a2a]',
  view: 'text-[#3a6ea5]',
  matview: 'text-[#3a6ea5]',
  sequence: 'text-[#8a5a00]',
  function: 'text-[#a03a3a]',
  procedure: 'text-[#a03a3a]',
  tablespace: 'text-[#8a5a00]',
  cast: 'text-[#5a7a2a]',
  event_trigger: 'text-[#a03a3a]',
  extension: 'text-[#3a6ea5]',
  fdw: 'text-[#7a3aa0]',
  language: 'text-[#8a5a00]',
  publication: 'text-[#3a6ea5]',
  subscription: 'text-[#a03a3a]',
  aggregate: 'text-[#7a3aa0]',
  collation: 'text-[#5a7a2a]',
  domain: 'text-[#3a6ea5]',
  foreign_table: 'text-[#a03a3a]',
  fts_configuration: 'text-[#8a5a00]',
  fts_dictionary: 'text-[#5a7a2a]',
  fts_parser: 'text-[#7a3aa0]',
  fts_template: 'text-[#3a6ea5]',
  operator: 'text-[#a03a3a]',
  synonym: 'text-[#8a5a00]',
  type: 'text-[#5a7a2a]',
  column: 'text-[#7a8694]',
  index: 'text-[#3a6ea5]',
  constraint: 'text-[#a03a3a]',
  trigger: 'text-[#8a5a00]',
  rule: 'text-[#7a3aa0]',
  partition: 'text-[#5a7a2a]',
  rls_policy: 'text-[#a03a3a]',
};

function typeColor(type: string): string {
  return TYPE_COLORS[type] || 'text-[#3a6ea5]';
}

interface BrowserPanelProps {
  servers: StudioServer[];
  groups: ServerGroup[];
  selectedKey: string | null;
  refreshKey?: number;
  onSelect: (node: TreeNode) => void;
  onManageServer: (server: StudioServer) => void;
  onRefresh: () => void;
  onAction: (action: ContextAction) => void;
}

interface BuiltNode extends TreeNode {
  data?: unknown;
}

export default function BrowserPanel({ servers, groups, selectedKey, refreshKey = 0, onSelect, onManageServer, onRefresh, onAction }: BrowserPanelProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [cache, setCache] = useState<Record<string, BuiltNode[]>>({});
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const nodesRef = useRef<Record<string, BuiltNode>>({});
  const serversRef = useRef(servers);
  const groupsRef = useRef(groups);
  serversRef.current = servers;
  groupsRef.current = groups;

  useEffect(() => { setCache({}); setOpen({}); }, [refreshKey]);

  const setChildren = useCallback((key: string, children: BuiltNode[]) => {
    for (const ch of children) nodesRef.current[ch.key] = ch;
    setCache((c) => ({ ...c, [key]: children }));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const rootNode: BuiltNode = { key: 'root', type: 'root', label: 'Servers', icon: 'falcon', loadable: true };
    nodesRef.current[rootNode.key] = rootNode;
    fetchChildren(rootNode, servers, groups, setChildren)
      .then((built) => {
        if (cancelled) return;
        setChildren('root', built);
        setOpen((o) => ({ ...o, root: true }));
      })
      .catch((err) => console.error(err));
    return () => { cancelled = true; };
  }, [servers, groups, setChildren]);

  const isOpen = (key: string) => !!open[key];
  const childrenOf = (key: string) => cache[key] || [];

  const refreshNode = useCallback(async (key: string) => {
    setCache((c) => {
      const next: Record<string, BuiltNode[]> = {};
      for (const k of Object.keys(c)) if (k !== key && !k.startsWith(key + ':')) next[k] = c[k];
      return next;
    });
    setOpen((o) => {
      const next: Record<string, boolean> = { ...o };
      for (const k of Object.keys(next)) if (k !== key && k.startsWith(key + ':')) next[k] = false;
      return next;
    });
    const target = nodesRef.current[key];
    if (!target) return;
    try {
      const built = await fetchChildren(target, serversRef.current, groupsRef.current, setChildren);
      setChildren(key, built);
      setOpen((o) => ({ ...o, [key]: true }));
    } catch (err) {
      console.error(err);
    }
  }, [setChildren]);

  useEffect(() => {
    const handler = (e: Event) => {
      const key = (e as CustomEvent<{ nodeKey?: string }>).detail?.nodeKey;
      if (key) void refreshNode(key);
    };
    window.addEventListener('pgms:refresh-node', handler);
    return () => window.removeEventListener('pgms:refresh-node', handler);
  }, [refreshNode]);

  const load = useCallback(async (node: BuiltNode) => {
    const built = await fetchChildren(node, servers, groups, setChildren);
    setChildren(node.key, built);
    setOpen((o) => ({ ...o, [node.key]: true }));
  }, [servers, groups, setChildren]);

  const toggle = (node: BuiltNode) => {
    if (isOpen(node.key)) {
      setOpen((o) => ({ ...o, [node.key]: false }));
      return;
    }
    if (!childrenOf(node.key).length && node.loadable) {
      load(node).catch((err) => console.error(err));
    } else {
      setOpen((o) => ({ ...o, [node.key]: true }));
    }
  };

  const refresh = async () => {
    onRefresh();
    const root = { key: 'root', type: 'root', label: 'Servers', icon: 'falcon', loadable: true };
    try {
      const built = await fetchChildren(root, servers, groups, setChildren);
      setChildren('root', built);
      setOpen((o) => ({ ...o, root: true }));
    } catch (err) {
      console.error(err);
    }
  };

  const rootChildren = childrenOf('root');

  const openContext = (menu: ContextMenuState) => setContextMenu(menu);

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-[#eef0f3] px-2 py-1.5 font-medium">
        <span className="flex items-center gap-1.5 text-[#2f4156]"><Fa name="server" /> Servers</span>
        <div className="flex gap-1">
          <button className="inline-flex cursor-pointer rounded p-0.5 text-muted hover:bg-tb-hover hover:text-text" title="Atualizar" onClick={refresh}><Fa name="refresh" /></button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-1">
        {!rootChildren.length && (
          <button className="m-1.5 w-[calc(100%-12px)] cursor-pointer rounded border border-border bg-[#f7f7f7] p-1.5 hover:bg-[#ececec]" onClick={() => load({ key: 'root', type: 'root', label: 'Servers', icon: 'falcon', loadable: true })}>
            Carregar árvore
          </button>
        )}
        {rootChildren.map((g) => (
          <TreeNode
            key={g.key}
            node={g}
            depth={0}
            isOpen={isOpen}
            toggle={toggle}
            childrenOf={childrenOf}
            selectedKey={selectedKey}
            onSelect={onSelect}
            onManageServer={onManageServer}
            onOpenContext={openContext}
            onAction={onAction}
          />
        ))}
        {!rootChildren.length && <div className="p-5 italic text-muted">Nenhum servidor.</div>}
        {rootChildren.length > 0 && !selectedKey && <div className="px-2.5 py-2 text-xs italic text-muted">Clique em um objeto para ver propriedades.</div>}
      </div>
      {contextMenu && (
        <ContextMenu menu={contextMenu} onClose={() => setContextMenu(null)} />
      )}
    </div>
  );
}

function buildContextItems(node: BuiltNode, onAction: (a: ContextAction) => void): ContextItem[] {
  const items = baseContextItems(node, onAction);
  if (FOLDER_TYPES.has(node.type)) {
    const hasRefresh = items.some((i) => !i.sep && i.label === 'Refresh');
    if (!hasRefresh) {
      return [...items, ...(items.length ? [{ sep: true }] : []), { label: 'Refresh', icon: 'refresh', onClick: () => onAction({ kind: 'refresh' }) }];
    }
    return items;
  }
  if (!COMMON_LEAF_KINDS.has(node.type) || !node.name) return items;

  const common: ContextItem[] = items.length ? [{ sep: true }] : [];
  common.push({
    label: 'Copy Name', icon: 'copy',
    onClick: () => navigator.clipboard?.writeText(node.name as string),
  });
  if (SQL_COPY_KINDS.has(node.type)) {
    common.push({
      label: 'Scripts', icon: 'sql',
      children: [
        {
          label: 'Create Script...', icon: 'sql',
          onClick: () => onAction({ kind: 'create-script', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, nodeType: node.type }),
        },
        {
          label: 'Copy SQL', icon: 'sql',
          onClick: async () => {
            try {
              const s = await api.objectSql(node.serverId as number, node.database as string, (node.schema ?? 'public') as string, node.type, node.name as string);
              await navigator.clipboard?.writeText(s.sql);
            } catch (err) {
              console.error(err);
            }
          },
        },
      ],
    });
  }
  common.push({ label: 'Refresh', icon: 'refresh', onClick: () => onAction({ kind: 'refresh' }) });
  return [...items, ...common];
}

function baseContextItems(node: BuiltNode, onAction: (a: ContextAction) => void): ContextItem[] {
  const act = (kind: string) => () => onAction({ kind, serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, nodeType: node.type });

  switch (node.type) {
    case 'server': {
      const s = node.data as StudioServer;
      return [
        { label: 'Connect Server', icon: 'sql', onClick: () => onAction({ kind: 'dashboard-server', serverId: node.serverId }) },
        { label: 'Editar Servidor...', icon: 'edit', onClick: () => onAction({ kind: 'edit-server', serverId: node.serverId }) },
        { label: 'New Database...', icon: 'database', onClick: () => onAction({ kind: 'create-database', serverId: node.serverId }) },
        { label: 'Delete Server...', icon: 'close', danger: true, onClick: () => onAction({ kind: 'delete-server', serverId: s.id, name: s.name }) },
      ];
    }
    case 'group': {
      const g = node.data as ServerGroup;
      return [
        { label: 'New Server...', icon: 'server', onClick: () => onAction({ kind: 'create-server', groupId: g.id }) },
        { label: 'Rename Group...', icon: 'edit', onClick: () => onAction({ kind: 'rename-group', groupId: g.id, name: g.name }) },
        { sep: true },
        { label: 'Delete Group...', icon: 'close', danger: true, onClick: () => onAction({ kind: 'delete-group', name: g.name }) },
      ];
    }
    case 'database':
      return [
        { label: 'Dashboard', icon: 'chart', onClick: () => onAction({ kind: 'dashboard-database', serverId: node.serverId, database: node.database ?? undefined }) },
        {
          label: 'Create', icon: 'plus',
          children: [
            { label: 'New Schema...', icon: 'plus', onClick: () => onAction({ kind: 'create-schema', serverId: node.serverId, database: node.database ?? undefined }) },
            { label: 'New Database...', icon: 'database', onClick: () => onAction({ kind: 'create-database', serverId: node.serverId }) },
          ],
        },
        { label: 'Grants...', icon: 'role', onClick: () => onAction({ kind: 'grants', serverId: node.serverId, database: node.database ?? undefined, name: node.database ?? undefined, nodeType: 'database' }) },
        { sep: true },
        { label: 'Analyze', icon: 'refresh', onClick: () => onAction({ kind: 'analyze-database', serverId: node.serverId, database: node.database ?? undefined }) },
        { sep: true },
        { label: 'Backup...', icon: 'backup', onClick: () => onAction({ kind: 'backup', serverId: node.serverId, database: node.database ?? undefined }) },
        { label: 'Restore...', icon: 'restore', onClick: () => onAction({ kind: 'restore', serverId: node.serverId, database: node.database ?? undefined }) },
        { label: 'Drop Database...', icon: 'close', danger: true, onClick: () => onAction({ kind: 'drop-database', serverId: node.serverId, database: node.database ?? undefined }) },
      ];
    case 'schema':
      return [
        {
          label: 'Create', icon: 'plus',
          children: [
            { label: 'New Table...', icon: 'table', onClick: () => onAction({ kind: 'create-table', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined }) },
            { label: 'New View...', icon: 'view', onClick: () => onAction({ kind: 'create-view', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined }) },
            { label: 'New Materialized View...', icon: 'matview', onClick: () => onAction({ kind: 'create-matview', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined }) },
            { label: 'New Sequence...', icon: 'sequence', onClick: () => onAction({ kind: 'create-sequence', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined }) },
            { label: 'New Function...', icon: 'function', onClick: () => onAction({ kind: 'create-function', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined }) },
            { label: 'New Procedure...', icon: 'procedure', onClick: () => onAction({ kind: 'create-procedure', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined }) },
            { label: 'New Trigger Function...', icon: 'function', onClick: () => onAction({ kind: 'create-trigger-function', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined }) },
          ],
        },
        { label: 'Grants...', icon: 'role', onClick: () => onAction({ kind: 'grants', serverId: node.serverId, database: node.database ?? undefined, name: node.schema ?? undefined, nodeType: 'schema' }) },
        { label: 'Create Script...', icon: 'sql', onClick: () => onAction({ kind: 'create-script', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.schema ?? undefined, nodeType: 'schema' }) },
        { label: 'Drop Schema...', icon: 'close', danger: true, onClick: () => onAction({ kind: 'drop-schema', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined }) },
      ];
    case 'table':
      return [
        { label: 'View/Edit Data', icon: 'table', onClick: () => onAction({ kind: 'view-data', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name }) },
        { label: 'Count Rows', icon: 'chart', onClick: () => onAction({ kind: 'count-rows', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name }) },
        { label: 'Edit Properties...', icon: 'edit', onClick: () => onAction({ kind: 'edit-table', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name }) },
        {
          label: 'Create', icon: 'plus',
          children: [
            { label: 'New Index...', icon: 'index', onClick: () => onAction({ kind: 'create-index', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name }) },
            { label: 'New Column...', icon: 'plus', onClick: () => onAction({ kind: 'create-column', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.name }) },
            { label: 'New Constraint...', icon: 'plus', onClick: () => onAction({ kind: 'create-constraint', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.name }) },
            { label: 'New Trigger...', icon: 'plus', onClick: () => onAction({ kind: 'create-trigger', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.name }) },
            { label: 'New Rule...', icon: 'plus', onClick: () => onAction({ kind: 'create-rule', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.name }) },
            { label: 'New Policy...', icon: 'plus', onClick: () => onAction({ kind: 'create-policy', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.name }) },
            { label: 'New Partition...', icon: 'plus', onClick: () => onAction({ kind: 'add-partition', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.name }) },
            { label: 'Attach Partition...', icon: 'table', onClick: () => onAction({ kind: 'attach-partition', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.name }) },
          ],
        },
        { sep: true },
        { label: 'Backup...', icon: 'backup', onClick: () => onAction({ kind: 'backup', serverId: node.serverId, database: node.database ?? undefined, name: node.name }) },
        { label: 'Reindex', icon: 'refresh', onClick: () => onAction({ kind: 'reindex', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name }) },
        { label: 'Analyze', icon: 'refresh', onClick: () => onAction({ kind: 'analyze-table', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name }) },
        { label: 'Truncate...', icon: 'close', danger: true, onClick: () => onAction({ kind: 'truncate', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name }) },
        { label: 'Drop Table...', icon: 'close', danger: true, onClick: () => onAction({ kind: 'drop-table', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name }) },
      ];
    case 'matview':
      return [
        { label: 'Refresh', icon: 'refresh', onClick: () => onAction({ kind: 'refresh-matview', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name }) },
        { label: 'Drop...', icon: 'close', danger: true, onClick: () => onAction({ kind: 'drop-matview', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name }) },
      ];
    case 'view':
      return [
        { label: 'View/Edit Data', icon: 'table', onClick: () => onAction({ kind: 'view-data', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name }) },
        { label: 'Edit View...', icon: 'edit', onClick: () => onAction({ kind: 'edit-view', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name }) },
        { label: 'Drop View...', icon: 'close', danger: true, onClick: () => onAction({ kind: 'drop-view', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name }) },
      ];
    case 'sequence':
      return [
        { label: 'Edit Sequence...', icon: 'edit', onClick: () => onAction({ kind: 'edit-sequence', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name }) },
        { label: 'Drop Sequence...', icon: 'close', danger: true, onClick: () => onAction({ kind: 'drop-sequence', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name }) },
      ];
    case 'function':
      return [
        { label: 'Edit Function...', icon: 'edit', onClick: () => onAction({ kind: 'edit-function', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name }) },
        { label: 'Drop Function...', icon: 'close', danger: true, onClick: () => onAction({ kind: 'drop-function', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name }) },
      ];
    case 'procedure':
      return [
        { label: 'Edit Procedure...', icon: 'edit', onClick: () => onAction({ kind: 'edit-procedure', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name }) },
        { label: 'Drop Procedure...', icon: 'close', danger: true, onClick: () => onAction({ kind: 'drop-procedure', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name }) },
      ];
    case 'role':
      return [
        { label: 'Drop Role...', icon: 'close', danger: true, onClick: () => onAction({ kind: 'drop-role', serverId: node.serverId, name: node.name }) },
      ];
    case 'extension':
      return [
        { label: 'Drop Extension...', icon: 'close', danger: true, onClick: () => onAction({ kind: 'drop-extension', serverId: node.serverId, database: node.database ?? undefined, name: node.name }) },
      ];
    case 'index':
      return [
        { label: 'Edit Index...', icon: 'edit', onClick: () => onAction({ kind: 'edit-index', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.table ?? undefined }) },
        { label: 'Reindex', icon: 'refresh', onClick: () => onAction({ kind: 'reindex-index', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name }) },
        { label: 'Drop Index...', icon: 'close', danger: true, onClick: () => onAction({ kind: 'drop-index', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name }) },
      ];
    case 'partition':
      return [
        { label: 'Detach Partition...', icon: 'close', danger: true, onClick: () => onAction({ kind: 'detach-partition', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.table ?? undefined }) },
      ];
    case 'column':
      return [
        { label: 'Edit Column...', icon: 'edit', onClick: () => onAction({ kind: 'edit-column', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.table ?? undefined }) },
        { label: 'Drop Column...', icon: 'close', danger: true, onClick: () => onAction({ kind: 'drop-column', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.table ?? undefined }) },
      ];
    case 'constraint':
      return [
        { label: 'Edit Constraint...', icon: 'edit', onClick: () => onAction({ kind: 'edit-constraint', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.table ?? undefined }) },
        { label: 'Drop Constraint...', icon: 'close', danger: true, onClick: () => onAction({ kind: 'drop-constraint', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.table ?? undefined }) },
      ];
    case 'trigger':
      return [
        { label: 'Edit Trigger...', icon: 'edit', onClick: () => onAction({ kind: 'edit-trigger', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.table ?? undefined }) },
        { label: 'Enable', icon: 'refresh', onClick: () => onAction({ kind: 'enable-trigger', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.table ?? undefined }) },
        { label: 'Disable', icon: 'close', onClick: () => onAction({ kind: 'disable-trigger', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.table ?? undefined }) },
        { label: 'Drop Trigger...', icon: 'close', danger: true, onClick: () => onAction({ kind: 'drop-trigger', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.table ?? undefined }) },
      ];
    case 'rls_policy':
      return [
        { label: 'Edit Policy...', icon: 'edit', onClick: () => onAction({ kind: 'edit-policy', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.table ?? undefined }) },
        { label: 'Drop Policy...', icon: 'close', danger: true, onClick: () => onAction({ kind: 'drop-policy', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.table ?? undefined }) },
      ];
    case 'rule':
      return [
        { label: 'Edit Rule...', icon: 'edit', onClick: () => onAction({ kind: 'edit-rule', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.table ?? undefined }) },
        { label: 'Drop Rule...', icon: 'close', danger: true, onClick: () => onAction({ kind: 'drop-rule', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.table ?? undefined }) },
      ];
    case 'columns':
      return [
        { label: 'New Column...', icon: 'plus', onClick: () => onAction({ kind: 'create-column', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.table ?? undefined }) },
      ];
    case 'constraints':
      return [
        { label: 'New Constraint...', icon: 'plus', onClick: () => onAction({ kind: 'create-constraint', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.table ?? undefined }) },
      ];
    case 'indexes':
      return [
        { label: 'New Index...', icon: 'plus', onClick: () => onAction({ kind: 'create-index', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.table ?? undefined }) },
      ];
    case 'triggers':
      return [
        { label: 'New Trigger...', icon: 'plus', onClick: () => onAction({ kind: 'create-trigger', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.table ?? undefined }) },
      ];
    case 'row_security_policies':
      return [
        { label: 'New Policy...', icon: 'plus', onClick: () => onAction({ kind: 'create-policy', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.table ?? undefined }) },
      ];
    case 'rules':
      return [
        { label: 'New Rule...', icon: 'plus', onClick: () => onAction({ kind: 'create-rule', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.table ?? undefined }) },
      ];
    case 'partitions':
      return [
        { label: 'New Partition...', icon: 'plus', onClick: () => onAction({ kind: 'add-partition', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.table ?? undefined }) },
        { label: 'Attach Partition...', icon: 'table', onClick: () => onAction({ kind: 'attach-partition', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, table: node.table ?? undefined }) },
      ];
    case 'databases':
      return [
        { label: 'New Database...', icon: 'database', onClick: () => onAction({ kind: 'create-database', serverId: node.serverId }) },
      ];
    case 'roles':
      return [
        { label: 'New Role...', icon: 'role', onClick: () => onAction({ kind: 'create-role', serverId: node.serverId }) },
      ];
    case 'tables':
      return [
        { label: 'New Table...', icon: 'table', onClick: () => onAction({ kind: 'create-table', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined }) },
      ];
    case 'views':
      return [
        { label: 'New View...', icon: 'view', onClick: () => onAction({ kind: 'create-view', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined }) },
      ];
    case 'matviews':
      return [
        { label: 'New Materialized View...', icon: 'matview', onClick: () => onAction({ kind: 'create-matview', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined }) },
      ];
    case 'sequences':
      return [
        { label: 'New Sequence...', icon: 'sequence', onClick: () => onAction({ kind: 'create-sequence', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined }) },
      ];
    case 'functions':
      return [
        { label: 'New Function...', icon: 'function', onClick: () => onAction({ kind: 'create-function', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined }) },
      ];
    case 'procedures':
      return [
        { label: 'New Procedure...', icon: 'procedure', onClick: () => onAction({ kind: 'create-procedure', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined }) },
      ];
    case 'extensions':
      return [
        { label: 'New Extension...', icon: 'plus', onClick: () => onAction({ kind: 'create-extension', serverId: node.serverId, database: node.database ?? undefined }) },
      ];
    case 'schemas':
      return [
        { label: 'New Schema...', icon: 'plus', onClick: () => onAction({ kind: 'create-schema', serverId: node.serverId, database: node.database ?? undefined }) },
      ];
    default:
      if (FOLDER_TYPES.has(node.type)) return [];
      if (CATALOG_LEAF_KINDS.has(node.type)) {
        const items: ContextItem[] = [];
        if (node.name) {
          items.push({
            label: 'Properties', icon: 'properties',
            onClick: () => onAction({ kind: 'open-object', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, nodeType: node.type }),
          });
        }
        if (node.name && DROPPABLE_CATALOG_KINDS.has(node.type)) {
          items.push({
            label: 'Drop...', icon: 'close', danger: true,
            onClick: () => onAction({ kind: 'drop-catalog-object', serverId: node.serverId, database: node.database ?? undefined, schema: node.schema ?? undefined, name: node.name, nodeType: node.type }),
          });
        }
        return items;
      }
      return [{ label: 'Dashboard', icon: 'chart', onClick: act('dashboard') }];
  }
}

interface TreeNodeProps {
  node: BuiltNode;
  depth: number;
  isOpen: (key: string) => boolean;
  toggle: (node: BuiltNode) => void;
  childrenOf: (key: string) => BuiltNode[];
  selectedKey: string | null;
  onSelect: (node: TreeNode) => void;
  onManageServer: (server: StudioServer) => void;
  onOpenContext: (menu: ContextMenuState) => void;
  onAction: (action: ContextAction) => void;
}

function TreeNode({ node, depth, isOpen, toggle, childrenOf, selectedKey, onSelect, onManageServer, onOpenContext, onAction }: TreeNodeProps) {
  const children = childrenOf(node.key);
  const open = isOpen(node.key);
  const selected = selectedKey === node.key;

  const handleContext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onOpenContext({
      x: e.clientX,
      y: e.clientY,
      node,
      items: buildContextItems(node, (a) => onAction({ ...a, nodeKey: node.key })),
    });
  };

  return (
    <div className="select-none">
      <div
        className={`group flex min-h-[26px] cursor-pointer items-center gap-1 whitespace-nowrap rounded-[2px] px-1.5 py-1 hover:bg-hover ${selected ? 'bg-selected' : ''}`}
        style={{ paddingLeft: 6 + depth * 14 }}
        onClick={() => onSelect(node)}
        onDoubleClick={() => node.loadable && toggle(node)}
        onContextMenu={handleContext}
      >
        {node.loadable ? (
          <span className={`inline-flex h-[13px] w-[13px] shrink-0 items-center justify-center text-[#7a8694] transition-transform duration-[80ms] ${open ? 'rotate-90' : ''}`} onClick={(e) => { e.stopPropagation(); toggle(node); }}>
            <i className="fa fa-chevron-right" style={{ fontSize: 9 }} />
          </span>
        ) : (
          <span className="invisible inline-flex h-[13px] w-[13px] shrink-0 items-center justify-center" />
        )}
        <span className={`inline-flex shrink-0 ${typeColor(node.type)}`}><Fa name={node.icon} /></span>
        {node.type === 'column' && node.primaryKey && (
          <span className="inline-flex shrink-0 text-[#c9a227]" title="Primary Key"><Fa name="key" style={{ fontSize: 11 }} /></span>
        )}
        <span className="truncate">{node.label}</span>
        {node.type === 'column' && !!node.detail && (
          <span className="ml-1 shrink-0 whitespace-nowrap text-[11px] italic text-muted">{node.detail}</span>
        )}
        {node.type === 'server' && !!node.data && (
          <span className="ml-auto hidden group-hover:inline-flex">
            <button className="cursor-pointer border-none bg-transparent p-0 text-[11px] text-muted hover:text-pg-blue" title="Editar servidor" onClick={(e) => { e.stopPropagation(); onManageServer(node.data as StudioServer); }}>
              editar
            </button>
          </span>
        )}
      </div>
      {open && (
        <div className="pl-3.5">
          {children.map((child) => (
            <TreeNode
              key={child.key}
              node={child}
              depth={depth + 1}
              isOpen={isOpen}
              toggle={toggle}
              childrenOf={childrenOf}
              selectedKey={selectedKey}
              onSelect={onSelect}
              onManageServer={onManageServer}
              onOpenContext={onOpenContext}
              onAction={onAction}
            />
          ))}
          {!children.length && node.loadable && <div className="px-1.5 py-1 text-[13px] italic text-muted">(sem itens)</div>}
        </div>
      )}
    </div>
  );
}

function node(partial: Partial<BuiltNode> & { key: string; type: string; label: string }): BuiltNode {
  return {
    key: partial.key,
    type: partial.type,
    label: partial.label,
    icon: partial.icon || partial.type,
    loadable: partial.loadable || false,
    ...(partial.data !== undefined ? { data: partial.data } : {}),
    serverId: partial.serverId,
    database: partial.database,
    schema: partial.schema,
    name: partial.name,
    table: partial.table,
    ...(partial.detail !== undefined && partial.detail !== '' ? { detail: partial.detail } : {}),
    ...(partial.primaryKey ? { primaryKey: true } : {}),
  };
}

function folder(
  n: BuiltNode,
  g: ObjGroup,
  parent: string,
): BuiltNode {
  return node({
    key: `${n.key}:${g.type}`,
    type: g.type,
    label: g.label,
    icon: g.kind,
    loadable: g.loadable,
    database: n.database,
    schema: n.schema,
    serverId: n.serverId,
    name: n.name,
    table: parent === 'table' ? n.name : n.table,
    data: { parent, children: g.children },
  });
}

async function fetchChildren(
  n: BuiltNode,
  servers: StudioServer[],
  groups: ServerGroup[],
  setChildren: (key: string, children: BuiltNode[]) => void,
): Promise<BuiltNode[]> {
  switch (n.type) {
    case 'root': {
      const out: BuiltNode[] = [];
      for (const g of groups || []) {
        out.push(node({ key: `group:${g.id}`, type: 'group', label: g.name, icon: 'group', loadable: true, data: g }));
        for (const s of servers.filter((x) => x.server_group_id === g.id)) {
          out.push(node({ key: `server:${g.id}:${s.id}`, type: 'server', label: s.name, icon: 'server', loadable: true, data: s }));
        }
      }
      for (const s of (servers || []).filter((x) => x.server_group_id == null)) {
        out.push(node({ key: `server:0:${s.id}`, type: 'server', label: s.name, icon: 'server', loadable: true, data: s }));
      }
      return out;
    }

    case 'group': {
      const g = n.data as ServerGroup;
      return (servers || [])
        .filter((x) => x.server_group_id === g.id)
        .map((s) => node({ key: `server:${g.id}:${s.id}`, type: 'server', label: s.name, icon: 'server', loadable: true, data: s }));
    }

    case 'server': {
      const s = n.data as StudioServer;
      return [
        node({ key: `server:${s.id}:databases`, type: 'databases', label: 'Databases', icon: 'database', loadable: true, serverId: s.id }),
        node({ key: `server:${s.id}:roles`, type: 'roles', label: 'Roles/Login Roles', icon: 'roles', loadable: true, serverId: s.id }),
        node({ key: `server:${s.id}:tablespaces`, type: 'tablespaces', label: 'Tablespaces', icon: 'tablespaces', loadable: true, serverId: s.id }),
      ];
    }

    case 'databases': {
      const s = n.serverId as number;
      const dbs = await api.databases(s);
      return dbs.map((d) => node({
        key: `db:${s}:${d.name}`,
        type: 'database',
        label: d.name,
        icon: 'database',
        loadable: true,
        database: d.name,
        serverId: s,
        data: { server: s, database: d },
      }));
    }

    case 'tablespaces': {
      const s = n.serverId as number;
      const items = await api.tablespaces(s);
      return items.map((o) => node({
        key: `${n.key}:${o.name}`,
        type: 'tablespace',
        label: o.name,
        icon: 'tablespace',
        serverId: s,
        name: o.name,
        data: o,
      }));
    }

    case 'roles': {
      const s = n.serverId as number;
      const roles = await api.roles(s);
      return roles.map((r) => node({
        key: `${n.key}:${r.name}`,
        type: 'role',
        label: r.name,
        icon: 'role',
        serverId: s,
        data: r,
      }));
    }

    case 'database': {
      const s = n.serverId as number;
      const db = n.database as string;
      const out: BuiltNode[] = DB_OBJECTS.map((g) => folder(n, g, 'database'));
      out.push(node({ key: `db:${s}:${db}:schemas`, type: 'schemas', label: 'Schemas', icon: 'schema', loadable: true, database: db, serverId: s }));
      return out;
    }

    case 'schemas': {
      const s = n.serverId as number;
      const db = n.database as string;
      const schemas = await api.schemas(s, db);
      return schemas.map((sch) => node({
        key: `db:${s}:${db}:schema:${sch.name}`,
        type: 'schema',
        label: sch.name,
        icon: 'schema',
        loadable: true,
        database: db,
        schema: sch.name,
        serverId: s,
      }));
    }

    case 'schema': {
      const s = n.serverId as number;
      const db = n.database as string;
      const schema = n.schema as string;
      const out: BuiltNode[] = [
        node({ key: `${n.key}:tables`, type: 'tables', label: 'Tables', icon: 'tables', loadable: true, database: db, schema, serverId: s }),
        node({ key: `${n.key}:views`, type: 'views', label: 'Views', icon: 'views', loadable: true, database: db, schema, serverId: s }),
        node({ key: `${n.key}:matviews`, type: 'matviews', label: 'Materialized Views', icon: 'matviews', loadable: true, database: db, schema, serverId: s }),
        node({ key: `${n.key}:sequences`, type: 'sequences', label: 'Sequences', icon: 'sequences', loadable: true, database: db, schema, serverId: s }),
        node({ key: `${n.key}:functions`, type: 'functions', label: 'Functions', icon: 'functions', loadable: true, database: db, schema, serverId: s }),
        node({ key: `${n.key}:procedures`, type: 'procedures', label: 'Procedures', icon: 'procedures', loadable: true, database: db, schema, serverId: s }),
      ];
      out.push(...SCHEMA_OBJECTS.map((g) => folder(n, g, 'schema')));
      return out;
    }

    case 'tables': return listObjects(n, '/tables', 'table');
    case 'views': return listObjects(n, '/views', 'view');
    case 'matviews': return listObjects(n, '/matviews', 'matview');
    case 'sequences': return listObjects(n, '/sequences', 'sequence');
    case 'functions': return listObjects(n, '/functions', 'function');
    case 'procedures': return listObjects(n, '/procedures', 'procedure');

    case 'table': return buildRelationChildren(n, TABLE_CHILDREN);
    case 'view': return buildRelationChildren(n, VIEW_CHILDREN);
    case 'matview': return buildRelationChildren(n, VIEW_CHILDREN);
    case 'foreign_table': return buildRelationChildren(n, FOREIGN_TABLE_CHILDREN);

    case 'constraints': {
      const children = ((n.data as { children?: ObjGroup[] }) || {}).children || [];
      return children.map((g) => folder(n, g, 'constraints'));
    }

    default:
      if (DATABASE_KINDS.has(n.type) || SCHEMA_KINDS.has(n.type) || LEAF_TYPES[n.type]) {
        return loadCatalogObjects(n);
      }
      return [];
  }
}

function buildRelationChildren(n: BuiltNode, groups: ObjGroup[]): BuiltNode[] {
  return groups.map((g) => folder(n, g, n.type));
}

async function listObjects(n: BuiltNode, path: string, type: string): Promise<BuiltNode[]> {
  const s = n.serverId as number;
  const db = n.database as string;
  const schema = n.schema as string;
  const items = await api.get<{ name: string }[]>(
    `/servers/${s}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}${path}`,
  );
  const iconMap: Record<string, string> = { table: 'table', view: 'view', matview: 'matview', sequence: 'sequence', function: 'function', procedure: 'procedure' };
  return items.map((item) => node({
    key: `${n.key}:${item.name}`,
    type,
    label: item.name,
    icon: iconMap[type] || type,
    loadable: type === 'table' || type === 'view' || type === 'matview' || type === 'foreign_table',
    database: db,
    schema,
    serverId: s,
    name: item.name,
    data: item,
  }));
}

async function loadCatalogObjects(n: BuiltNode): Promise<BuiltNode[]> {
  const s = n.serverId as number;
  const db = n.database as string;
  const schema = n.schema as string;
  const name = n.name as string;
  const parent = ((n.data as { parent?: string }) || {}).parent || 'table';
  const kind = n.type;

  let items: CatalogObject[];
  if (DATABASE_KINDS.has(kind)) {
    items = await api.databaseObjects(s, db, kind);
  } else if (SCHEMA_KINDS.has(kind)) {
    items = await api.schemaObjects(s, db, schema, kind);
  } else if (parent === 'view' || parent === 'matview') {
    items = await api.viewObjects(s, db, schema, name, kind);
  } else if (parent === 'foreign_table') {
    items = await api.foreignTableObjects(s, db, schema, name, kind);
  } else {
    items = await api.tableObjects(s, db, schema, name, kind);
  }

  const leaf = LEAF_TYPES[kind] || 'column';
  return items.map((o) => node({
    key: `${n.key}:${o.name}`,
    type: leaf,
    label: leaf === 'partition' && o.detail ? `${o.name} ${o.detail}` : o.name,
    icon: leaf,
    loadable: leaf === 'foreign_table',
    database: db,
    schema,
    serverId: s,
    name: o.name,
    table: parent === 'table' || parent === 'constraints' ? name : undefined,
    ...(leaf === 'column' ? { detail: o.detail, primaryKey: !!o.primary_key } : {}),
    data: o,
  }));
}
