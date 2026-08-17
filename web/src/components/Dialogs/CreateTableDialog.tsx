import { useState } from 'react';
import Modal from './Modal';
import { api } from '../../api';
import { Fa } from '../../icons';

const COMMON_TYPES = ['text', 'integer', 'bigint', 'smallint', 'serial', 'bigserial', 'numeric', 'real', 'double precision', 'boolean', 'date', 'timestamp', 'timestamptz', 'time', 'uuid', 'json', 'jsonb', 'bytea'];

interface ColumnDraft {
  name: string;
  type: string;
  nullable: boolean;
  default: string;
  primary: boolean;
}

interface CreateTableDialogProps {
  serverId: number | null;
  database: string | null;
  schema: string | null;
  onSaved: () => void;
  onClose: () => void;
}

export default function CreateTableDialog({ serverId, database, schema, onSaved, onClose }: CreateTableDialogProps) {
  const [name, setName] = useState('');
  const [columns, setColumns] = useState<ColumnDraft[]>([{ name: '', type: 'integer', nullable: true, default: '', primary: false }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateColumn = (i: number, patch: Partial<ColumnDraft>) =>
    setColumns((cols) => cols.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));

  const addColumn = () =>
    setColumns((cols) => [...cols, { name: '', type: 'text', nullable: true, default: '', primary: false }]);

  const removeColumn = (i: number) => setColumns((cols) => cols.filter((_, idx) => idx !== i));

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (!serverId || !database || !schema) {
        setError('Selecione um servidor, banco e schema antes de criar a tabela.');
        setBusy(false);
        return;
      }
      const payload = {
        name,
        columns: columns
          .filter((c) => c.name.trim())
          .map((c) => ({ name: c.name.trim(), type: c.type, nullable: c.nullable, default: c.default, primary: c.primary })),
      };
      if (!payload.name.trim() || payload.columns.length === 0) {
        setError('Informe o nome da tabela e ao menos uma coluna.');
        setBusy(false);
        return;
      }
      await api.post(
        `/servers/${serverId}/databases/${encodeURIComponent(database)}/schemas/${encodeURIComponent(schema)}/tables`,
        payload,
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
    <Modal title={`Criar tabela em ${schema || ''}`} onClose={onClose} width={620}>
      <div className="form">
        <div className="form-row">
          <label>Nome</label>
          <input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>
        <h4 className="section-title">Colunas</h4>
        <div className="column-editor">
          {columns.map((c, i) => (
            <div className="column-editor-row" key={i}>
              <input
                className="col-name"
                placeholder="nome"
                value={c.name}
                onChange={(e) => updateColumn(i, { name: e.target.value })}
              />
              <select className="col-type" value={c.type} onChange={(e) => updateColumn(i, { type: e.target.value })}>
                {COMMON_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input
                className="col-default"
                placeholder="default"
                value={c.default}
                onChange={(e) => updateColumn(i, { default: e.target.value })}
              />
              <label className="col-check"><input type="checkbox" checked={c.nullable} onChange={(e) => updateColumn(i, { nullable: e.target.checked })} /> NULL</label>
              <label className="col-check"><input type="checkbox" checked={c.primary} onChange={(e) => updateColumn(i, { primary: e.target.checked })} /> PK</label>
              <button className="icon-btn" onClick={() => removeColumn(i)} title="Remover">
                <Fa name="close" />
              </button>
            </div>
          ))}
          <button className="btn" onClick={addColumn} title="Adicionar coluna"><Fa name="plus" /> Adicionar coluna</button>
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="btn" onClick={onClose} title="Cancelar"><Fa name="cancel" /> Cancelar</button>
          <button className="btn primary" disabled={busy} onClick={submit} title="Criar tabela">
            {busy ? 'Criando...' : <><Fa name="table" /> Criar tabela</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}
