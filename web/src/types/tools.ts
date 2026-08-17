export interface ToolBinary {
  name: string;
  path: string;
  found: boolean;
  message?: string;
}

export interface BackupOptions {
  database: string;
  format: 'custom' | 'plain' | 'tar';
  filename: string;
  gzip: boolean;
  jobs: number;
  data_only: boolean;
  schema_only: boolean;
  schema: string;
  table: string;
  verbose: boolean;
}

export interface RestoreOptions {
  database: string;
  format: 'auto' | 'plain' | 'custom' | 'tar';
  clean: boolean;
  create: boolean;
  data_only: boolean;
  schema_only: boolean;
  jobs: number;
  verbose: boolean;
}