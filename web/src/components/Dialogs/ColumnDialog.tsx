import { useEffect, useState } from 'react';
import Modal from './Modal';
import { api } from '../../api';

interface ColumnDialogProps {
  serverId: number;
  database: string;
  schema: string;
  table: string;
  column?: string | null;
  onSaved: () => void;
  onClose: () => void;
}

export default function ColumnDialog({ serverId, database, schema, table, column, onSaved, onClose }: ColumnDialogProps) {
  const editing = !!column;
  const [name, setName] = useState(column ?? '');
  const [dataType, setDataType] = useState('');
  const [nullable, setNullable] = useState(true);
  const [defaultValue, setDefaultValue] = useState('');
  const [collation, setCollation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!column) return;
    let cancelled = false;
    api.tableDetail(serverId, database, schema, table)
      .then((detail) => {
        if (cancelled) return;
        const found = detail.columns.find((c) => c.name === column);
        if (!found) return;
        setDataType(found.data_type);
        setNullable(found.nullable);
        setDefaultValue(found.default ?? '');
        setCollation(found.collation ?? '');
      })
      .catch((err) => setError((err as Error).message));
    return () => { cancelled = true; };
  }, [column, serverId, database, schema, table]);

  const submit = async () => {
    setError(null);
    if (!name.trim() || !dataType.trim()) { setError('Informe o nome e o tipo da coluna.'); return; }
    setBusy(true);
    try {
      if (editing) {
        await api.alterColumn(serverId, database, schema, table, column!, {
          new_name: name.trim(),
          data_type: dataType.trim(),
          not_null: !nullable,
          default: defaultValue,
        });
      } else {
        await api.addColumn(serverId, database, schema, table, {
          name: name.trim(),
          data_type: dataType.trim(),
          nullable,
          default: defaultValue.trim(),
          collation: collation.trim(),
        });
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
    <Modal title={editing ? `Editar coluna ${column}` : `Nova coluna em ${table}`} onClose={onClose} width={520}>
      <div className="form">
        <div className="form-row"><label>Nome</label><input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
        <div className="form-row"><label>Tipo</label><input value={dataType} onChange={(e) => setDataType(e.target.value)} placeholder="ex: varchar(100)" /></div>
        <div className="form-row"><label>Default</label><input value={defaultValue} onChange={(e) => setDefaultValue(e.target.value)} placeholder="(vazio = nenhum)" /></div>
        <div className="form-row"><label>Collation</label><input value={collation} onChange={(e) => setCollation(e.target.value)} placeholder="(default)" /></div>
        <label className="inline-flex items-center gap-2 text-[13px]"><input type="checkbox" checked={nullable} onChange={(e) => setNullable(e.target.checked)} /> NULL</label>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={busy} onClick={submit}>{busy ? 'Salvando...' : editing ? 'Salvar' : 'Adicionar coluna'}</button>
        </div>
      </div>
    </Modal>
  );
}
