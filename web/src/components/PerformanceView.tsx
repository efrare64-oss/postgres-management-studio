import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '../api';
import type { MetricSnapshot, MetricsHistory } from '../types/cluster';

function formatTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatNumber(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

interface Props {
  serverId: number;
  database: string;
}

export default function PerformanceView({ serverId, database }: Props) {
  const [history, setHistory] = useState<MetricsHistory | null>(null);
  const [collecting, setCollecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    const load = async () => {
      try {
        const h = await api.metricsHistory(serverId);
        setHistory(h);
        setCollecting(h.snapshots.length > 0);
      } catch { /* ignore */ }
    };
    load();
    timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [serverId]);

  const toggleCollection = async () => {
    try {
      if (collecting) {
        await api.stopMetrics(serverId);
        setCollecting(false);
      } else {
        await api.startMetrics(serverId, database);
        setCollecting(true);
      }
      setError(null);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const data = (history?.snapshots || []).map((s) => ({
    ...s,
    time: formatTime(s.timestamp),
  }));

  const latest = data.length > 0 ? data[data.length - 1] : null;

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Performance Monitor</h3>
        <div className="flex items-center gap-2">
          {latest && (
            <span className="text-xs text-muted">
              {data.length} pontos • Intervalo: {history?.interval_seconds || 5}s
            </span>
          )}
          <button
            className={`cursor-pointer rounded border px-3 py-1 text-xs ${collecting ? 'border-[#c0392b] bg-[#e74c3c] text-white' : 'border-pg-blue bg-pg-blue text-white'}`}
            onClick={toggleCollection}
          >
            {collecting ? 'Parar' : 'Iniciar Coleta'}
          </button>
        </div>
      </div>

      {error && <div className="rounded bg-[#fdecea] px-2 py-1.5 text-[13px] text-danger">{error}</div>}

      {data.length === 0 ? (
        <div className="p-8 text-center text-muted">
          <p className="text-sm">Nenhum dado coletado ainda.</p>
          <p className="mt-1 text-xs">Clique em "Iniciar Coleta" para começar a monitorar a performance.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-3">
            <StatCard label="Conexões" value={String(latest?.total_conn || 0)} />
            <StatCard label="Ativas" value={String(latest?.active_queries || 0)} />
            <StatCard label="Commits" value={formatNumber(latest?.commits || 0)} />
            <StatCard label="Tamanho DB" value={formatBytes(latest?.db_size || 0)} />
          </div>

          <div className="rounded border border-border bg-panel-bg p-3">
            <h4 className="mb-2 text-xs font-medium text-muted">Conexões</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="var(--color-muted)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted)" />
                <Tooltip contentStyle={{ background: 'var(--color-panel-bg)', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="total_conn" name="Total" stroke="#326690" dot={false} />
                <Line type="monotone" dataKey="active_queries" name="Ativas" stroke="#e74c3c" dot={false} />
                <Line type="monotone" dataKey="idle" name="Idle" stroke="#9ca3af" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded border border-border bg-panel-bg p-3">
            <h4 className="mb-2 text-xs font-medium text-muted">Tuples (Inserções/Atualizações/Deleções)</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="var(--color-muted)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted)" />
                <Tooltip contentStyle={{ background: 'var(--color-panel-bg)', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="tuples_inserted" name="Inseridos" stroke="#27ae60" dot={false} />
                <Line type="monotone" dataKey="tuples_updated" name="Atualizados" stroke="#f39c12" dot={false} />
                <Line type="monotone" dataKey="tuples_deleted" name="Deletados" stroke="#e74c3c" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded border border-border bg-panel-bg p-3">
            <h4 className="mb-2 text-xs font-medium text-muted">Cache Hit / Block Reads</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="var(--color-muted)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted)" />
                <Tooltip contentStyle={{ background: 'var(--color-panel-bg)', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="block_hits" name="Cache Hits" stroke="#27ae60" dot={false} />
                <Line type="monotone" dataKey="block_reads" name="Block Reads" stroke="#e74c3c" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="rounded border border-border bg-panel-bg p-3">
            <h4 className="mb-2 text-xs font-medium text-muted">Transações (Commits/Rollbacks)</h4>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} stroke="var(--color-muted)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted)" />
                <Tooltip contentStyle={{ background: 'var(--color-panel-bg)', border: '1px solid var(--color-border)', borderRadius: 4, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="commits" name="Commits" stroke="#326690" dot={false} />
                <Line type="monotone" dataKey="rollbacks" name="Rollbacks" stroke="#e74c3c" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-panel-bg p-3">
      <div className="text-[11px] text-muted">{label}</div>
      <div className="mt-0.5 text-lg font-medium">{value}</div>
    </div>
  );
}
