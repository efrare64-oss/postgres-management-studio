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
  initialQuery?: string;
}

export type ModalState =
  | { type: 'connect'; server?: StudioServer | null; groupId?: number | null }
  | { type: 'group'; group?: ServerGroup | null }
  | { type: 'table' }
  | { type: 'table-edit'; serverId: number; database: string; schema: string; table: string }
  | { type: 'role'; role?: Role | null }
  | { type: 'database'; serverId: number }
  | { type: 'schema'; serverId: number; database: string }
  | { type: 'partition-add'; serverId: number; database: string; schema: string; table: string }
  | { type: 'partition-attach'; serverId: number; database: string; schema: string; table: string }
  | { type: 'truncate'; serverId: number; database: string; schema: string; table: string }
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
  table?: string;
  nodeType?: string;
  nodeKey?: string;
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