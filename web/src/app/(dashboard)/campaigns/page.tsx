'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Campaign, Instance, Tag } from '@/lib/types';

const statusStyle: Record<string, string> = {
  DRAFT: 'bg-slate-100 text-slate-600',
  SCHEDULED: 'bg-blue-50 text-blue-600',
  RUNNING: 'bg-brand-50 text-brand-700',
  PAUSED: 'bg-amber-50 text-amber-600',
  COMPLETED: 'bg-slate-100 text-slate-500',
  FAILED: 'bg-red-50 text-red-600',
};

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '',
    instanceId: '',
    message: '',
    tagId: '',
    ratePerMinute: 10,
  });

  const load = useCallback(async () => {
    setCampaigns(await api<Campaign[]>('/campaigns').catch(() => []));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    api<Instance[]>('/instances').then(setInstances).catch(() => {});
    api<Tag[]>('/contacts/tags').then(setTags).catch(() => {});
  }, []);

  async function create() {
    try {
      await api('/campaigns', {
        method: 'POST',
        json: {
          name: form.name,
          instanceId: form.instanceId,
          message: form.message,
          tagId: form.tagId || undefined,
          ratePerMinute: Number(form.ratePerMinute),
        },
      });
      setShowForm(false);
      setForm({ name: '', instanceId: '', message: '', tagId: '', ratePerMinute: 10 });
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function action(id: string, act: 'start' | 'pause' | 'resume') {
    await api(`/campaigns/${id}/${act}`, { method: 'POST' }).catch((e) =>
      alert((e as Error).message),
    );
    load();
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Campanhas</h1>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + Nova campanha
        </button>
      </div>

      <p className="mb-4 rounded-lg bg-amber-50 px-4 py-2 text-xs text-amber-700">
        ⚠️ Disparos em massa violam os termos do WhatsApp e podem bloquear o número.
        Use taxas baixas (≤10/min) e apenas contatos que consentiram.
      </p>

      {showForm && (
        <div className="card mb-4 grid max-w-2xl gap-3">
          <input
            className="input"
            placeholder="Nome da campanha"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-3">
            <select
              className="input"
              value={form.instanceId}
              onChange={(e) => setForm({ ...form, instanceId: e.target.value })}
            >
              <option value="">Instância...</option>
              {instances.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={form.tagId}
              onChange={(e) => setForm({ ...form, tagId: e.target.value })}
            >
              <option value="">Destinatários (tag)...</option>
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <input
              className="input"
              type="number"
              min={1}
              max={60}
              value={form.ratePerMinute}
              onChange={(e) =>
                setForm({ ...form, ratePerMinute: Number(e.target.value) })
              }
              title="Mensagens por minuto"
            />
          </div>
          <textarea
            className="input min-h-24"
            placeholder="Mensagem..."
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
          <div className="flex gap-2">
            <button className="btn-primary" onClick={create}>
              Criar
            </button>
            <button className="btn-ghost" onClick={() => setShowForm(false)}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {campaigns.map((c) => (
          <div key={c.id} className="card flex items-center justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium">{c.name}</span>
                <span className={`badge ${statusStyle[c.status]}`}>{c.status}</span>
              </div>
              <p className="mt-0.5 truncate text-sm text-slate-500">{c.message}</p>
              <p className="mt-0.5 text-xs text-slate-400">
                {c._count?.recipients ?? 0} destinatários · {c.ratePerMinute}/min ·{' '}
                {c.instance?.name}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              {(c.status === 'DRAFT' || c.status === 'SCHEDULED') && (
                <button className="btn-primary" onClick={() => action(c.id, 'start')}>
                  Iniciar
                </button>
              )}
              {c.status === 'RUNNING' && (
                <button className="btn-danger" onClick={() => action(c.id, 'pause')}>
                  Pausar
                </button>
              )}
              {c.status === 'PAUSED' && (
                <button className="btn-primary" onClick={() => action(c.id, 'resume')}>
                  Retomar
                </button>
              )}
            </div>
          </div>
        ))}
        {campaigns.length === 0 && !showForm && (
          <p className="py-8 text-center text-sm text-slate-400">
            Nenhuma campanha criada
          </p>
        )}
      </div>
    </div>
  );
}
