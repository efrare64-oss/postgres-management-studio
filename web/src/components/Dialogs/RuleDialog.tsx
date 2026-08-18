import { useEffect, useState } from 'react';
import Modal from './Modal';
import { api } from '../../api';

const EVENTS = ['SELECT', 'UPDATE', 'INSERT', 'DELETE'];

interface RuleDialogProps {
  serverId: number;
  database: string;
  schema: string;
  table: string;
  rule?: string | null;
  onSaved: () => void;
  onClose: () => void;
}

export default function RuleDialog({ serverId, database, schema, table, rule, onSaved, onClose }: RuleDialogProps) {
  const editing = !!rule;
  const [name, setName] = useState(rule ?? '');
  const [event, setEvent] = useState('INSERT');
  const [instead, setInstead] = useState(true);
  const [where, setWhere] = useState('');
  const [action, setAction] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!rule) return;
    let cancelled = false;
    api.rules(serverId, database, schema, table)
      .then((list) => {
        if (cancelled) return;
        const found = list.find((r) => r.name === rule);
        if (!found) return;
        setName(found.name);
        setEvent(found.event);
        setInstead(found.instead);
        setWhere(found.where);
        setAction(found.action);
      })
      .catch((err) => setError((err as Error).message));
    return () => { cancelled = true; };
  }, [rule, serverId, database, schema, table]);

  const submit = async () => {
    setError(null);
    if (!name.trim() || !event.trim()) { setError('Informe o nome e o evento da rule.'); return; }
    const payload = { name: name.trim(), event, instead, where: where.trim(), action: action.trim() };
    setBusy(true);
    try {
      if (editing) {
        await api.replaceRule(serverId, database, schema, table, rule!, payload);
      } else {
        await api.createRule(serverId, database, schema, table, payload);
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
    <Modal title={editing ? `Editar rule ${rule}` : `Nova rule em ${table}`} onClose={onClose} width={560}>
      <div className="form">
        <div className="form-row"><label>Nome</label><input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
        <div className="form-row">
          <label>Evento</label>
          <select value={event} onChange={(e) => setEvent(e.target.value)}>
            {EVENTS.map((ev) => <option key={ev} value={ev}>{ev}</option>)}
          </select>
        </div>
        <label className="inline-flex items-center gap-2 text-[13px]"><input type="checkbox" checked={instead} onChange={(e) => setInstead(e.target.checked)} /> DO INSTEAD</label>
        <div className="form-row"><label>Where</label><input value={where} onChange={(e) => setWhere(e.target.value)} placeholder="ex: NEW.status = 'ativo'" /></div>
        <div className="form-row"><label>Ação</label><textarea value={action} onChange={(e) => setAction(e.target.value)} rows={3} placeholder="ex: DELETE FROM log WHERE log.id = NEW.id (ou NOTHING)" className="w-full resize-y rounded border border-border bg-input p-1.5 text-[13px]" /></div>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={busy} onClick={submit}>{busy ? 'Salvando...' : editing ? 'Salvar' : 'Criar rule'}</button>
        </div>
      </div>
    </Modal>
  );
}
