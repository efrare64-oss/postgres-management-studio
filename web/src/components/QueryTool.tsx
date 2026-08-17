import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql, PostgreSQL } from '@codemirror/lang-sql';
import { autocompletion, closeBrackets, acceptCompletion, completionStatus } from '@codemirror/autocomplete';
import { indentMore } from '@codemirror/commands';
import { indentOnInput } from '@codemirror/language';
import { highlightSelectionMatches } from '@codemirror/search';
import { EditorView, highlightActiveLine, keymap } from '@codemirror/view';
import type { SQLNamespace } from '@codemirror/lang-sql';
import { api } from '../api';
import { Fa } from '../icons';
import { DataTable } from './ObjectPanel';
import type { CompletionTable, QueryBatch, QueryResult, StudioServer } from '../types';

export interface QueryToolHandle {
  run: (mode: 'execute' | 'explain' | 'explain-analyze') => void;
  clear: () => void;
  toggleHistory: () => void;
}

interface QueryToolProps {
  servers: StudioServer[];
  serverId: string;
  database: string;
  databases: { name: string; size: string }[];
  running: boolean;
  onServerChange: (id: string) => void;
  onDatabaseChange: (db: string) => void;
  onRunningChange: (v: boolean) => void;
}

interface HistoryItem {
  query: string;
  res: QueryBatch | null;
  err: string | null;
  at: Date;
}

const ssmsTheme = EditorView.theme({
  '&': {
    fontFamily: 'Consolas, "Courier New", monospace',
    fontSize: '13px',
  },
  '.cm-gutters': {
    backgroundColor: '#f4f6f8',
    color: '#6b7280',
    borderRight: '1px solid #dde1e6',
  },
  '.cm-activeLine': { backgroundColor: '#eef4fa' },
  '.cm-activeLineGutter': { backgroundColor: '#e9eef4', color: '#1f2328' },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: '#cfe0ef' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#1f2328' },
  '.cm-matchingBracket': { backgroundColor: '#cfe0ef', outline: '1px solid #9db8d0' },
  '.cm-tooltip': {
    fontFamily: '"Roboto", "Segoe UI", Tahoma, Arial, sans-serif',
    fontSize: '13px',
    border: '1px solid #c7c7c7',
    backgroundColor: '#ffffff',
  },
  '.cm-tooltip-autocomplete ul li[aria-selected]': { backgroundColor: '#cfe0ef', color: '#1f2328' },
  '.cm-completionLabel': { fontFamily: 'Consolas, "Courier New", monospace' },
  '.cm-completionDetail': { fontStyle: 'normal', color: '#6b7280' },
});

function buildSchema(tables: CompletionTable[]): { schema: SQLNamespace; defaultSchema: string | undefined } {
  const root: Record<string, Record<string, SQLNamespace>> = {};
  let defaultSchema: string | undefined;

  for (const t of tables) {
    if (!root[t.schema]) root[t.schema] = {};
    const cols: SQLNamespace = {};
    for (const c of t.columns) cols[c.name] = {};
    root[t.schema][t.name] = cols;
    if (!defaultSchema && t.schema === 'public') defaultSchema = t.schema;
  }

  return { schema: root as SQLNamespace, defaultSchema };
}

