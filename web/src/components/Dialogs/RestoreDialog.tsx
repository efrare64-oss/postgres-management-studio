import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { api } from '../../api';
import { Fa } from '../../icons';
import type { DatabaseInfo, RestoreOptions, ToolBinary } from '../../types';

interface RestoreDialogProps {
  serverId: number;
  database?: string | null;
  onClose: () => void;
}

export default function RestoreDialog({ serverId, database, onClose }: RestoreDialogProps) {
  const { t } = useTranslation();
  const [databases, setDatabases] = useState<DatabaseInfo[]>([]);
  const [binaries, setBinaries] = useState<ToolBinary[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState<RestoreOptions>({
    database: database || '',
    format: 'auto',
    clean: false,
    create: false,
    data_only: false,
    schema_only: false,
    jobs: 1,
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

  const pgRestore = binaries.find((b) => b.name === 'pg_restore');
  const psql = binaries.find((b) => b.name === 'psql');
  const plain = form.format === 'plain';

  const set = <K extends keyof RestoreOptions>(k: K, v: RestoreOptions[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const requiredOk = plain ? (psql?.found ?? false) : (pgRestore?.found ?? false);

  const submit = async () => {
    setError(null);
    if (!file) { setError(t('dialog.restore.required_file')); return; }
    if (!form.database) { setError(t('dialog.restore.required_db')); return; }
    if (form.data_only && form.schema_only) { setError(t('dialog.restore.required_exclusive')); return; }
    setBusy(true);
    try {
      await api.restore(serverId, form, file);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const check = (k: 'clean' | 'create' | 'data_only' | 'schema_only' | 'verbose', label: string) => (
    <label className="col-check">
      <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked as never)} /> {label}
    </label>
  );

  return (
    <Modal title={t('dialog.restore.title')} onClose={onClose} width={520}>
      <div className="form">
        {!requiredOk && (
          <div className="form-error">
            <Fa name="info" className="mr-1" />
            {(plain ? psql : pgRestore)?.message || t('dialog.restore.binary_not_found')}
          </div>
        )}

        <div className="form-row">
          <label>{t('dialog.restore.backup_file')}</label>
          <input type="file" accept=".backup,.tar,.sql,.gz,.dump,application/octet-stream,text/plain" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        </div>

        <div className="form-row">
          <label>{t('dialog.restore.target_db')}</label>
          <select value={form.database} onChange={(e) => set('database', e.target.value)}>
            {databases.map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}
          </select>
        </div>

        <div className="form-row">
          <label>{t('dialog.restore.format')}</label>
          <select value={form.format} onChange={(e) => set('format', e.target.value as RestoreOptions['format'])}>
            <option value="auto">{t('dialog.restore.auto_detect')}</option>
            <option value="plain">Plain (SQL) — via psql</option>
            <option value="custom">Custom</option>
            <option value="tar">Tar</option>
          </select>
        </div>

        <div className="form-row check-group">
          {!plain && check('clean', t('dialog.restore.clean'))}
          {!plain && check('create', t('dialog.restore.create_db'))}
          {check('data_only', t('dialog.restore.data_only'))}
          {check('schema_only', t('dialog.restore.schema_only'))}
          {check('verbose', t('dialog.restore.verbose'))}
        </div>

        {!plain && (
          <div className="form-row">
            <label>{t('dialog.restore.jobs')}</label>
            <input type="number" min={1} value={form.jobs} onChange={(e) => set('jobs', Number(e.target.value) || 1)} />
          </div>
        )}

        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="btn" onClick={onClose}>{t('dialog.cancel.button')}</button>
          <button className="btn primary" disabled={busy || !requiredOk} onClick={submit}>
            {busy ? t('dialog.restore.restoring') : t('dialog.restore.title')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
