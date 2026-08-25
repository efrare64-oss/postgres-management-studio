import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { sql, PostgreSQL } from '@codemirror/lang-sql';
import { autocompletion, closeBrackets, acceptCompletion, completionStatus } from '@codemirror/autocomplete';
import { indentMore, toggleComment } from '@codemirror/commands';
import { indentOnInput } from '@codemirror/language';
import { SearchQuery, findNext, findPrevious, gotoLine, highlightSelectionMatches, replaceAll, replaceNext, search, setSearchQuery } from '@codemirror/search';
import { EditorView, highlightActiveLine, keymap } from '@codemirror/view';
import { EditorSelection } from '@codemirror/state';
import type { SQLNamespace } from '@codemirror/lang-sql';
import { format as formatSqlText } from 'sql-formatter';
import { api } from '../api';
import { Fa } from '../icons';
import { DataTable } from './ObjectPanel';
import Modal from './Dialogs/Modal';
import type { CompletionTable, HistoryItem, QueryBatch, QueryResult, StudioServer } from '../types';

export interface QueryToolHandle {
  run: (mode: 'execute' | 'explain' | 'explain-analyze') => void;
  format: () => void;
  clear: () => void;
  toggleHistory: () => void;
  gotoLine: () => void;
  toggleComment: () => void;
  uppercase: () => void;
  lowercase: () => void;
  openFile: () => void;
  saveFile: () => void;
  saveFileAs: () => void;
  newFile: () => void;
  getTitle: () => string;
  isDirty: () => boolean;
  requestClose: () => boolean;
}

interface QueryToolProps {
  servers: StudioServer[];
  serverId: string;
  database: string;
  databases: { name: string; size: string }[];
  running: boolean;
  initialQuery?: string;
  initialFilename?: string;
  initialSavedSql?: string;
  isActive?: boolean;
  onServerChange: (id: string) => void;
  onDatabaseChange: (db: string) => void;
  onRunningChange: (v: boolean) => void;
  onTitleChange?: (title: string) => void;
  onCloseRequest?: (tabId: string) => void;
  tabId?: string;
}

