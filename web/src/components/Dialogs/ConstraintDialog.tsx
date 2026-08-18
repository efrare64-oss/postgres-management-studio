import { useEffect, useState } from 'react';
import Modal from './Modal';
import { api } from '../../api';

const CONSTRAINT_TYPES = [
  { value: 'primary', label: 'Primary Key' },
  { value: 'unique', label: 'Unique' },
  { value: 'foreign', label: 'Foreign Key' },
  { value: 'check', label: 'Check' },
  { value: 'exclusion', label: 'Exclusion' },
];

const REF_ACTIONS = ['NO ACTION', 'RESTRICT', 'CASCADE', 'SET NULL', 'SET DEFAULT'];

const TYPE_MAP: Record<string, string> = { p: 'primary', u: 'unique', f: 'foreign', c: 'check', x: 'exclusion' };

interface ConstraintDialogProps {
  serverId: number;
  database: string;
  schema: string;
  table: string;
  constraint?: string | null;
  onSaved: () => void;
  onClose: () => void;
}

export default function ConstraintDialog({ serverId, database, schema, table, constraint, onSaved, onClose }: ConstraintDialogProps) {
  const editing = !!constraint;
  const [name, setName] = useState(constraint ?? '');
  const [type, setType] = useState('primary');
  const [columns, setColumns] = useState('');
  const [check, setCheck] = useState('');
  const [refTable, setRefTable] = useState('');
  const [refColumns, setRefColumns] = useState('');
  const [onDelete, setOnDelete] = useState('');
  const [onUpdate, setOnUpdate] = useState('');
  const [deferrable, setDeferrable] = useState(false);
  const [exclusion, setExclusion] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!constraint) return;
    let cancelled = false;
    api.tableDetail(serverId, database, schema, table)
      .then((detail) => {
        if (cancelled) return;
        const found = detail.constraints.find((c) => c.name === constraint);
        if (!found) return;
        const t = TYPE_MAP[found.type] || 'check';
        setType(t);
        setName(found.name);
        setRefTable(found.ref_table ?? '');
        setRefColumns((found.ref_columns ?? []).join(', '));
        setOnDelete(found.on_delete ?? '');
        setOnUpdate(found.on_update ?? '');
        setDeferrable(!!found.deferrable);
        const def = found.definition || '';
        setColumns(parseColumns(def));
        if (t === 'check') setCheck(parseCheck(def));
        if (t === 'exclusion') setExclusion(parseExclusion(def));
      })
      .catch((err) => setError((err as Error).message));
    return () => { cancelled = true; };
  }, [constraint, serverId, database, schema, table]);

  const parseColumns = (def: string) => {
    const m = /\((.*?)\)/.exec(def);
    return m ? m[1].split(',').map((s) => s.trim()).join(', ') : '';
  };

  const parseCheck = (def: string) => {
    const idx = def.indexOf('CHECK (');
    if (idx < 0) return '';
    let body = def.slice(idx + 7);
    if (body.endsWith(')')) body = body.slice(0, -1);
    return body;
  };

  const parseExclusion = (def: string) => {
    const idx = def.indexOf('EXCLUDE ');
    return idx < 0 ? '' : def.slice(idx + 8);
  };

  const splitColumns = () => columns.split(',').map((s) => s.trim()).filter(Boolean);

  const submit = async () => {
    setError(null);
    if (!name.trim()) { setError('Informe o nome da constraint.'); return; }
    if (type === 'primary' || type === 'unique') {
      if (!splitColumns().length) { setError('Informe as colunas.'); return; }
    } else if (type === 'check') {
      if (!check.trim()) { setError('Informe a expressão do CHECK.'); return; }
    } else if (type === 'exclusion') {
      if (!exclusion.trim()) { setError('Informe a definição do EXCLUDE.'); return; }
    } else if (type === 'foreign') {
      if (!splitColumns().length || !refTable.trim() || !refColumns.trim()) { setError('Informe colunas, tabela referenciada e colunas referenciadas.'); return; }
    }

    const payload = {
      name: name.trim(),
      type,
      columns: splitColumns(),
      check: check.trim(),
      ref_table: refTable.trim(),
      ref_columns: refColumns.split(',').map((s) => s.trim()).filter(Boolean),
      on_delete: onDelete,
      on_update: onUpdate,
      deferrable,
      exclusion: exclusion.trim(),
    };
    setBusy(true);
    try {
      if (editing) {
        await api.alterConstraint(serverId, database, schema, table, constraint!, payload);
      } else {
        await api.createConstraint(serverId, database, schema, table, payload);
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
    <Modal title={editing ? `Editar constraint ${constraint}` : `Nova constraint em ${table}`} onClose={onClose} width={560}>
      <div className="form">
        <div className="form-row"><label>Nome</label><input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
        <div className="form-row">
          <label>Tipo</label>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            {CONSTRAINT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {(type === 'primary' || type === 'unique' || type === 'foreign') && (
          <div className="form-row"><label>Colunas</label><input value={columns} onChange={(e) => setColumns(e.target.value)} placeholder="col1, col2" /></div>
        )}

        {type === 'check' && (
          <div className="form-row"><label>Expressão</label><input value={check} onChange={(e) => setCheck(e.target.value)} placeholder="ex: price > 0" /></div>
        )}

        {type === 'exclusion' && (
          <div className="form-row"><label>Definição</label><input value={exclusion} onChange={(e) => setExclusion(e.target.value)} placeholder="ex: USING gist (c WITH &&)" /></div>
        )}

        {type === 'foreign' && (
          <>
            <div className="form-row"><label>Tabela referenciada</label><input value={refTable} onChange={(e) => setRefTable(e.target.value)} placeholder="schema.tabela" /></div>
            <div className="form-row"><label>Colunas referenciadas</label><input value={refColumns} onChange={(e) => setRefColumns(e.target.value)} placeholder="col1, col2" /></div>
            <div className="form-row">
              <label>On Delete</label>
              <select value={onDelete} onChange={(e) => setOnDelete(e.target.value)}>
                <option value="">(default)</option>
                {REF_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="form-row">
              <label>On Update</label>
              <select value={onUpdate} onChange={(e) => setOnUpdate(e.target.value)}>
                <option value="">(default)</option>
                {REF_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <label className="inline-flex items-center gap-2 text-[13px]"><input type="checkbox" checked={deferrable} onChange={(e) => setDeferrable(e.target.checked)} /> DEFERRABLE</label>
          </>
        )}

        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={busy} onClick={submit}>{busy ? 'Salvando...' : editing ? 'Salvar' : 'Criar constraint'}</button>
        </div>
      </div>
    </Modal>
  );
}
