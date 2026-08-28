import { useTranslation } from 'react-i18next';
import { Fa } from '../icons';
import type { StudioServer } from '../types';

interface QueryToolbarProps {
  servers: StudioServer[];
  serverId: string;
  onServerChange: (id: string) => void;
  databases: { name: string; size: string }[];
  database: string;
  loading?: boolean;
  onDatabaseChange: (db: string) => void;
  running: boolean;
  onExecute: () => void;
  onExplain: () => void;
  onExplainAnalyze: () => void;
  onFormat: () => void;
  onGotoLine: () => void;
  onToggleComment: () => void;
  onUppercase: () => void;
  onLowercase: () => void;
  onClear: () => void;
  onToggleHistory: () => void;
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
}

export default function QueryToolbar({
  servers,
  serverId,
  onServerChange,
  databases,
  database,
  loading = false,
  onDatabaseChange,
  running,
  onExecute,
  onExplain,
  onExplainAnalyze,
  onFormat,
  onGotoLine,
  onToggleComment,
  onUppercase,
  onLowercase,
  onClear,
  onToggleHistory,
  onNew,
  onOpen,
  onSave,
  onSaveAs,
}: QueryToolbarProps) {
  const { t } = useTranslation();
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border-soft bg-menu-bg px-2.5 py-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-muted">{t('qt.server')}</label>
        <select value={serverId} onChange={(e) => onServerChange(e.target.value)} className="max-w-[180px] rounded border border-border px-1.5 py-1 font-sans text-[13px]">
          <option value="">{t('qt.select')}</option>
          {servers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <label className="text-xs text-muted">{t('qt.database')}</label>
        <select
          value={database}
          onChange={(e) => onDatabaseChange(e.target.value)}
          className={`max-w-[180px] rounded border border-border px-1.5 py-1 font-sans text-[13px] ${loading ? 'opacity-60' : ''}`}
        >
          {!databases.some((d) => d.name === database) && (
            <option value={database}>{loading ? t('qt.loading') : database || t('qt.select')}</option>
          )}
          {databases.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button className="btn" onClick={onNew} title={t('qt.new')}>
          <Fa name="plus" />
        </button>
        <button className="btn" onClick={onOpen} title={t('qt.open')}>
          <Fa name="upload" />
        </button>
        <button className="btn" onClick={onSave} title={t('qt.save')}>
          <Fa name="save" />
        </button>
        <button className="btn" onClick={onSaveAs} title={t('qt.save_as')}>
          <Fa name="backup" />
        </button>
        <span className="mx-1 inline-block w-px self-stretch bg-border" />
        <button className="btn primary" disabled={running} onClick={onExecute} title={t('qt.execute')}>
          <Fa name="sql" />
        </button>
        <button className="btn" disabled={running} onClick={onExplain} title="EXPLAIN">
          <Fa name="explain" />
        </button>
        <button className="btn" disabled={running} onClick={onExplainAnalyze} title="EXPLAIN ANALYZE">
          <Fa name="explain-analyze" />
        </button>
        <span className="mx-1 inline-block w-px self-stretch bg-border" />
        <button className="btn" onClick={onFormat} title={t('qt.format')}>
          <Fa name="format" />
        </button>
        <button className="btn" onClick={onGotoLine} title={t('qt.goto_line')}>
          <Fa name="goto" />
        </button>
        <button className="btn" onClick={onToggleComment} title={t('qt.toggle_comment')}>
          <Fa name="comment" />
        </button>
        <button className="btn" onClick={onUppercase} title={t('qt.uppercase')}>
          <Fa name="uppercase" />
        </button>
        <button className="btn" onClick={onLowercase} title={t('qt.lowercase')}>
          <Fa name="lowercase" />
        </button>
        <button className="btn" onClick={onClear} title={t('qt.clear')}>
          <Fa name="clear" />
        </button>
        <button className="btn" onClick={onToggleHistory} title={t('qt.history')}>
          <Fa name="history" />
        </button>
      </div>
    </div>
  );
}
