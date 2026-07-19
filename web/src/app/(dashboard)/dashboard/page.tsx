'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface Stats {
  conversations: Record<string, number>;
  unreadTotal: number;
  contacts: { total: number; new7d: number };
  campaigns: Record<string, number>;
  instances: {
    id: string;
    name: string;
    status: string;
    _count: { conversations: number };
  }[];
  messagesPerDay: { day: string; direction: string; total: number }[];
}

// paleta validada (scripts/validate_palette.js): ΔE 21.5, contraste ≥3:1
const SERIES = {
  INBOUND: { color: '#0284c7', label: 'Recebidas' },
  OUTBOUND: { color: '#16a34a', label: 'Enviadas' },
} as const;

function Tile({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="card">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function MessagesChart({ data }: { data: Stats['messagesPerDay'] }) {
  // agrega últimos 7 dias
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  const byDay = days.map((day) => {
    const inbound = data
      .filter((m) => m.day.slice(0, 10) === day && m.direction === 'INBOUND')
      .reduce((s, m) => s + m.total, 0);
    const outbound = data
      .filter((m) => m.day.slice(0, 10) === day && m.direction === 'OUTBOUND')
      .reduce((s, m) => s + m.total, 0);
    return { day, inbound, outbound };
  });
  const max = Math.max(1, ...byDay.flatMap((d) => [d.inbound, d.outbound]));

  const W = 560;
  const H = 180;
  const pad = { top: 8, bottom: 24, left: 8, right: 8 };
  const plotH = H - pad.top - pad.bottom;
  const groupW = (W - pad.left - pad.right) / 7;
  const barW = Math.min(20, groupW / 2 - 4);

  return (
    <div className="card">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">Mensagens — últimos 7 dias</p>
        <div className="flex gap-3 text-xs text-slate-500">
          {Object.values(SERIES).map((s) => (
            <span key={s.label} className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
        {byDay.map((d, i) => {
          const x0 = pad.left + i * groupW + groupW / 2;
          const hIn = (d.inbound / max) * plotH;
          const hOut = (d.outbound / max) * plotH;
          const label = new Date(d.day + 'T12:00:00').toLocaleDateString('pt-BR', {
            weekday: 'short',
          });
          return (
            <g key={d.day}>
              <rect
                x={x0 - barW - 1}
                y={pad.top + plotH - hIn}
                width={barW}
                height={hIn}
                rx={3}
                fill={SERIES.INBOUND.color}
              >
                <title>{`${label}: ${d.inbound} recebidas`}</title>
              </rect>
              <rect
                x={x0 + 1}
                y={pad.top + plotH - hOut}
                width={barW}
                height={hOut}
                rx={3}
                fill={SERIES.OUTBOUND.color}
              >
                <title>{`${label}: ${d.outbound} enviadas`}</title>
              </rect>
              <text
                x={x0}
                y={H - 6}
                textAnchor="middle"
                className="fill-slate-400"
                fontSize={11}
              >
                {label}
              </text>
            </g>
          );
        })}
        <line
          x1={pad.left}
          x2={W - pad.right}
          y1={pad.top + plotH}
          y2={pad.top + plotH}
          stroke="#e2e8f0"
        />
      </svg>
    </div>
  );
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const load = () => api<Stats>('/dashboard/stats').then(setStats).catch(() => {});
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  if (!stats) {
    return <div className="p-6 text-sm text-slate-400">Carregando métricas...</div>;
  }

  const conv = stats.conversations;
  const totalConv = (conv.PENDING ?? 0) + (conv.OPEN ?? 0) + (conv.CLOSED ?? 0);
  const campRunning = (stats.campaigns.RUNNING ?? 0) + (stats.campaigns.SCHEDULED ?? 0);

  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="mb-4 text-lg font-semibold">Dashboard</h1>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile
          label="Aguardando atendimento"
          value={conv.PENDING ?? 0}
          hint={`${stats.unreadTotal} mensagens não lidas`}
        />
        <Tile label="Em atendimento" value={conv.OPEN ?? 0} hint={`${totalConv} conversas no total`} />
        <Tile
          label="Contatos"
          value={stats.contacts.total}
          hint={`+${stats.contacts.new7d} nos últimos 7 dias`}
        />
        <Tile
          label="Campanhas ativas"
          value={campRunning}
          hint={`${stats.campaigns.COMPLETED ?? 0} concluídas`}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <MessagesChart data={stats.messagesPerDay} />

        <div className="card">
          <p className="mb-2 text-sm font-semibold">Conexões</p>
          <div className="space-y-2">
            {stats.instances.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">📱 {i.name}</p>
                  <p className="text-xs text-slate-400">
                    {i._count.conversations} conversa(s)
                  </p>
                </div>
                <span
                  className={`badge ${
                    i.status === 'CONNECTED'
                      ? 'bg-brand-50 text-brand-700'
                      : i.status === 'CONNECTING'
                        ? 'bg-amber-50 text-amber-600'
                        : 'bg-red-50 text-red-600'
                  }`}
                >
                  {i.status}
                </span>
              </div>
            ))}
            {stats.instances.length === 0 && (
              <p className="text-sm text-slate-400">Nenhuma conexão</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
