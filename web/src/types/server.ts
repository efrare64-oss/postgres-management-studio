export interface ServerGroup {
  id: number;
  name: string;
}

export interface StudioServer {
  id: number;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  database: string;
  ssl_mode: string;
  server_group_id: number | null;
}

export interface DatabaseInfo {
  name: string;
  size: string;
}

export interface SchemaInfo {
  name: string;
  owner: string;
}

export interface Role {
  name: string;
  superuser: boolean;
  can_login: boolean;
  create_db: boolean;
  replication: boolean;
  member_of?: string;
  conn_limit: number;
}
