import type { Role, ServerGroup, StudioServer } from './server';
import type { TreeNode } from './tree';

export interface QueryContext {
  serverId: number | null;
  database: string | null;
}

export type TabKind = 'query' | 'object' | 'dashboard-server' | 'dashboard-database';

export interface AppTab {
  id: string;
  title: string;
  kind: TabKind;
  node?: TreeNode;
  context?: QueryContext;
}

export type ModalState =
  | { type: 'connect'; server?: StudioServer | null }
  | { type: 'group'; group?: ServerGroup | null }
  | { type: 'table' }
  | { type: 'role'; role?: Role | null }
  | { type: 'about' }
  | null;

export type MenuId = 'file' | 'object' | 'tools' | 'help' | null;

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
