import { useState } from 'react';
import Modal from './Modal';
import { api } from '../../api';

interface SchemaDialogProps {
  serverId: number;
  database: string;
  onSaved: () => void;
  onClose: () => void;
}

export default function SchemaDialog({ serverId, database, onSaved, onClose }: SchemaDialogProps) {
  const [name, setName] = useState('');
  const [owner, setOwner] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!name.trim()) { setError('Informe o nome do schema.'); return; }
    setBusy(true);
    try {
      await api.createSchema(serverId, database, name.trim(), owner.trim());
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Novo Schema" onClose={onClose} width={440}>
      <div className="form">
        <div className="form-row"><label>Nome</label><input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
        <div className="form-row"><label>Owner</label><input value={owner} onChange={(e) => setOwner(e.target.value)} /></div>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={busy} onClick={submit}>{busy ? 'Criando...' : 'Criar schema'}</button>
        </div>
      </div>
    </Modal>
  );
}