const QueryTool = forwardRef<QueryToolHandle, QueryToolProps>(function QueryTool(
  { servers, serverId, database, databases, running, onServerChange, onDatabaseChange, onRunningChange },
  ref,
) {
  const [sqlText, setSqlText] = useState('');
  const [completion, setCompletion] = useState<CompletionTable[]>([]);
  const [tab, setTab] = useState('results');
  const [results, setResults] = useState<QueryResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showResults, setShowResults] = useState(true);

  useEffect(() => {
    if (!serverId || !database) { setCompletion([]); return; }
    let cancelled = false;
    api.completionSchema(Number(serverId), database)
      .then((tables) => { if (!cancelled) setCompletion(tables); })
      .catch(() => { if (!cancelled) setCompletion([]); });
    return () => { cancelled = true; };
  }, [serverId, database]);

  const selectedServer = useMemo(
    () => servers.find((s) => String(s.id) === String(serverId)),
    [servers, serverId],
  );

  const { schema, defaultSchema } = useMemo(() => buildSchema(completion), [completion]);

  const extensions = useMemo(() => [
    sql({ dialect: PostgreSQL, schema, defaultSchema, upperCaseKeywords: true }),
    autocompletion(),
    closeBrackets(),
    indentOnInput(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    EditorView.lineWrapping,
    ssmsTheme,
    keymap.of([{
      key: 'Tab',
      run: (view) => {
        if (completionStatus(view.state) === 'active' || completionStatus(view.state) === 'pending') {
          return acceptCompletion(view);
        }
        return indentMore(view);
      },
    }]),
    keymap.of([{
      key: 'Shift-Tab',
      run: (view) => {
        if (completionStatus(view.state)) return acceptCompletion(view);
        return indentMore(view);
      },
    }]),
  ], [schema, defaultSchema]);

  const run = async (mode: 'execute' | 'explain' | 'explain-analyze') => {
    if (!serverId) { setError('Selecione um servidor'); setTab('messages'); return; }
    if (!database) { setError('Selecione um banco'); setTab('messages'); return; }
    if (!sqlText.trim()) { setError('Digite uma query'); setTab('messages'); return; }

    onRunningChange(true);
    setError(null);
    setResults([]);
    setMessages([]);
    try {
      const data = await api.runQuery(
        Number(serverId),
        database,
        sqlText,
        mode === 'explain' || mode === 'explain-analyze',
        mode === 'explain-analyze',
      );
      setResults(data.results);
      setShowResults(true);
      setTab(data.error ? 'messages' : 'results');
      pushHistory(sqlText, data, data.error || null);
      if (data.results.length === 0 && !data.error) {
        pushMessage('Nenhum comando foi executado.');
      }
      data.results.forEach((r, idx) => {
        const label = data.results.length > 1 ? `[${idx + 1}] ` : '';
        if (mode !== 'execute') {
          pushMessage(`${label}EXPLAIN ${mode === 'explain-analyze' ? 'ANALYZE ' : ''}em ${r.duration_ms} ms`);
        } else if (r.columns.length > 0) {
          pushMessage(`${label}SELECT ${r.rows.length} linha(s) em ${r.duration_ms} ms`);
        } else {
          pushMessage(`${label}${r.rows_affected} linha(s) afetada(s) em ${r.duration_ms} ms`);
        }
      });
      if (data.error) pushMessage(data.error);
    } catch (err) {
      setError((err as Error).message);
      setTab('messages');
      pushHistory(sqlText, null, (err as Error).message);
    } finally {
      onRunningChange(false);
    }
  };

  const clear = () => { setSqlText(''); setResults([]); setError(null); setMessages([]); };
  const toggleHistory = () => setHistoryOpen((v) => !v);
  useImperativeHandle(ref, () => ({ run, clear, toggleHistory }), [run, clear, toggleHistory]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault();
        run('execute');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        setShowResults((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [run]);

  const pushMessage = (m: string) => setMessages((ms) => [...ms, m]);
  const pushHistory = (q: string, res: QueryBatch | null, err: string | null) =>
    setHistory((h) => [{ query: q, res, err, at: new Date() }, ...h].slice(0, 50));

  const totalRows = results.reduce((n, r) => n + r.rows.length, 0);

  return (
    <div className="flex h-full w-full flex-col">
      {historyOpen && (
        <div className="max-h-[180px] shrink-0 overflow-auto border-b border-border bg-[#fafafa]">
          {history.length === 0 && <div className="p-5 italic text-muted">Nenhuma query executada.</div>}
          {history.map((h, i) => (
            <div className="flex items-center gap-2 border-b border-[#eee] px-2.5 py-1.5" key={i}>
              <button className="truncate cursor-pointer border-none bg-transparent text-left font-mono text-xs text-pg-blue" onClick={() => setSqlText(h.query)}>{h.query}</button>
              <span className={`ml-auto text-xs whitespace-nowrap text-muted ${h.err ? 'text-danger' : ''}`}>{h.err || `${h.res?.results?.reduce((n, r) => n + r.rows.length + (r.columns.length ? 0 : r.rows_affected), 0) || 0} rows`}</span>
            </div>
          ))}
        </div>
      )}

      <div className={`query-editor border-b border-border ${showResults ? 'shrink-0' : 'min-h-0 flex-1'}`}>
        <CodeMirror
          value={sqlText}
          height={showResults ? '220px' : '100%'}
          theme="light"
          extensions={extensions}
          onChange={(v) => setSqlText(v)}
          placeholder="SELECT * FROM public.tabela;"
        />
      </div>

      {showResults && (
        <div className="min-h-[120px] flex-1 overflow-auto bg-panel-bg">
          {tab === 'results' && (
            results.length > 0 ? (
              <div className="flex flex-col gap-1.5 p-1.5">
                {results.map((r, i) => (
                  <div key={i} className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-border">
                    <div className="flex shrink-0 items-center justify-between border-b border-border bg-[#f0f2f5] px-2.5 py-1">
                      <span className="text-[12px] font-medium text-muted">
                        {results.length > 1 ? `Resultado ${i + 1}` : 'Resultado'}
                        {r.columns.length > 0 ? ` — ${r.rows.length} linha(s)` : ` — ${r.rows_affected} linha(s) afetada(s)`}
                      </span>
                      <span className="text-[11px] text-muted">{r.duration_ms} ms</span>
                    </div>
                    <DataTable headers={r.columns} rows={r.rows.map((row) => row.map((c) => String(c)))} withRowNumbers />
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 italic text-muted">Execute uma query para ver os resultados.</div>
            )
          )}
          {tab === 'messages' && (
            <div className="flex flex-col gap-1.5 p-2">
              {error && <div className="rounded border border-[#e5b3b0] bg-[#fdecea] px-2.5 py-1.5"><pre className="m-0 font-mono text-[13px] text-danger whitespace-pre-wrap">{error}</pre></div>}
              {messages.map((m, i) => <div className="rounded border border-[#cfe3cf] bg-[#eef7ee] px-2.5 py-1.5" key={i}><pre className="m-0 font-mono text-[13px] whitespace-pre-wrap text-[#1a5a1a]">{m}</pre></div>)}
              {!error && messages.length === 0 && <div className="p-5 italic text-muted">Nenhuma mensagem.</div>}
            </div>
          )}
        </div>
      )}

      {showResults && (
        <div className="flex shrink-0 border-t border-border bg-tab-bg">
          <button className={`inline-flex cursor-pointer items-center gap-1.5 border-none border-r border-border px-4 py-1.5 text-[13px] text-[#4a5560] hover:bg-[#d7dbe1] ${tab === 'results' ? 'border-t-2 border-pg-blue bg-panel-bg font-medium' : ''}`} onClick={() => setTab('results')} title="Resultados">
            <Fa name="results" />
            Resultados {results.length > 0 ? `(${totalRows})` : ''}
          </button>
          <button className={`inline-flex cursor-pointer items-center gap-1.5 border-none border-r border-border px-4 py-1.5 text-[13px] text-[#4a5560] hover:bg-[#d7dbe1] ${tab === 'messages' ? 'border-t-2 border-pg-blue bg-panel-bg font-medium' : ''}`} onClick={() => setTab('messages')} title="Mensagens">
            <Fa name="messages" />
            Mensagens {messages.length || error ? `(${messages.length + (error ? 1 : 0)})` : ''}
          </button>
        </div>
      )}

      <div className="shrink-0 border-t border-border-soft bg-[#f4f6f8] px-2.5 py-1 text-xs text-muted">
        {selectedServer ? `${selectedServer.name} / ${database}` : 'Selecione um servidor'}
        {results.length > 0 && ` • ${results.reduce((t, r) => t + r.duration_ms, 0)} ms`}
        {running && ' • executando...'}
      </div>
    </div>
  );
});

export default QueryTool;
