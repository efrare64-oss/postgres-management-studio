import { useState } from 'react';
import Modal from './Modal';
import { api } from '../../api';

const INDEX_METHODS = ['btree', 'hash', 'gist', 'gin', 'brin'];

interface IndexDialogProps {
  serverId: number;
  database: string;
  schema: string;
  table: string;
  onSaved: () => void;
  onClose: () => void;
}

export default function IndexDialog({ serverId, database, schema, table, onSaved, onClose }: IndexDialogProps) {
  const [name, setName] = useState('');
  const [columns, setColumns] = useState('');
  const [unique, setUnique] = useState(false);
  const [method, setMethod] = useState('btree');
  const [where, setWhere] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!name.trim() || !columns.trim()) { setError('Informe o nome do índice e as colunas.'); return; }
    setBusy(true);
    try {
      await api.createIndex(serverId, database, schema, table, {
        name: name.trim(),
        columns: columns.trim(),
        unique,
        method,
        where: where.trim(),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={`Novo índice em ${table}`} onClose={onClose} width={520}>
      <div className="form">
        <div className="form-row"><label>Nome</label><input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
        <div className="form-row"><label>Colunas</label><input value={columns} onChange={(e) => setColumns(e.target.value)} placeholder="coluna1, coluna2" /></div>
        <div className="form-row">
          <label>Método</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)}>
            {INDEX_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <label className="inline-flex items-center gap-2 text-[13px]"><input type="checkbox" checked={unique} onChange={(e) => setUnique(e.target.checked)} /> UNIQUE</label>
        <div className="form-row"><label>Where</label><input value={where} onChange={(e) => setWhere(e.target.value)} placeholder="ex: status = 'ativo'" /></div>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={busy} onClick={submit}>{busy ? 'Criando...' : 'Criar índice'}</button>
        </div>
      </div>
    </Modal>
  );
}
