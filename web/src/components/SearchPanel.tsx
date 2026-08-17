import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { Fa } from '../icons';
import type { SearchObject, TreeNode } from '../types';

interface SearchPanelProps {
  open: boolean;
  onClose: () => void;
  serverId: number | null;
  database: string | null;
  initialQuery: string;
  onOpenObject: (node: TreeNode) => void;
}

export default function SearchPanel({ open, onClose, serverId, database, initialQuery, onOpenObject }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<SearchObject[] | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery);
    setError(null);
    setResults(null);
    window.setTimeout(() => inputRef.current?.focus(), 50);
    if (initialQuery.trim()) runSearch(initialQuery);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open) {
      setError(null);
      setResults(null);
    }
  }, [serverId, database, open]);

  async function runSearch(q?: string) {
    const text = (q ?? query).trim();
    if (!text) { setError('Digite um termo para buscar.'); setResults(null); return; }
    if (serverId == null || !database) {
      setError('Selecione um servidor e banco na aba em foco.');
      setResults(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await api.searchObjects(serverId, database, text);
      setResults(data);
    } catch (e) {
      setError((e as Error).message);
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  const openObject = (o: SearchObject) => {
    onOpenObject({
      key: `search:${serverId}:${database}:${o.schema}:${o.name}:${o.kind}`,
      type: o.kind,
      label: o.name,
      icon: o.kind.replace(' ', '_'),
      loadable: false,
      serverId: serverId ?? undefined,
      database,
      schema: o.schema,
      name: o.name,
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-40 flex w-[400px] shrink-0 flex-col border-l border-border bg-[#f6f7f8] shadow-2xl">
      <div className="flex shrink-0 items-center gap-1.5 border-b border-border bg-toolbar-bg px-2.5 py-2">
        <Fa name="search" className="shrink-0 text-muted" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
          placeholder={serverId != null && database ? `Buscar objetos em ${database}...` : 'Selecione servidor/banco na aba'}
          className="h-7 w-full rounded-sm border border-border bg-white px-2 text-[13px] outline-none"
        />
        <button className="icon-btn" onClick={() => runSearch()} title="Buscar" disabled={loading || serverId == null || !database}>
          <Fa name="search" />
        </button>
        <button className="icon-btn" onClick={onClose} title="Fechar busca"><Fa name="close" /></button>
      </div>

      <div className="min-h-0 flex-1 overflow-auto bg-white">
        {error ? (
          <div className="border-b border-border-soft bg-[#fdecea] px-2.5 py-1.5 text-[13px] text-danger">{error}</div>
        ) : loading ? (
          <div className="px-3 py-2 text-[13px] italic text-muted">Buscando...</div>
        ) : results === null ? (
          <div className="px-3 py-2 text-[13px] italic text-muted">Digite um termo e pressione Enter.</div>
        ) : results.length === 0 ? (
          <div className="px-3 py-2 text-[13px] italic text-muted">Nenhum objeto encontrado.</div>
        ) : (
          <div className="py-0.5">
            {results.map((o, i) => (
              <div
                key={i}
                className="flex cursor-pointer items-center gap-2 px-2.5 py-[5px] hover:bg-hover"
                onClick={() => openObject(o)}
                title={`${o.schema}.${o.name} (${o.kind})`}
              >
                <Fa name={o.kind.replace(' ', '_')} className="w-4 shrink-0 text-pg-blue" />
                <span className="truncate text-[13px] text-text">{o.name}</span>
                <span className="truncate text-[11px] text-muted">{o.kind}</span>
                <span className="ml-auto shrink-0 text-[11px] text-muted">{o.schema}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2 border-t border-border bg-[#f0f2f4] px-2.5 py-1 text-[11px] text-muted">
        <span>{results ? `${results.length} objeto(s)` : '0 objetos'}</span>
        <span className="ml-auto truncate">{database ? database : 'Sem banco selecionado'}</span>
      </div>
    </div>
  );
}