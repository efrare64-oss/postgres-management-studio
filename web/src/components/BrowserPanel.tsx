import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import { Fa } from '../icons';
import type { ServerGroup, StudioServer, TreeNode } from '../types';

const OBJ_GROUPS = [
  { type: 'tables', label: 'Tables', icon: 'table' },
  { type: 'views', label: 'Views', icon: 'view' },
  { type: 'matviews', label: 'Materialized Views', icon: 'matview' },
  { type: 'sequences', label: 'Sequences', icon: 'sequence' },
  { type: 'functions', label: 'Functions', icon: 'function' },
];

const FOLDER_TYPES = [
  { type: 'columns', label: 'Columns', icon: 'column' },
  { type: 'indexes', label: 'Indexes', icon: 'index' },
  { type: 'constraints', label: 'Constraints', icon: 'constraint' },
  { type: 'triggers', label: 'Triggers', icon: 'trigger' },
];

const TYPE_COLORS: Record<string, string> = {
  group: 'text-[#8a5a00]',
  server: 'text-[#3a6ea5]',
  database: 'text-[#a03a3a]',
  schema: 'text-[#5a7a2a]',
  role: 'text-[#7a3aa0]',
  table: 'text-[#2a7a2a]',
  view: 'text-[#3a6ea5]',
  sequence: 'text-[#8a5a00]',
  function: 'text-[#a03a3a]',
};

function typeColor(type: string): string {
  return TYPE_COLORS[type] || 'text-[#3a6ea5]';
}

interface BrowserPanelProps {
  servers: StudioServer[];
  groups: ServerGroup[];
  selectedKey: string | null;
  onSelect: (node: TreeNode) => void;
  onManageServer: (server: StudioServer) => void;
  onRefresh: () => void;
}

interface BuiltNode extends TreeNode {
  data?: unknown;
}

export default function BrowserPanel({ servers, groups, selectedKey, onSelect, onManageServer, onRefresh }: BrowserPanelProps) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [cache, setCache] = useState<Record<string, BuiltNode[]>>({});

  const setChildren = useCallback((key: string, children: BuiltNode[]) =>
    setCache((c) => ({ ...c, [key]: children })), []);

  useEffect(() => {
    let cancelled = false;
    fetchChildren(
      { key: 'root', type: 'root', label: 'Servers', icon: 'server', loadable: true },
      servers, groups, setChildren,
    )
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
    const root = { key: 'root', type: 'root', label: 'Servers', icon: 'server', loadable: true };
    try {
      const built = await fetchChildren(root, servers, groups, setChildren);
      setChildren('root', built);
      setOpen((o) => ({ ...o, root: true }));
    } catch (err) {
      console.error(err);
    }
  };

  const rootChildren = childrenOf('root');

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
          <button className="m-1.5 flex w-[calc(100%-12px)] cursor-pointer items-center justify-center gap-1.5 rounded border border-border bg-[#f7f7f7] p-1.5 hover:bg-[#ececec]" onClick={() => load({ key: 'root', type: 'root', label: 'Servers', icon: 'server', loadable: true })} title="Carregar árvore">
            <Fa name="refresh" /> Carregar árvore
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
          />
        ))}
        {!rootChildren.length && <div className="p-5 italic text-muted">Nenhum servidor.</div>}
        {rootChildren.length > 0 && !selectedKey && <div className="px-2.5 py-2 text-xs italic text-muted">Clique em um objeto para ver propriedades.</div>}
      </div>
    </div>
  );
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
}

