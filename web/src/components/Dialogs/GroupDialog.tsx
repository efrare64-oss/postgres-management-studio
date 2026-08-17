import { useState } from 'react';
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
    <Modal title={group ? 'Renomear grupo' : 'Novo grupo'} onClose={onClose}>
      <div className="form">
        <div className="form-row">
          <label>Nome</label>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="btn" onClick={onClose} title="Cancelar"><Fa name="cancel" /> Cancelar</button>
          <button className="btn primary" disabled={busy || !name.trim()} onClick={submit} title="Salvar grupo">
            {busy ? 'Salvando...' : <><Fa name="save" /> Salvar</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}
