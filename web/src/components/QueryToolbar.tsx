import { Fa } from '../icons';
import type { StudioServer } from '../types';

interface QueryToolbarProps {
  servers: StudioServer[];
  serverId: string;
  onServerChange: (id: string) => void;
  databases: { name: string; size: string }[];
  database: string;
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
}

export default function QueryToolbar({
  servers,
  serverId,
  onServerChange,
  databases,
  database,
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
}: QueryToolbarProps) {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-border-soft bg-[#f4f6f8] px-2.5 py-1.5">
      <div className="flex items-center gap-1.5">
        <label className="text-xs text-muted">Servidor</label>
        <select value={serverId} onChange={(e) => onServerChange(e.target.value)} className="max-w-[180px] rounded border border-border px-1.5 py-1 font-sans text-[13px]">
          <option value="">Selecione...</option>
          {servers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <label className="text-xs text-muted">Banco</label>
        <select value={database} onChange={(e) => onDatabaseChange(e.target.value)} className="max-w-[180px] rounded border border-border px-1.5 py-1 font-sans text-[13px]">
          {databases.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
        </select>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button className="btn primary" disabled={running} onClick={onExecute} title="Executar">
          <Fa name="sql" />
        </button>
        <button className="btn" disabled={running} onClick={onExplain} title="EXPLAIN">
          <Fa name="explain" />
        </button>
        <button className="btn" disabled={running} onClick={onExplainAnalyze} title="EXPLAIN ANALYZE">
          <Fa name="explain-analyze" />
        </button>
        <button className="btn" onClick={onFormat} title="Formatar SQL">
          <Fa name="format" />
        </button>
        <button className="btn" onClick={onGotoLine} title="Ir para linha">
          <Fa name="goto" />
        </button>
        <button className="btn" onClick={onToggleComment} title="Comentar/Descomentar">
          <Fa name="comment" />
        </button>
        <button className="btn" onClick={onUppercase} title="Maiúsculas">
          <Fa name="uppercase" />
        </button>
        <button className="btn" onClick={onLowercase} title="Minúsculas">
          <Fa name="lowercase" />
        </button>
        <button className="btn" onClick={onClear} title="Limpar">
          <Fa name="clear" />
        </button>
        <button className="btn" onClick={onToggleHistory} title="Histórico">
          <Fa name="history" />
        </button>
      </div>
    </div>
  );
}
