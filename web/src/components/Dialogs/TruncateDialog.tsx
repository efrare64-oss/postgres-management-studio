import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { api } from '../../api';

interface TruncateDialogProps {
  serverId: number;
  database: string;
  schema: string;
  table: string;
  onSaved: () => void;
  onClose: () => void;
}

export default function TruncateDialog({ serverId, database, schema, table, onSaved, onClose }: TruncateDialogProps) {
  const { t } = useTranslation();
  const [restartIdentity, setRestartIdentity] = useState(false);
  const [cascade, setCascade] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      await api.truncateTable(serverId, database, schema, table, restartIdentity, cascade);
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Truncate ${schema}.${table}`} onClose={onClose} width={480}>
      <div className="form">
        <p className="mb-2.5 text-[13px] text-muted">{t('dialog.truncate.warning')}</p>
        <label className="inline-flex items-center gap-2 text-[13px]"><input type="checkbox" checked={restartIdentity} onChange={(e) => setRestartIdentity(e.target.checked)} /> RESTART IDENTITY</label>
        <label className="inline-flex items-center gap-2 text-[13px]"><input type="checkbox" checked={cascade} onChange={(e) => setCascade(e.target.checked)} /> CASCADE</label>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="btn" onClick={onClose}>{t('dialog.cancel.button')}</button>
          <button className="btn danger" disabled={busy} onClick={submit}>{busy ? t('dialog.truncate.truncating') : t('dialog.truncate.title')}</button>
        </div>
      </div>
    </Modal>
  );
}