const ssmsTheme = EditorView.theme({
  '&': {
    fontFamily: 'Consolas, "Courier New", monospace',
    fontSize: '13px',
  },
  '.cm-scroller': { overflow: 'auto' },
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

const FIND_ICON_BTN = 'inline-flex h-[24px] w-[24px] shrink-0 cursor-pointer items-center justify-center rounded-sm border border-transparent bg-transparent text-[12px] text-[#5a6b7d] hover:border-border hover:bg-white hover:text-text';

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

type FileHandleLike = {
  name: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<{
    write: (data: string | Blob) => Promise<void>;
    close: () => Promise<void>;
  }>;
};

type WindowWithFS = Window & {
  showOpenFilePicker?: (opts?: {
    multiple?: boolean;
    types?: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<FileHandleLike[]>;
  showSaveFilePicker?: (opts?: {
    suggestedName?: string;
    types?: { description: string; accept: Record<string, string[]> }[];
  }) => Promise<FileHandleLike>;
};

const QueryTool = forwardRef<QueryToolHandle, QueryToolProps>(function QueryTool(
  {
    servers,
    serverId,
    database,
    databases,
    running,
    initialQuery,
    initialFilename,
    initialSavedSql,
    isActive = false,
    onServerChange,
    onDatabaseChange,
    onRunningChange,
    onTitleChange,
    onCloseRequest,
    tabId,
  },
  ref,
) {
  const [sqlText, setSqlText] = useState(initialQuery || '');
  const [completion, setCompletion] = useState<CompletionTable[]>([]);
  const [tab, setTab] = useState('results');
  const [results, setResults] = useState<QueryResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [showResults, setShowResults] = useState(true);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [filename, setFilename] = useState<string | null>(initialFilename || null);
  const fileHandleRef = useRef<FileHandleLike | null>(null);
  const lastSavedSqlRef = useRef<string>(initialSavedSql ?? initialQuery ?? '');
  const dirtyRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastRunRef = useRef(0);
  const pendingAfterUnsavedRef = useRef<(() => void) | null>(null);
  const [unsavedOpen, setUnsavedOpen] = useState(false);

  useEffect(() => {
    api.queryHistory()
      .then((items) => setHistory(items))
      .catch(() => setHistory([]));
  }, []);

  const clearHistory = async () => {
    try {
      await api.clearQueryHistory();
      setHistory([]);
    } catch { /* ignore */ }
  };

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

  const pushMessage = (m: string) => setMessages((ms) => [...ms, m]);
  const refreshHistory = () => {
    api.queryHistory()
      .then((items) => setHistory(items))
      .catch(() => { /* ignore */ });
  };

  const updateDirty = useCallback((text: string) => {
    const dirty = text !== lastSavedSqlRef.current;
    dirtyRef.current = dirty;
    if (onTitleChange) {
      const base = filename || 'Query Tool';
      onTitleChange(dirty ? `${base} *` : base);
    }
  }, [filename, onTitleChange]);

  useEffect(() => {
    updateDirty(sqlText);
  }, [sqlText, updateDirty]);

  const formatSql = () => {
    const sql = sqlText.trim();
    if (!sql) return;
    try {
      const formatted = formatSqlText(sql, {
        language: 'postgresql',
        keywordCase: 'upper',
        linesBetweenQueries: 1,
      });
      setSqlText(formatted.trim() + '\n');
    } catch {
      setSqlText(sql + '\n');
    }
  };

  const openGotoLine = () => {
    if (!editorView) return;
    gotoLine(editorView);
  };

  const toggleCommentSelection = () => {
    if (!editorView) return;
    toggleComment(editorView);
  };

  const changeSelectionCase = (transform: (value: string) => string) => {
    if (!editorView) return;
    const tr = editorView.state.changeByRange((range) => {
      if (range.empty) return { range };
      const value = editorView.state.doc.sliceString(range.from, range.to);
      const replaced = transform(value);
      return {
        changes: { from: range.from, to: range.to, insert: replaced },
        range: EditorSelection.range(range.from, range.from + replaced.length),
      };
    });
    editorView.dispatch(tr);
  };

  const uppercaseSelection = () => changeSelectionCase((v) => v.toUpperCase());
  const lowercaseSelection = () => changeSelectionCase((v) => v.toLowerCase());

  const [findOpen, setFindOpen] = useState(false);
  const [findTab, setFindTab] = useState<'find' | 'replace'>('find');
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const findInputRef = useRef<HTMLInputElement | null>(null);
  const replaceInputRef = useRef<HTMLInputElement | null>(null);

  const buildFindQuery = useCallback(() => new SearchQuery({
    search: findText,
    replace: replaceText,
    caseSensitive,
    wholeWord,
    regexp: useRegex,
  }), [findText, replaceText, caseSensitive, wholeWord, useRegex]);

  const applyFindQuery = (): boolean => {
    if (!editorView || !findText.trim()) return false;
    const q = buildFindQuery();
    if (!q.valid) return false;
    editorView.dispatch({ effects: setSearchQuery.of(q) });
    return true;
  };

  const runFindCommand = (cmd: (view: EditorView) => void) => {
    if (applyFindQuery() && editorView) cmd(editorView);
  };
  const doFindNext = () => runFindCommand(findNext);
  const doFindPrevious = () => runFindCommand(findPrevious);
  const doReplaceNext = () => runFindCommand(replaceNext);
  const doReplaceAll = () => runFindCommand(replaceAll);

  const closeFind = () => {
    setFindOpen(false);
    editorView?.focus();
  };

  const openFind = (tab: 'find' | 'replace') => {
    if (editorView) {
      const sel = editorView.state.selection.main;
      if (!sel.empty) {
        const text = editorView.state.sliceDoc(sel.from, sel.to).trim();
        if (text && !text.includes('\n')) setFindText(text);
      }
    }
    setFindTab(tab);
    setFindOpen(true);
  };

  useEffect(() => {
    if (!findOpen) return;
    const t = window.setTimeout(() => {
      const el = (findTab === 'replace' ? replaceInputRef : findInputRef).current ?? findInputRef.current;
      el?.focus();
      el?.select();
    }, 30);
    return () => window.clearTimeout(t);
  }, [findOpen, findTab]);

  const findMatchCount = useMemo(() => {
    if (!findOpen || !editorView || !findText.trim()) return null;
    const q = buildFindQuery();
    if (!q.valid) return -1;
    let n = 0;
    try {
      const cursor = q.getCursor(editorView.state.doc);
      while (!cursor.next().done) {
        n++;
        if (n >= 10000) break;
      }
    } catch {
      return -1;
    }
    return n;
  }, [findOpen, editorView, findText, sqlText, buildFindQuery]);

  const downloadCsv = () => {
    const csvResults = results.filter((r) => r.columns.length > 0);
    if (csvResults.length === 0) return;
    const escapeCell = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v);
      return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    };
    const blocks = csvResults.map((r) => [
      r.columns.map(escapeCell).join(','),
      ...r.rows.map((row) => row.map(escapeCell).join(',')),
    ]);
    const lines = blocks.map((block) => block.join('\r\n')).join('\r\n\r\n');
    const blob = new Blob([lines], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query_result_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getActiveSql = useCallback((): string => {
    if (editorView) {
      const sel = editorView.state.selection.main;
      if (!sel.empty) {
        const slice = editorView.state.doc.sliceString(sel.from, sel.to);
        if (slice.trim()) return slice;
      }
    }
    return sqlText;
  }, [editorView, sqlText]);

  const run = async (mode: 'execute' | 'explain' | 'explain-analyze') => {
    if (!serverId) { setError('Selecione um servidor'); setTab('messages'); return; }
    if (!database) { setError('Selecione um banco'); setTab('messages'); return; }
    const text = getActiveSql();
    if (!text.trim()) { setError('Digite uma query'); setTab('messages'); return; }

    const now = Date.now();
    if (now - lastRunRef.current < 250) return;
    lastRunRef.current = now;

    onRunningChange(true);
    setError(null);
    setResults([]);
    setMessages([]);
    try {
      const data = await api.runQuery(
        Number(serverId),
        database,
        text,
        mode === 'explain' || mode === 'explain-analyze',
        mode === 'explain-analyze',
      );
      setResults(data.results ?? []);
      setShowResults(true);
      setTab(data.error ? 'messages' : 'results');
      const results = data.results ?? [];
      if (results.length === 0 && !data.error) {
        pushMessage('Nenhum comando foi executado.');
      }
      results.forEach((r, idx) => {
        const label = results.length > 1 ? `[${idx + 1}] ` : '';
        const rows = r.rows ?? [];
        const columns = r.columns ?? [];
        if (mode !== 'execute') {
          pushMessage(`${label}EXPLAIN ${mode === 'explain-analyze' ? 'ANALYZE ' : ''}em ${r.duration_ms} ms`);
        } else if (columns.length > 0) {
          pushMessage(`${label}SELECT ${rows.length} linha(s) em ${r.duration_ms} ms`);
        } else {
          pushMessage(`${label}${r.rows_affected} linha(s) afetada(s) em ${r.duration_ms} ms`);
        }
      });
      if (data.error) pushMessage(data.error);
      refreshHistory();
    } catch (err) {
      setError((err as Error).message);
      setTab('messages');
      refreshHistory();
    } finally {
      onRunningChange(false);
    }
  };

  const writeBlob = (name: string, content: string) => {
    const blob = new Blob([content], { type: 'text/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const performSave = async (handle: FileHandleLike | null, suggestedName?: string) => {
    const targetName = handle?.name || suggestedName || filename || 'query.sql';
    try {
      if (handle) {
        const writable = await handle.createWritable();
        await writable.write(sqlText);
        await writable.close();
      } else {
        writeBlob(targetName, sqlText);
      }
      fileHandleRef.current = handle;
      setFilename(targetName);
      lastSavedSqlRef.current = sqlText;
      updateDirty(sqlText);
      pushMessage(`Arquivo salvo: ${targetName}`);
      setTab('messages');
    } catch (err) {
      setError(`Falha ao salvar: ${(err as Error).message}`);
      setTab('messages');
    }
  };

  const saveFile = async () => {
    const fs = window as WindowWithFS;
    if (fileHandleRef.current) {
      await performSave(fileHandleRef.current);
      return;
    }
    await saveFileAs();
  };

  const saveFileAs = async () => {
    const fs = window as WindowWithFS;
    const suggestedName = filename || 'query.sql';
    try {
      if (fs.showSaveFilePicker) {
        const handle = await fs.showSaveFilePicker({
          suggestedName,
          types: [{ description: 'SQL', accept: { 'text/sql': ['.sql'], 'text/plain': ['.txt'] } }],
        });
        await performSave(handle, handle.name || suggestedName);
      } else {
        performSave(null, suggestedName);
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError(`Falha ao salvar: ${(err as Error).message}`);
      setTab('messages');
    }
  };

  const loadFromFile = (name: string, content: string, handle: FileHandleLike | null) => {
    setSqlText(content);
    lastSavedSqlRef.current = content;
    dirtyRef.current = false;
    fileHandleRef.current = handle;
    setFilename(name);
    if (onTitleChange) onTitleChange(name);
  };

  const openFile = async () => {
    const fs = window as WindowWithFS;
    try {
      if (fs.showOpenFilePicker) {
        const [handle] = await fs.showOpenFilePicker({
          multiple: false,
          types: [{ description: 'SQL', accept: { 'text/sql': ['.sql'], 'text/plain': ['.txt'] } }],
        });
        const file = await handle.getFile();
        const content = await file.text();
        loadFromFile(file.name, content, handle);
      } else if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError(`Falha ao abrir: ${(err as Error).message}`);
      setTab('messages');
    }
  };

  const onFallbackFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const content = await file.text();
    loadFromFile(file.name, content, null);
  };

  const newFile = () => guardUnsaved(() => {
    setSqlText('');
    lastSavedSqlRef.current = '';
    dirtyRef.current = false;
    fileHandleRef.current = null;
    setFilename(null);
    setResults([]);
    setMessages([]);
    setError(null);
    if (onTitleChange) onTitleChange('Query Tool');
  });

  const clear = () => { setSqlText(''); setResults([]); setError(null); setMessages([]); };
  const toggleHistory = () => setHistoryOpen((v) => !v);

  const guardUnsaved = useCallback((action: () => void) => {
    if (!dirtyRef.current) { action(); return; }
    pendingAfterUnsavedRef.current = action;
    setUnsavedOpen(true);
  }, []);

  const handleUnsavedCancel = () => {
    setUnsavedOpen(false);
    pendingAfterUnsavedRef.current = null;
  };

  const handleUnsavedDiscard = () => {
    setUnsavedOpen(false);
    const act = pendingAfterUnsavedRef.current;
    pendingAfterUnsavedRef.current = null;
    act?.();
  };

  const handleUnsavedSave = async () => {
    await saveFile();
    if (dirtyRef.current) return;
    setUnsavedOpen(false);
    const act = pendingAfterUnsavedRef.current;
    pendingAfterUnsavedRef.current = null;
    act?.();
  };

  useEffect(() => {
    if (!isActive) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F5') {
        e.preventDefault();
        e.stopPropagation();
        run('execute');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        saveFileAs();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        saveFile();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'f' || e.key === 'F')) {
        e.preventDefault();
        e.stopPropagation();
        openFind('find');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        e.stopPropagation();
        openFind('replace');
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'o' || e.key === 'O')) {
        e.preventDefault();
        openFile();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        newFile();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        setShowResults((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [isActive, run, saveFile, saveFileAs, openFile, newFile, openFind]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const editorHandlersRef = useRef({ run, formatSql, openGotoLine, toggleCommentSelection, uppercaseSelection, lowercaseSelection });
  editorHandlersRef.current = { run, formatSql, openGotoLine, toggleCommentSelection, uppercaseSelection, lowercaseSelection };

  const extensions = useMemo(() => [
    sql({ dialect: PostgreSQL, schema, defaultSchema, upperCaseKeywords: true }),
    autocompletion(),
    closeBrackets(),
    indentOnInput(),
    highlightActiveLine(),
    highlightSelectionMatches(),
    search(),
    EditorView.lineWrapping,
    ssmsTheme,
    keymap.of([{
      key: 'F5',
      run: () => { editorHandlersRef.current.run('execute'); return true; },
    }, {
      key: 'Mod-Enter',
      run: () => { editorHandlersRef.current.run('execute'); return true; },
    }, {
      key: 'Mod-Shift-f',
      run: () => { editorHandlersRef.current.formatSql(); return true; },
    }, {
      key: 'Mod-/',
      run: () => { editorHandlersRef.current.toggleCommentSelection(); return true; },
    }, {
      key: 'Mod-Shift-U',
      run: () => { editorHandlersRef.current.uppercaseSelection(); return true; },
    }, {
      key: 'Mod-Shift-L',
      run: () => { editorHandlersRef.current.lowercaseSelection(); return true; },
    }, {
      key: 'Mod-Shift-g',
      run: () => { editorHandlersRef.current.openGotoLine(); return true; },
    }, {
      key: 'Tab',
      run: (view) => {
        if (completionStatus(view.state) === 'active' || completionStatus(view.state) === 'pending') {
          return acceptCompletion(view);
        }
        return indentMore(view);
      },
    }, {
      key: 'Shift-Tab',
      run: (view) => {
        if (completionStatus(view.state)) return acceptCompletion(view);
        return indentMore(view);
      },
    }]),
  ], [schema, defaultSchema]);

  useImperativeHandle(ref, () => ({
    run,
    format: formatSql,
    clear,
    toggleHistory,
    gotoLine: openGotoLine,
    toggleComment: toggleCommentSelection,
    uppercase: uppercaseSelection,
    lowercase: lowercaseSelection,
    openFile,
    saveFile,
    saveFileAs,
    newFile,
    getTitle: () => filename || 'Query Tool',
    isDirty: () => dirtyRef.current,
    requestClose: () => {
      if (dirtyRef.current && tabId && onCloseRequest) {
        guardUnsaved(() => onCloseRequest(tabId));
        return false;
      }
      return !dirtyRef.current;
    },
  }), [run, formatSql, clear, toggleHistory, openGotoLine, toggleCommentSelection, uppercaseSelection, lowercaseSelection, openFile, saveFile, saveFileAs, newFile, filename, guardUnsaved, tabId, onCloseRequest]);

  useEffect(() => {
    if (!tabId || !onCloseRequest) return;
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ tabId: string }>;
      if (ce.detail?.tabId === tabId) {
        guardUnsaved(() => onCloseRequest(tabId));
      }
    };
    window.addEventListener('pgms:close-tab', handler);
    return () => window.removeEventListener('pgms:close-tab', handler);
  }, [tabId, onCloseRequest, guardUnsaved]);

  const totalRows = results.reduce((n, r) => n + r.rows.length, 0);

  return (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden">
      <input
        ref={fileInputRef}
        type="file"
        accept=".sql,.txt,text/sql,text/plain"
        className="hidden"
        onChange={onFallbackFileChange}
      />
      {historyOpen && (
        <div className="max-h-[180px] shrink-0 overflow-auto border-b border-border bg-[#fafafa]">
          <div className="flex items-center justify-between border-b border-[#eee] px-2.5 py-1">
            <span className="text-xs font-medium text-muted">Histórico persistido</span>
            <button className="cursor-pointer border-none bg-transparent text-xs text-danger" onClick={clearHistory}>Limpar histórico</button>
          </div>
          {history.length === 0 && <div className="p-5 italic text-muted">Nenhuma query no histórico.</div>}
          {history.map((h) => (
            <div className="flex items-center gap-2 border-b border-[#eee] px-2.5 py-1.5" key={h.id}>
              <button className="truncate cursor-pointer border-none bg-transparent text-left font-mono text-xs text-pg-blue" onClick={() => setSqlText(h.query)}>{h.query}</button>
              <span className="ml-auto shrink-0 text-xs text-muted">{h.database}</span>
              <span className={`shrink-0 text-xs whitespace-nowrap ${h.success ? 'text-muted' : 'text-danger'}`}>{h.success ? 'ok' : 'erro'}</span>
            </div>
          ))}
        </div>
      )}

      <div className={`query-editor flex min-h-0 flex-col border-b border-border ${showResults ? 'shrink-0' : 'min-h-0 flex-1'}`}>
        <div className="relative min-h-[220px] flex-1">
          <CodeMirror
            value={sqlText}
            height="100%"
            className="h-full"
            theme="light"
            extensions={extensions}
            basicSetup={{ searchKeymap: false }}
            onChange={(v) => setSqlText(v)}
            onCreateEditor={(view) => setEditorView(view)}
            placeholder="SELECT * FROM public.tabela;"
          />
          {findOpen && (
            <div className="absolute right-3 top-2 z-30 w-[350px] rounded-md border border-[#aeb9c4] bg-[#fbfcfe] shadow-[0_10px_28px_rgba(20,35,55,0.28)]">
              <div className="flex items-center gap-0.5 border-b border-border-soft px-1 pt-0.5">
                <button
                  className={`cursor-pointer border-none bg-transparent px-2 py-1 text-[12px] ${findTab === 'find' ? 'border-b-2 border-pg-blue font-medium text-text' : 'text-muted hover:text-text'}`}
                  onClick={() => setFindTab('find')}
                >
                  Localizar
                </button>
                <button
                  className={`cursor-pointer border-none bg-transparent px-2 py-1 text-[12px] ${findTab === 'replace' ? 'border-b-2 border-pg-blue font-medium text-text' : 'text-muted hover:text-text'}`}
                  onClick={() => setFindTab('replace')}
                >
                  Substituir
                </button>
                <span className="ml-auto pr-1 text-[10px] text-muted">
                  {findMatchCount == null ? '' : findMatchCount === -1 ? 'regex inválida' : `${findMatchCount} corr.`}
                </span>
                <button className={FIND_ICON_BTN} title="Fechar (Esc)" onClick={closeFind}><Fa name="close" /></button>
              </div>
              <div className="flex flex-col gap-1.5 px-2 py-2">
                <div className="flex items-center gap-1.5">
                  <label className="w-[58px] shrink-0 text-right text-[11px] text-muted">Localizar:</label>
                  <input
                    ref={findInputRef}
                    value={findText}
                    onChange={(e) => setFindText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') { e.preventDefault(); closeFind(); }
                      else if (e.key === 'Enter') { e.preventDefault(); if (e.shiftKey) doFindPrevious(); else doFindNext(); }
                    }}
                    placeholder="Texto ou expressão"
                    className="h-7 min-w-0 flex-1 rounded-sm border border-border bg-white px-1.5 font-mono text-[12px] outline-none focus:border-pg-blue"
                  />
                  <button className={FIND_ICON_BTN} title="Anterior (Shift+Enter)" onClick={doFindPrevious}><Fa name="chevron-up" /></button>
                  <button className={FIND_ICON_BTN} title="Próximo (Enter)" onClick={doFindNext}><Fa name="chevron-down" /></button>
                </div>
                {findTab === 'replace' && (
                  <div className="flex items-center gap-1.5">
                    <label className="w-[58px] shrink-0 text-right text-[11px] text-muted">Substituir:</label>
                    <input
                      ref={replaceInputRef}
                      value={replaceText}
                      onChange={(e) => setReplaceText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') { e.preventDefault(); closeFind(); }
                        else if (e.key === 'Enter') { e.preventDefault(); doReplaceNext(); }
                      }}
                      placeholder="Novo texto"
                      className="h-7 min-w-0 flex-1 rounded-sm border border-border bg-white px-1.5 font-mono text-[12px] outline-none focus:border-pg-blue"
                    />
                    <button className={FIND_ICON_BTN} title="Substituir (Enter)" onClick={doReplaceNext}><Fa name="replace-one" /></button>
                    <button className={FIND_ICON_BTN} title="Substituir tudo" onClick={doReplaceAll}><Fa name="replace-every" /></button>
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-[64px]">
                  <label className="flex cursor-pointer select-none items-center gap-1 text-[11px] text-[#374151]">
                    <input type="checkbox" checked={caseSensitive} onChange={(e) => setCaseSensitive(e.target.checked)} />
                    Maiúsculas/minúsculas
                  </label>
                  <label className="flex cursor-pointer select-none items-center gap-1 text-[11px] text-[#374151]">
                    <input type="checkbox" checked={wholeWord} onChange={(e) => setWholeWord(e.target.checked)} />
                    Palavra inteira
                  </label>
                  <label className="flex cursor-pointer select-none items-center gap-1 text-[11px] text-[#374151]">
                    <input type="checkbox" checked={useRegex} onChange={(e) => setUseRegex(e.target.checked)} />
                    Regex
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {showResults && (
        <div className="min-h-0 flex-1 overflow-auto bg-panel-bg">
          {tab === 'results' && (
            results.length > 0 ? (
              <div className="flex flex-col gap-1.5 p-1.5">
                {results.map((r, i) => {
                  const rows = r.rows ?? [];
                  const columns = r.columns ?? [];
                  return (
                    <div key={i} className="flex min-h-0 flex-1 flex-col overflow-hidden rounded border border-border">
                      <div className="flex shrink-0 items-center justify-between border-b border-border bg-[#f0f2f5] px-2.5 py-1">
                        <span className="text-[12px] font-medium text-muted">
                          {results.length > 1 ? `Resultado ${i + 1}` : 'Resultado'}
                          {columns.length > 0 ? ` — ${rows.length} linha(s)` : ` — ${r.rows_affected} linha(s) afetada(s)`}
                        </span>
                        <span className="text-[11px] text-muted">{r.duration_ms} ms</span>
                      </div>
                      <DataTable headers={columns} rows={rows.map((row) => (row ?? []).map((c) => String(c ?? '')))} withRowNumbers selectable />
                    </div>
                  );
                })}
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
          <button className={`cursor-pointer border-none border-r border-border px-4 py-1.5 text-[13px] text-[#4a5560] hover:bg-[#d7dbe1] ${tab === 'results' ? 'border-t-2 border-pg-blue bg-panel-bg font-medium' : ''}`} onClick={() => setTab('results')}>
            Resultados {results.length > 0 ? `(${totalRows})` : ''}
          </button>
          <button className={`cursor-pointer border-none border-r border-border px-4 py-1.5 text-[13px] text-[#4a5560] hover:bg-[#d7dbe1] ${tab === 'messages' ? 'border-t-2 border-pg-blue bg-panel-bg font-medium' : ''}`} onClick={() => setTab('messages')}>
            Mensagens {messages.length || error ? `(${messages.length + (error ? 1 : 0)})` : ''}
          </button>
          {results.some((r) => r.columns.length > 0) && (
            <button className="ml-auto cursor-pointer border-none border-l border-border px-4 py-1.5 text-[13px] text-pg-blue hover:bg-[#d7dbe1]" onClick={downloadCsv} title="Baixar resultados em CSV">
              Baixar CSV
            </button>
          )}
        </div>
      )}

      <div className="shrink-0 border-t border-border-soft bg-[#f4f6f8] px-2.5 py-1 text-xs text-muted">
        {selectedServer ? `${selectedServer.name} / ${database}` : 'Selecione um servidor'}
        {filename && ` • ${filename}${dirtyRef.current ? ' (modificado)' : ''}`}
        {results.length > 0 && ` • ${results.reduce((t, r) => t + r.duration_ms, 0)} ms`}
        {running && ' • executando...'}
      </div>

      {unsavedOpen && (
        <Modal title="Alterações não salvas" onClose={handleUnsavedCancel} width={440}>
          <div className="form">
            <p className="text-[13px] text-[#374151]">O editor contém alterações não salvas. Deseja salvá-las antes de fechar?</p>
            <div className="form-actions">
              <button className="btn" onClick={handleUnsavedCancel}>Cancelar</button>
              <button className="btn" onClick={handleUnsavedDiscard}>Não salvar</button>
              <button className="btn primary" onClick={handleUnsavedSave}>Salvar</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
});

export default QueryTool;
