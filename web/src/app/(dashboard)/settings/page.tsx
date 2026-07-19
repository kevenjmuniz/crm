'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Instance } from '@/lib/types';

export default function SettingsPage() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async () => {
    setInstances(await api<Instance[]>('/instances').catch(() => []));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function refreshWebhook(id: string, name: string) {
    setBusy(id);
    setFeedback('');
    try {
      await api(`/instances/${id}/webhook`, { method: 'POST' });
      setFeedback(`Webhook da instância "${name}" re-registrado com sucesso.`);
    } catch (e) {
      setFeedback(`Erro: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  async function logoutInstance(id: string, name: string) {
    if (!confirm(`Desconectar o WhatsApp da instância "${name}"?`)) return;
    setBusy(id);
    try {
      await api(`/instances/${id}/logout`, { method: 'POST' });
      setFeedback(`Instância "${name}" desconectada.`);
      load();
    } catch (e) {
      setFeedback(`Erro: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="mb-4 text-lg font-semibold">Configurações</h1>

      <div className="grid max-w-3xl gap-4">
        <div className="card">
          <p className="mb-1 text-sm font-semibold">Webhooks das conexões</p>
          <p className="mb-3 text-xs text-slate-500">
            Se as mensagens pararem de chegar no CRM (após mudar domínio ou
            variáveis), re-registre o webhook da instância na Evolution API. A
            sessão do WhatsApp não é afetada.
          </p>
          <div className="space-y-2">
            {instances.map((i) => (
              <div
                key={i.id}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"
              >
                <span className="text-sm font-medium">📱 {i.name}</span>
                <div className="flex gap-2">
                  <button
                    className="btn-ghost border border-slate-200"
                    disabled={busy === i.id}
                    onClick={() => refreshWebhook(i.id, i.name)}
                  >
                    {busy === i.id ? 'Aguarde...' : 'Re-registrar webhook'}
                  </button>
                  <button
                    className="btn-danger"
                    disabled={busy === i.id}
                    onClick={() => logoutInstance(i.id, i.name)}
                  >
                    Desconectar
                  </button>
                </div>
              </div>
            ))}
            {instances.length === 0 && (
              <p className="text-sm text-slate-400">Nenhuma conexão criada</p>
            )}
          </div>
          {feedback && <p className="mt-3 text-sm text-slate-600">{feedback}</p>}
        </div>

        <div className="card">
          <p className="mb-1 text-sm font-semibold">Acesso ao painel</p>
          <p className="text-xs text-slate-500">
            A senha do painel é definida pela variável de ambiente{' '}
            <code className="rounded bg-slate-100 px-1">WEB_PASSWORD</code> do
            serviço <code className="rounded bg-slate-100 px-1">crm-web</code> no
            Easypanel. Para trocá-la: altere a variável, faça o redeploy e todos
            precisarão entrar de novo.
          </p>
        </div>

        <div className="card">
          <p className="mb-1 text-sm font-semibold">Sobre</p>
          <p className="text-xs text-slate-500">
            CRM WhatsApp v0.1.0 — NestJS + Prisma (Supabase) + Evolution API +
            BullMQ/Redis. Painel Next.js. Código:{' '}
            <a
              className="text-brand-600 underline"
              href="https://github.com/kevenjmuniz/crm"
              target="_blank"
            >
              github.com/kevenjmuniz/crm
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
