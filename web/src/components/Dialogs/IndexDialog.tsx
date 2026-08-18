import { useEffect, useState } from 'react';
import Modal from './Modal';
import { api } from '../../api';

const INDEX_METHODS = ['btree', 'hash', 'gist', 'gin', 'brin'];

interface IndexDialogProps {
  serverId: number;
  database: string;
  schema: string;
  table: string;
  index?: string;
  onSaved: () => void;
  onClose: () => void;
}

export default function IndexDialog({ serverId, database, schema, table, index, onSaved, onClose }: IndexDialogProps) {
  const editing = !!index;
  const [name, setName] = useState(index ?? '');
  const [columns, setColumns] = useState('');
  const [unique, setUnique] = useState(false);
  const [method, setMethod] = useState('btree');
  const [where, setWhere] = useState('');
  const [tablespace, setTablespace] = useState('');
  const [fillfactor, setFillfactor] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!index) return;
    let cancelled = false;
    api.tableDetail(serverId, database, schema, table)
      .then((detail) => {
        if (cancelled) return;
        const found = detail.indexes.find((i) => i.name === index);
        if (!found) return;
        setColumns(found.columns.join(', '));
        setUnique(found.unique);
        setMethod(found.method || 'btree');
        setWhere(found.predicate ?? '');
        setTablespace(found.tablespace ?? '');
        setFillfactor(found.fillfactor ? String(found.fillfactor) : '');
      })
      .catch((err) => setError((err as Error).message));
    return () => { cancelled = true; };
  }, [index, serverId, database, schema, table]);

  const submit = async () => {
    setError(null);
    if (!name.trim() || !columns.trim()) { setError('Informe o nome do índice e as colunas.'); return; }
    const payload = {
      name: name.trim(),
      columns: columns.trim(),
      unique,
      method,
      where: where.trim(),
      tablespace: tablespace.trim(),
      fillfactor: fillfactor ? Number(fillfactor) : 0,
    };
    setBusy(true);
    try {
      if (editing) {
        await api.replaceIndex(serverId, database, schema, table, index!, payload);
      } else {
        await api.createIndex(serverId, database, schema, table, payload);
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
    <Modal title={editing ? `Editar índice ${index}` : `Novo índice em ${table}`} onClose={onClose} width={540}>
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
        <div className="form-row"><label>Tablespace</label><input value={tablespace} onChange={(e) => setTablespace(e.target.value)} placeholder="(default)" /></div>
        <div className="form-row"><label>Fillfactor</label><input value={fillfactor} onChange={(e) => setFillfactor(e.target.value)} placeholder="(default)" /></div>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={busy} onClick={submit}>{busy ? 'Salvando...' : editing ? 'Salvar' : 'Criar índice'}</button>
        </div>
      </div>
    </Modal>
  );
}
