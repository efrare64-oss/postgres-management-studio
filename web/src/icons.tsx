import type { CSSProperties } from 'react';

const ICONS: Record<string, string> = {
  server: 'fa fa-server',
  group: 'fa fa-users',
  database: 'fa fa-database',
  schema: 'fa fa-sitemap',
  table: 'fa fa-table',
  view: 'fa fa-eye',
  matview: 'fa fa-clone',
  sequence: 'fa fa-sort-numeric-asc',
  function: 'fa fa-cogs',
  role: 'fa fa-user',
  roles: 'fa fa-users',
  column: 'fa fa-columns',
  index: 'fa fa-sort-amount-asc',
  constraint: 'fa fa-link',
  trigger: 'fa fa-bolt',

  tables: 'fa fa-table',
  views: 'fa fa-eye',
  matviews: 'fa fa-clone',
  sequences: 'fa fa-sort-numeric-asc',
  functions: 'fa fa-cogs',
  columns: 'fa fa-columns',
  indexes: 'fa fa-sort-amount-asc',
  constraints: 'fa fa-link',
  triggers: 'fa fa-bolt',

  refresh: 'fa fa-refresh',
  close: 'fa fa-times',
  sql: 'fa fa-terminal',
  search: 'fa fa-search',
  plus: 'fa fa-plus',
  edit: 'fa fa-pencil',
  info: 'fa fa-info-circle',
  chart: 'fa fa-bar-chart-o',

  play: 'fa fa-play',
  clear: 'fa fa-eraser',
  history: 'fa fa-clock-o',
  save: 'fa fa-floppy-o',
  cancel: 'fa fa-times-circle-o',
  results: 'fa fa-table',
  messages: 'fa fa-comment-o',
  properties: 'fa fa-info-circle',
  statistics: 'fa fa-area-chart',
  object: 'fa fa-cube',
};

function iconClass(name: string): string {
  return ICONS[name] || 'fa fa-database';
}

export function Fa({ name, className, style }: { name: string; className?: string; style?: CSSProperties }) {
  return <i className={`${iconClass(name)}${className ? ' ' + className : ''}`} style={style} aria-hidden="true" />;
}
