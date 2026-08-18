import { useEffect, useState } from 'react';
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
    if (!name.trim()) { setError('Informe o nome da tabela.'); return; }
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
    <Modal title="Editar tabela" onClose={onClose} width={440}>
      <div className="form">
        <div className="form-row"><label>Schema</label><input value={schema} disabled /></div>
        <div className="form-row"><label>Nome</label><input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
        <div className="form-row"><label>Comentário</label><textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={4} /></div>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={busy} onClick={submit}>{busy ? 'Salvando...' : 'Salvar'}</button>
        </div>
      </div>
    </Modal>
  );
}
