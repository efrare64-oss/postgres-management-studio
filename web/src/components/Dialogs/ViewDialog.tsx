import { useState } from 'react';
import Modal from './Modal';
import { api } from '../../api';

interface ViewDialogProps {
  serverId: number;
  database: string;
  schema: string;
  kind: 'view' | 'matview';
  onSaved: () => void;
  onClose: () => void;
}

export default function ViewDialog({ serverId, database, schema, kind, onSaved, onClose }: ViewDialogProps) {
  const isMatview = kind === 'matview';
  const [name, setName] = useState('');
  const [definition, setDefinition] = useState('');
  const [withData, setWithData] = useState(true);
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    if (!name.trim()) { setError('Informe o nome.'); return; }
    if (!definition.trim()) { setError('Informe o SELECT da definição.'); return; }
    setBusy(true);
    try {
      if (isMatview) {
        await api.createMatView(serverId, database, schema, name.trim(), definition.trim(), withData);
      } else {
        await api.createView(serverId, database, schema, name.trim(), definition.trim(), replace);
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
    <Modal title={isMatview ? 'Nova Materialized View' : 'Nova View'} onClose={onClose} width={680}>
      <div className="form">
        <div className="form-row"><label>Nome</label><input value={name} onChange={(e) => setName(e.target.value)} autoFocus /></div>
        <div className="form-row form-row-col">
          <label>Definição (SELECT)</label>
          <textarea
            rows={8}
            className="w-full border border-border font-mono text-[13px]"
            value={definition}
            onChange={(e) => setDefinition(e.target.value)}
            placeholder="SELECT * FROM public.minha_tabela;"
          />
        </div>
        {isMatview ? (
          <label className="inline-flex items-center gap-2 text-[13px]"><input type="checkbox" checked={withData} onChange={(e) => setWithData(e.target.checked)} /> Preencher com dados (WITH DATA)</label>
        ) : (
          <label className="inline-flex items-center gap-2 text-[13px]"><input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} /> CREATE OR REPLACE</label>
        )}
        {error && <div className="form-error">{error}</div>}
        <div className="form-actions">
          <button className="btn" onClick={onClose}>Cancelar</button>
          <button className="btn primary" disabled={busy} onClick={submit}>{busy ? 'Criando...' : 'Criar'}</button>
        </div>
      </div>
    </Modal>
  );
}
