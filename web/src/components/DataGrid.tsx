import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { Fa } from '../icons';
import type { TableData, TableDataSave } from '../types';

interface DataGridProps {
  serverId: number;
  database: string;
  schema: string;
  table: string;
}

const PAGE_SIZE = 100;

export default function DataGrid({ serverId, database, schema, table }: DataGridProps) {
  const { t } = useTranslation();
  const [data, setData] = useState<TableData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [edits, setEdits] = useState<Record<number, Record<number, unknown>>>({});
  const [added, setAdded] = useState<Record<number, unknown>[]>([]);
  const [deleted, setDeleted] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async (off: number) => {
    setLoading(true);
    setError(null);
    try {
      const d = await api.tableData(serverId, database, schema, table, PAGE_SIZE, off);
      setData(d);
      setEdits({});
      setAdded([]);
      setDeleted(new Set());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [serverId, database, schema, table]);

  useEffect(() => { load(offset); }, [load, offset]);

  const dirty = useMemo(
    () => Object.keys(edits).length > 0 || added.length > 0 || deleted.size > 0,
    [edits, added, deleted],
  );

  if (!data) {
    return (
      <div className="p-5">
        {loading && <div className="italic text-muted">{t('dg.loading')}</div>}
        {error && <div className="text-danger">{error}</div>}
      </div>
    );
  }

  const setCell = (rowIdx: number, colIdx: number, value: unknown) => {
    setEdits((e) => ({ ...e, [rowIdx]: { ...(e[rowIdx] || {}), [colIdx]: value } }));
  };

  const setAddedCell = (rowIdx: number, colIdx: number, value: unknown) => {
    setAdded((rows) => rows.map((r, i) => (i === rowIdx ? { ...r, [colIdx]: value } : r)));
  };

  const deleteRow = (rowIdx: number) => {
    const next = new Set(deleted);
    next.has(rowIdx) ? next.delete(rowIdx) : next.add(rowIdx);
    setDeleted(next);
  };

  const addRow = () => setAdded((rows) => [...rows, {}]);

  const removeAdded = (rowIdx: number) => setAdded((rows) => rows.filter((_, i) => i !== rowIdx));

  const save = async () => {
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const saveInput: TableDataSave = { inserts: [], updates: [], deletes: [] };

      for (const [rowIdxStr, cellEdits] of Object.entries(edits)) {
        const rowIdx = Number(rowIdxStr);
        const original = data.rows[rowIdx];
        if (!original) continue;
        const old: Record<string, unknown> = {};
        const next: Record<string, unknown> = {};
        data.columns.forEach((col, ci) => {
          old[col.name] = original[ci];
          next[col.name] = cellEdits[ci] !== undefined ? cellEdits[ci] : original[ci];
        });
        saveInput.updates.push({ old, new: next });
      }

      for (const row of added) {
        const insert: Record<string, unknown> = {};
        data.columns.forEach((col, ci) => {
          const v = row[ci];
          if (v !== undefined && v !== '') insert[col.name] = v;
        });
        if (Object.keys(insert).length) saveInput.inserts.push(insert);
      }

      for (const rowIdx of Array.from(deleted)) {
        const original = data.rows[rowIdx];
        if (!original) continue;
        const old: Record<string, unknown> = {};
        data.columns.forEach((col, ci) => { old[col.name] = original[ci]; });
        saveInput.deletes.push(old);
      }

      const res = await api.saveTableData(serverId, database, schema, table, saveInput);
      setMessage(t('dg.saved', { inserted: res.inserted, updated: res.updated, deleted: res.deleted }));
      await load(offset);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setImportBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await api.importCSV(serverId, database, schema, table, file);
      setMessage(res.message);
      await load(offset);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImportBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border bg-[#f4f6f8] px-3 py-2">
        <span className="text-[13px] text-muted">
          {t('dg.page_info', { total: data.total, page, pages })} {!data.has_pk && <span title={t('dg.no_pk_hint')}>{t('dg.no_pk')}</span>}
        </span>
        <div className="ml-auto flex gap-1.5">
          <button className="btn" onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))} disabled={offset === 0}>{t('dg.prev')}</button>
          <button className="btn" onClick={() => setOffset((o) => o + PAGE_SIZE)} disabled={offset + PAGE_SIZE >= data.total}>{t('dg.next')}</button>
          <button className="btn" onClick={addRow}><Fa name="plus" /> {t('dg.new_row')}</button>
          <label className="btn cursor-pointer" title={t('dg.import_csv')}>
            <Fa name="upload" />
            {' '}{importBusy ? t('dg.importing') : t('dg.import_csv')}
            <input type="file" accept=".csv,text/csv" className="hidden" disabled={importBusy} onChange={onImportFile} />
          </label>
          <a className="btn" href={api.tableDataExportUrl(serverId, database, schema, table)} download>CSV</a>
          <button className="btn primary" onClick={save} disabled={!dirty || busy}>
            {busy ? t('dg.saving') : t('dg.save_changes')}
          </button>
        </div>
      </div>
      {(message || error) && (
        <div className={`shrink-0 border-b border-border px-3 py-1.5 text-[13px] ${error ? 'bg-[#fdecea] text-danger' : 'bg-[#eef7ee] text-[#1a5a1a]'}`}>
          {error || message}
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto border border-border bg-panel-bg">
        <table className="border-collapse text-[13px]">
          <thead>
            <tr>
              <th className="sticky top-0 z-10 w-8 border border-border bg-[#f0f2f5] px-2 py-1 text-left" />
              {data.columns.map((c) => (
                <th key={c.name} className={`sticky top-0 z-10 border border-border whitespace-nowrap bg-[#f0f2f5] px-2 py-1 text-left ${c.is_pk ? 'text-pg-blue' : ''}`}>
                  {c.name}
                  <span className="block text-[11px] font-normal text-muted">{c.data_type}</span>
                </th>
              ))}
              <th className="sticky top-0 z-10 w-8 border border-border bg-[#f0f2f5] px-2 py-1 text-left" />
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row, rowIdx) => {
              const isDeleted = deleted.has(rowIdx);
              const cells = (data.columns as { name: string }[]).map((_, ci) =>
                edits[rowIdx] && edits[rowIdx][ci] !== undefined ? edits[rowIdx][ci] : row[ci],
              );
              return (
                <tr key={rowIdx} className={isDeleted ? 'bg-[#fdecea] opacity-60' : 'hover:bg-hover'}>
                  <td className="border border-[#e2e5e9] px-2 py-1 text-right text-muted">{rowIdx + 1 + offset}</td>
                  {data.columns.map((c, ci) => (
                    <td key={c.name} className="border border-[#e2e5e9] px-0 py-0">
                      <input
                        className="w-full min-w-[120px] border-none bg-transparent px-2 py-1 font-mono focus:bg-[#eef4fa] focus:outline-none"
                        value={cellToString(cells[ci])}
                        onChange={(e) => setCell(rowIdx, ci, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="border border-[#e2e5e9] px-1 py-1 text-center">
                    <button className="icon-btn" title={isDeleted ? t('dg.undo_delete') : t('dg.delete_row')} onClick={() => deleteRow(rowIdx)}>
                      <Fa name={isDeleted ? 'refresh' : 'close'} />
                    </button>
                  </td>
                </tr>
              );
            })}
            {added.map((row, rowIdx) => (
              <tr key={`add-${rowIdx}`} className="bg-[#eef7ee]">
                <td className="border border-[#e2e5e9] px-2 py-1 text-right text-muted">+</td>
                {data.columns.map((c, ci) => (
                  <td key={c.name} className="border border-[#e2e5e9] px-0 py-0">
                    <input
                      className="w-full min-w-[120px] border-none bg-transparent px-2 py-1 font-mono focus:bg-[#eef4fa] focus:outline-none"
                      value={cellToString(row[ci])}
                      onChange={(e) => setAddedCell(rowIdx, ci, e.target.value)}
                    />
                  </td>
                ))}
                <td className="border border-[#e2e5e9] px-1 py-1 text-center">
                  <button className="icon-btn" title={t('dg.remove_new_row')} onClick={() => removeAdded(rowIdx)}>
                    <Fa name="close" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.rows.length && !added.length && <div className="p-5 italic text-muted">{t('dg.empty_table')}</div>}
      </div>
    </div>
  );
}

function cellToString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}
