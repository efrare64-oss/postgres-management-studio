import { useEffect, useState } from 'react';
import Modal from './Modal';
import { api } from '../../api';

const TIMINGS = ['BEFORE', 'AFTER', 'INSTEAD OF'];
const EVENTS = ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'];

interface TriggerDialogProps {
  serverId: number;
  database: string;
  schema: string;
  table: string;
  trigger?: string | null;
  onSaved: () => void;
  onClose: () => void;
}

export default function TriggerDialog({ serverId, database, schema, table, trigger, onSaved, onClose }: TriggerDialogProps) {
  const editing = !!trigger;
  const [name, setName] = useState(trigger ?? '');
  const [timing, setTiming] = useState('BEFORE');
  const [events, setEvents] = useState<string[]>(['INSERT']);
  const [functionName, setFunctionName] = useState('');
  const [forEachRow, setForEachRow] = useState(true);
  const [when, setWhen] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trigger) return;
    let cancelled = false;
    api.triggers(serverId, database, schema, table)
      .then((list) => {
        if (cancelled) return;
        const found = list.find((t) => t.name === trigger);
        if (!found) return;
        setName(found.name);
        setTiming(found.timing || 'BEFORE');
        setEvents(found.events.split(' OR ').filter(Boolean));
        setFunctionName(found.function);
        const def = found.definition || '';
        setForEachRow(/FOR EACH ROW/i.test(def));
        const m = /WHEN \((.*)\)/s.exec(def);
        setWhen(m ? m[1] : '');
      })
      .catch((err) => setError((err as Error).message));
    return () => { cancelled = true; };
  }, [trigger, serverId, database, schema, table]);

  const toggleEvent = (ev: string) => {
    setEvents((cur) => cur.includes(ev) ? cur.filter((e) => e !== ev) : [...cur, ev]);
  };

  const submit = async () => {
    setError(null);
    if (!name.trim() || !functionName.trim()) { setError('Informe o nome do trigger e a função.'); return; }
    if (!events.length) { setError('Selecione ao menos um evento.'); return; }
    const payload = { name: name.trim(), timing, events, function: functionName.trim(), for_each_row: forEachRow, when: when.trim() };
    setBusy(true);
    try {
      if (editing) {
        await api.replaceTrigger(serverId, database, schema, table, trigger!, payload);
      } else {
        await api.createTrigger(serverId, database, schema, table, payload);
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
    <Modal title={editing ? `Editar trigger ${trigger}` : `Novo trigger em ${table}`} onClose={onClose} width={540}>
      <div className="form">
        <div className="form-row"><label>Nome</label><input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
        <div className="form-row">
          <label>Timing</label>
          <select value={timing} onChange={(e) => setTiming(e.target.value)}>
            {TIMINGS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>Eventos</label>
          <div className="flex flex-wrap items-center gap-3 text-[13px]">
            {EVENTS.map((ev) => (
              <label key={ev} className="inline-flex items-center gap-1.5">
                <input type="checkbox" checked={events.includes(ev)} onChange={() => toggleEvent(ev)} /> {ev}
              </label>
            ))}
          </div>
        </div>
        <div className="form-row"><label>Função</label><input value={functionName} onChange={(e) => setFunctionName(e.target.value)} placeholder="ex: minha_funcao()" /></div>
        <label className="inline-flex items-center gap-2 text-[13px]"><input type="checkbox" checked={forEachRow} onChange={(e) => setForEachRow(e.target.checked)} /> FOR EACH ROW</label>
        <div className="form-row"><label>When</label><input value={when} onChange={(e) => setWhen(e.target.value)} placeholder="ex: NEW.status = 'x'" /></div>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={busy} onClick={submit}>{busy ? 'Salvando...' : editing ? 'Salvar' : 'Criar trigger'}</button>
        </div>
      </div>
    </Modal>
  );
}
