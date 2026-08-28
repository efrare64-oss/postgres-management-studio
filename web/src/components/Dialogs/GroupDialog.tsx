import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import { api } from '../../api';
import { Fa } from '../../icons';
import type { ServerGroup } from '../../types';

interface GroupDialogProps {
  group?: ServerGroup | null;
  onSaved: () => void;
  onClose: () => void;
}

export default function GroupDialog({ group, onSaved, onClose }: GroupDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(group?.name || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (group) {
        await api.patch(`/server-groups/${group.id}`, { name });
      } else {
        await api.post('/server-groups', { name });
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
    <Modal title={group ? t('dialog.group.title_edit') : t('dialog.group.title_new')} onClose={onClose}>
      <div className="form">
        <div className="form-row">
          <label>{t('dialog.group.name')}</label>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="btn" onClick={onClose} title={t('dialog.cancel.button')}><Fa name="cancel" /> {t('dialog.cancel.button')}</button>
          <button className="btn primary" disabled={busy || !name.trim()} onClick={submit} title={t('dialog.group.save')}>
            {busy ? t('dialog.group.saving') : <><Fa name="save" /> {t('dialog.group.save')}</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}
