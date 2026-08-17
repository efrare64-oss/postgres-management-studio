import { useCallback, useEffect, useState } from 'react';
import Modal from './Modal';
import { api } from '../../api';
import { Fa } from '../../icons';
import type { BackupOptions, DatabaseInfo, ToolBinary } from '../../types';

interface BackupDialogProps {
  serverId: number;
  database?: string | null;
  table?: string | null;
  onClose: () => void;
}

export default function BackupDialog({ serverId, database, table, onClose }: BackupDialogProps) {
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [binaries, setBinaries] = useState<ToolBinary[]>([]);
  const [form, setForm] = useState<BackupOptions>({
    database: database || '',
    format: 'custom',
    filename: '',
    gzip: false,
    jobs: 1,
    data_only: false,
    schema_only: false,
    schema: '',
    table: table || '',
    verbose: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.databases(serverId)
      .then((dbs) => {
        setDatabases(dbs);
        setForm((f) => ({ ...f, database: f.database || (dbs[0]?.name ?? '') }));
      })
      .catch((e) => setError((e as Error).message));
    api.toolsBinaries().then(setBinaries).catch(() => setBinaries([]));
  }, [serverId]);

  const pgDump = binaries.find((b) => b.name === 'pg_dump');

  const set = <K extends keyof BackupOptions>(k: K, v: BackupOptions[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError(null);
    if (!form.database) { setError('Informe o banco.'); return; }
    if (form.data_only && form.schema_only) { setError('Data-only e Schema-only são mutuamente exclusivos.'); return; }
    setBusy(true);
    try {
      const res = await api.backup(serverId, form);
      const url = URL.createObjectURL(res.blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const check = (k: 'gzip' | 'data_only' | 'schema_only' | 'verbose', label: string) => (
    <label className="col-check">
      <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked as never)} /> {label}
    </label>
  );

  return (
    <Modal title="Backup" onClose={onClose} width={520}>
      <div className="form">
        {pgDump && !pgDump.found && (
          <div className="form-error">
            <Fa name="info" className="mr-1" />
            {pgDump.message || 'pg_dump não encontrado'}
          </div>
        )}

        <div className="form-row">
          <label>Banco</label>
          <select value={form.database} onChange={(e) => set('database', e.target.value)}>
            {databases.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>
        </div>

        <div className="form-row">
          <label>Formato</label>
          <select value={form.format} onChange={(e) => set('format', e.target.value as BackupOptions['format'])}>
            <option value="custom">Custom (*.backup)</option>
            <option value="plain">Plain (SQL)</option>
            <option value="tar">Tar</option>
          </select>
        </div>

        <div className="form-row">
          <label>Nome do arquivo</label>
          <input value={form.filename} onChange={(e) => set('filename', e.target.value)} placeholder="Deixe em branco para usar o padrão" />
        </div>

        {form.format === 'custom' && (
          <div className="form-row">
            <label>Jobs (paralelismo)</label>
            <input type="number" min={1} value={form.jobs} onChange={(e) => set('jobs', Number(e.target.value) || 1)} />
          </div>
        )}

        <div className="form-row check-group">
          {check('gzip', 'Comprimir (Gzip)')}
          {check('data_only', 'Somente dados')}
          {check('schema_only', 'Somente schema')}
          {check('verbose', 'Verbose')}
        </div>

        <div className="form-row">
          <label>Filtrar schema</label>
          <input value={form.schema} onChange={(e) => set('schema', e.target.value)} placeholder="ex.: public" />
        </div>

        <div className="form-row">
          <label>Filtrar tabela</label>
          <input value={form.table} onChange={(e) => set('table', e.target.value)} placeholder={table || 'ex.: public.minha_tabela'} />
        </div>

        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={busy || !pgDump?.found} onClick={submit}>
            {busy ? 'Gerando backup...' : 'Backup'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
