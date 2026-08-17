import { useState } from 'react';
import Modal from './Modal';
import { api } from '../../api';

const LANGUAGES = ['plpgsql', 'sql', 'plpython3u', 'plperl', 'plv8'];

interface FunctionDialogProps {
  serverId: number;
  database: string;
  schema: string;
  onSaved: () => void;
  onClose: () => void;
}

export default function FunctionDialog({ serverId, database, schema, onSaved, onClose }: FunctionDialogProps) {
  const [name, setName] = useState('');
  const [args, setArgs] = useState('');
  const [returnType, setReturnType] = useState('void');
  const [language, setLanguage] = useState('plpgsql');
  const [volatility, setVolatility] = useState('volatile');
  const [body, setBody] = useState('');
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!name.trim()) { setError('Informe o nome da função.'); return; }
    if (!body.trim()) { setError('Informe o corpo da função.'); return; }
    setBusy(true);
    try {
      await api.createFunction(serverId, database, schema, name.trim(), {
        language,
        arguments: args.trim(),
        return_type: returnType.trim() || 'void',
        body,
        volatility,
        owner: '',
        replace,
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
    <Modal title="Nova Function" onClose={onClose} width={720}>
      <div className="form">
        <div className="form-row"><label>Nome</label><input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
        <div className="form-row"><label>Argumentos</label><input value={args} onChange={(e) => setArgs(e.target.value)} placeholder="a integer, b text" /></div>
        <div className="form-row"><label>Retorno</label><input value={returnType} onChange={(e) => setReturnType(e.target.value)} /></div>
        <div className="form-row">
          <label>Linguagem</label>
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div className="form-row">
          <label>Volatilidade</label>
          <select value={volatility} onChange={(e) => setVolatility(e.target.value)}>
            <option value="volatile">VOLATILE</option>
            <option value="stable">STABLE</option>
            <option value="immutable">IMMUTABLE</option>
          </select>
        </div>
        <div className="form-row form-row-col">
          <label>Corpo</label>
          <textarea
            rows={10}
            className="w-full border border-border font-mono text-[13px]"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={'BEGIN\n  RETURN NULL;\nEND;'}
          />
        </div>
        <label className="inline-flex items-center gap-2 text-[13px]"><input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} /> CREATE OR REPLACE</label>
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={busy} onClick={submit}>{busy ? 'Criando...' : 'Criar function'}</button>
        </div>
      </div>
    </Modal>
  );
}
