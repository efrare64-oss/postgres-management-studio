import { useState } from 'react';
import Modal from './Modal';
import { api } from '../../api';

const SEQ_TYPES = ['bigint', 'integer', 'smallint'];

interface SequenceDialogProps {
  serverId: number;
  database: string;
  schema: string;
  onSaved: () => void;
  onClose: () => void;
}

export default function SequenceDialog({ serverId, database, schema, onSaved, onClose }: SequenceDialogProps) {
  const [name, setName] = useState('');
  const [dataType, setDataType] = useState('bigint');
  const [start, setStart] = useState('1');
  const [increment, setIncrement] = useState('1');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [cache, setCache] = useState('1');
  const [owner, setOwner] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const num = (v: string) => (v.trim() === '' ? 0 : Number(v));

  const submit = async () => {
    setError(null);
    if (!name.trim()) { setError('Informe o nome.'); return; }
    setBusy(true);
    try {
      await api.createSequence(serverId, database, schema, name.trim(), {
        data_type: dataType,
        start: num(start),
        increment: num(increment),
        min: num(min),
        max: num(max),
        cache: num(cache),
        owner: owner.trim(),
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
    <Modal title="Nova Sequence" onClose={onClose} width={520}>
      <div className="form">
        <div className="form-row"><label>Nome</label><input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
        <div className="form-row">
          <label>Tipo</label>
          <select value={dataType} onChange={(e) => setDataType(e.target.value)}>
            {SEQ_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="form-row"><label>Start</label><input value={start} onChange={(e) => setStart(e.target.value)} /></div>
        <div className="form-row"><label>Increment</label><input value={increment} onChange={(e) => setIncrement(e.target.value)} /></div>
        <div className="form-row"><label>Mínimo</label><input value={min} onChange={(e) => setMin(e.target.value)} /></div>
        <div className="form-row"><label>Máximo</label><input value={max} onChange={(e) => setMax(e.target.value)} /></div>
        <div className="form-row"><label>Cache</label><input value={cache} onChange={(e) => setCache(e.target.value)} /></div>
        <div className="form-row"><label>Owner</label><input value={owner} onChange={(e) => setOwner(e.target.value)} /></div>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={busy} onClick={submit}>{busy ? 'Criando...' : 'Criar sequence'}</button>
        </div>
      </div>
    </Modal>
  );
}
