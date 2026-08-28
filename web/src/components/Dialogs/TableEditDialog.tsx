import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { api } from '../../api';

interface TableEditDialogProps {
  serverId: number;
  database: string;
  schema: string;
  table: string;
  onSaved: () => void;
  onClose: () => void;
}

export default function TableEditDialog({ serverId, database, schema, table, onSaved, onClose }: TableEditDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(table);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.tableDetail(serverId, database, schema, table)
      .then((d) => {
        setName(d.table.name);
        setComment(d.table.comment || '');
      })
      .catch((e) => setError((e as Error).message));
  }, [serverId, database, schema, table]);

  const submit = async () => {
    setError(null);
    if (!name.trim()) { setError(t('dialog.table_edit.required')); return; }
    setBusy(true);
    try {
      await api.patch(
        `/servers/${serverId}/databases/${encodeURIComponent(database)}/schemas/${encodeURIComponent(schema)}/tables/${encodeURIComponent(table)}`,
        {
          ...(name.trim() !== table ? { new_name: name.trim() } : {}),
          comment,
        },
      );
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={t('dialog.table_edit.title')} onClose={onClose} width={440}>
      <div className="form">
        <div className="form-row"><label>{t('dialog.table_edit.schema')}</label><input value={schema} disabled /></div>
        <div className="form-row"><label>{t('dialog.table_edit.name')}</label><input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
        <div className="form-row"><label>{t('dialog.table_edit.comment')}</label><textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} /></div>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="btn" onClick={onClose}>{t('dialog.cancel.button')}</button>
          <button className="btn primary" disabled={busy} onClick={submit}>{busy ? t('dialog.table_edit.saving') : t('dialog.table_edit.save')}</button>
        </div>
      </div>
    </Modal>
  );
}