function TreeNode({ node, depth, isOpen, toggle, childrenOf, selectedKey, onSelect, onManageServer }: TreeNodeProps) {
  const children = childrenOf(node.key);
  const open = isOpen(node.key);
  const selected = selectedKey === node.key;

  const handleContext = (e: React.MouseEvent) => {
    e.preventDefault();
    if (node.type === 'server' && node.data) onManageServer(node.data as StudioServer);
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
        <span className="truncate">{node.label}</span>
        {node.type === 'server' && !!node.data && (
          <span className="ml-auto hidden group-hover:inline-flex">
            <button className="inline-flex cursor-pointer items-center gap-1 border-none bg-transparent p-0 text-[11px] text-muted hover:text-pg-blue" title="Editar servidor" onClick={(e) => { e.stopPropagation(); onManageServer(node.data as StudioServer); }}>
              <Fa name="edit" /> editar
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
  };
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
      const dbs = await api.databases(s.id);
      return dbs.map((d) => node({
        key: `db:${s.id}:${d.name}`,
        type: 'database',
        label: d.name,
        icon: 'database',
        loadable: true,
        database: d.name,
        serverId: s.id,
        data: { server: s, database: d },
      }));
    }

    case 'database': {
      const s = n.serverId as number;
      const db = n.database as string;
      const schemas = await api.schemas(s, db);
      const out: BuiltNode[] = [
        node({ key: `db:${s}:${db}:roles`, type: 'roles', label: 'Roles/Login Roles', icon: 'roles', loadable: true, database: db, serverId: s }),
      ];
      out.push(...schemas.map((sch) => node({
        key: `db:${s}:${db}:schema:${sch.name}`,
        type: 'schema',
        label: sch.name,
        icon: 'schema',
        loadable: true,
        database: db,
        schema: sch.name,
        serverId: s,
      })));
      return out;
    }

    case 'roles': {
      const s = n.serverId as number;
      const roles = await api.roles(s);
      return roles.map((r) => node({
        key: `db:${n.database}:${s}:role:${r.name}`,
        type: 'role',
        label: r.name,
        icon: 'role',
        database: n.database,
        serverId: s,
        data: r,
      }));
    }

    case 'schema': {
      const s = n.serverId as number;
      const db = n.database as string;
      const schema = n.schema as string;
      return OBJ_GROUPS.map((g) => node({
        key: `db:${s}:${db}:schema:${schema}:${g.type}`,
        type: g.type,
        label: g.label,
        icon: g.icon,
        loadable: true,
        database: db,
        schema,
        serverId: s,
      }));
    }

    case 'tables': return listObjects(n, '/tables', 'table');
    case 'views': return listObjects(n, '/views', 'view');
    case 'matviews': return listObjects(n, '/matviews', 'matview');
    case 'sequences': return listObjects(n, '/sequences', 'sequence');
    case 'functions': return listObjects(n, '/functions', 'function');

    case 'table': {
      const built = FOLDER_TYPES.map((f) => node({
        key: `${n.key}:${f.type}`,
        type: f.type,
        label: f.label,
        icon: f.icon,
        loadable: true,
        database: n.database,
        schema: n.schema,
        serverId: n.serverId,
        name: n.name,
      }));
      setChildren(n.key, built);
      loadTableSub(n).catch((e) => console.error(e));
      return built;
    }

    case 'columns': return loadTableSub(n);
    case 'indexes': return loadTableSub(n);
    case 'constraints': return loadTableSub(n);
    case 'triggers': return loadTableSub(n);

    default:
      return [];
  }
}

async function listObjects(n: BuiltNode, path: string, type: string): Promise<BuiltNode[]> {
  const s = n.serverId as number;
  const db = n.database as string;
  const schema = n.schema as string;
  const items = await api.get<{ name: string }[]>(
    `/servers/${s}/databases/${encodeURIComponent(db)}/schemas/${encodeURIComponent(schema)}${path}`,
  );
  const iconMap: Record<string, string> = { table: 'table', view: 'view', matview: 'matview', sequence: 'sequence', function: 'function' };
  return items.map((item) => node({
    key: `${n.key}:${item.name}`,
    type,
    label: item.name,
    icon: iconMap[type] || type,
    loadable: type === 'table',
    database: db,
    schema,
    serverId: s,
    name: item.name,
    data: item,
  }));
}

async function loadTableSub(n: BuiltNode): Promise<BuiltNode[]> {
  const s = n.serverId as number;
  const db = n.database as string;
  const schema = n.schema as string;
  const table = n.name as string;
  const detail = await api.tableDetail(s, db, schema, table);

  switch (n.type) {
    case 'columns':
      return detail.columns.map((c) => node({
        key: `${n.key}:${c.name}`,
        type: 'column',
        label: c.name,
        icon: 'column',
        database: db, schema, serverId: s, name: table,
        data: c,
      }));
    case 'indexes':
      return detail.indexes.map((i) => node({
        key: `${n.key}:${i.name}`,
        type: 'index',
        label: i.name,
        icon: 'index',
        database: db, schema, serverId: s, name: table,
        data: i,
      }));
    case 'constraints':
      return detail.constraints.map((c) => node({
        key: `${n.key}:${c.name}`,
        type: 'constraint',
        label: c.name,
        icon: 'constraint',
        database: db, schema, serverId: s, name: table,
        data: c,
      }));
    case 'triggers': {
      const triggers = await api.triggers(s, db, schema, table);
      return triggers.map((t) => node({
        key: `${n.key}:${t.name}`,
        type: 'trigger',
        label: t.name,
        icon: 'trigger',
        database: db, schema, serverId: s, name: table,
        data: t,
      }));
    }
    default:
      return [];
  }
}
