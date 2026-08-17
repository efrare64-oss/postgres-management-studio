export interface TreeNode {
  key: string;
  type: string;
  label: string;
  icon: string;
  loadable: boolean;
  data?: unknown;
  serverId?: number;
  database?: string | null;
  schema?: string | null;
  name?: string;
}
