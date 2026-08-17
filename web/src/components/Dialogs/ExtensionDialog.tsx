import { useState } from 'react';
import Modal from './Modal';
import { api } from '../../api';

interface ExtensionDialogProps {
  serverId: number;
  database: string;
  onSaved: () => void;
  onClose: () => void;
}

const COMMON_EXTENSIONS = [
  'uuid-ossp', 'pgcrypto', 'postgis', 'hstore', 'citext', 'pg_trgm', 'ltree',
  'pg_stat_statements', 'pg_prewarm', 'tablefunc', 'unaccent', 'fuzzystrmatch',
  'pg_repack', 'pgaudit', 'pg_partman', 'pgcrypto',
];

export default function ExtensionDialog({ serverId, database, onSaved, onClose }: ExtensionDialogProps) {
  const [name, setName] = useState('');
  const [schema, setSchema] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!name.trim()) { setError('Informe o nome da extensão.'); return; }
    setBusy(true);
    try {
      await api.createExtension(serverId, database, name.trim(), schema.trim());
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="Nova Extension" onClose={onClose} width={480}>
      <div className="form">
        <div className="form-row">
          <label>Nome</label>
          <input list="extension-options" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <datalist id="extension-options">
            {COMMON_EXTENSIONS.map((e) => <option key={e} value={e} />)}
          </datalist>
        </div>
        <div className="form-row"><label>Schema</label><input value={schema} onChange={(e) => setSchema(e.target.value)} placeholder="public" /></div>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={busy} onClick={submit}>{busy ? 'Criando...' : 'Criar extension'}</button>
        </div>
      </div>
    </Modal>
  );
}
