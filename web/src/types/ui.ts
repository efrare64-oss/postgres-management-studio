import type { Role, ServerGroup, StudioServer } from './server';
import type { TreeNode } from './tree';

export interface QueryContext {
  serverId: number | null;
  database: string | null;
}

export type TabKind = 'query' | 'object' | 'dashboard-server' | 'dashboard-database' | 'search';

export interface AppTab {
  id: string;
  title: string;
  kind: TabKind;
  node?: TreeNode;
  context?: QueryContext;
}

export type ModalState =
  | { type: 'connect'; server?: StudioServer | null; groupId?: number | null }
  | { type: 'group'; group?: ServerGroup | null }
  | { type: 'table' }
  | { type: 'role'; role?: Role | null }
  | { type: 'database'; serverId: number }
  | { type: 'schema'; serverId: number; database: string }
  | { type: 'view'; serverId: number; database: string; schema: string; kind: 'view' | 'matview' }
  | { type: 'sequence'; serverId: number; database: string; schema: string }
  | { type: 'function'; serverId: number; database: string; schema: string }
  | { type: 'index'; serverId: number; database: string; schema: string; table: string }
  | { type: 'extension'; serverId: number; database: string }
  | { type: 'grants'; serverId: number; database: string; objectKind?: string; objectName?: string; schema?: string }
  | { type: 'backup'; serverId: number; database?: string | null; table?: string | null }
  | { type: 'restore'; serverId: number; database?: string | null }
  | { type: 'confirm'; title: string; message: string; confirmLabel?: string; danger?: boolean; onConfirm: () => Promise<void> | void }
  | { type: 'about' }
  | null;

export type MenuId = 'file' | 'object' | 'tools' | 'help' | null;

export interface ContextAction {
  kind: string;
  serverId?: number;
  groupId?: number;
  database?: string;
  schema?: string;
  name?: string;
  nodeType?: string;
}

export interface MenuItem {
  label?: string;
  icon?: string;
  sep?: boolean;
  enabled?: boolean;
  onClick?: () => void;
}

export interface MenuDef {
  id: Exclude<MenuId, null>;
  label: string;
  items: MenuItem[];
}

export interface ToolbarItem {
  key: string;
  icon?: string;
  label?: string;
  enabled?: boolean;
  sep?: boolean;
  onClick?: () => void;
}