import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { api } from '../../api';

const RANGE_EXAMPLE = "FROM ('2024-01-01') TO ('2025-01-01')";
const LIST_EXAMPLE = "IN (1, 2, 3)";
const HASH_EXAMPLE = "WITH (modulus 4, remainder 0)";

interface PartitionDialogProps {
  mode: 'add' | 'attach';
  serverId: number;
  database: string;
  schema: string;
  table: string;
  onSaved: () => void;
  onClose: () => void;
}

export default function PartitionDialog({ mode, serverId, database, schema, table, onSaved, onClose }: PartitionDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [partition, setPartition] = useState('');
  const [bounds, setBounds] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (mode === 'add') {
      if (!name.trim() || !bounds.trim()) { setError(t('dialog.partition.required_name')); return; }
    } else if (!partition.trim() || !bounds.trim()) { setError(t('dialog.partition.required_table')); return; }
    setBusy(true);
    try {
      if (mode === 'add') {
        await api.addPartition(serverId, database, schema, table, name.trim(), bounds.trim());
      } else {
        await api.attachPartition(serverId, database, schema, table, partition.trim(), bounds.trim());
      }
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={mode === 'add' ? t('dialog.partition.title_add', { table }) : t('dialog.partition.title_attach', { table })} onClose={onClose} width={560}>
      <div className="form">
        {mode === 'add' ? (
          <div className="form-row"><label>{t('dialog.partition.name')}</label><input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder={t('dialog.partition.name_hint')} /></div>
        ) : (
          <div className="form-row"><label>{t('dialog.partition.table')}</label><input value={partition} onChange={(e) => setPartition(e.target.value)} autoFocus placeholder={t('dialog.partition.table_hint')} /></div>
        )}
        <div className="form-row"><label>Bounds</label><input value={bounds} onChange={(e) => setBounds(e.target.value)} placeholder={RANGE_EXAMPLE} /></div>
        <p className="mb-1 text-[12px] text-muted">{t('dialog.partition.help')}</p>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="btn" onClick={onClose}>{t('dialog.cancel.button')}</button>
          <button className="btn primary" disabled={busy} onClick={submit}>{busy ? t('dialog.partition.saving') : mode === 'add' ? t('dialog.partition.create') : t('dialog.partition.attach')}</button>
        </div>
      </div>
    </Modal>
  );
}