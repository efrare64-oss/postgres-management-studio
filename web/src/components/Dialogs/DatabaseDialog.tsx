import { useState } from 'react';
import Modal from './Modal';
import { api } from '../../api';

interface DatabaseDialogProps {
  serverId: number;
  onSaved: () => void;
  onClose: () => void;
}

export default function DatabaseDialog({ serverId, onSaved, onClose }: DatabaseDialogProps) {
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!name.trim()) { setError('Informe o nome do banco.'); return; }
    setBusy(true);
    try {
      await api.createDatabase(serverId, name.trim(), owner.trim());
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Novo Database" onClose={onClose} width={440}>
      <div className="form">
        <div className="form-row"><label>Nome</label><input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
        <div className="form-row"><label>Owner</label><input value={owner} onChange={(e) => setOwner(e.target.value)} placeholder="postgres" /></div>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={busy} onClick={submit}>{busy ? 'Criando...' : 'Criar database'}</button>
        </div>
      </div>
    </Modal>
  );
}
