'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Instance } from '@/lib/types';

const statusStyle: Record<string, string> = {
  CONNECTED: 'bg-brand-50 text-brand-700',
  CONNECTING: 'bg-amber-50 text-amber-600',
  DISCONNECTED: 'bg-red-50 text-red-600',
};

export default function InstancesPage() {
  const [instances, setInstances] = useState<Instance[]>([]);
  const [name, setName] = useState('');
  const [qr, setQr] = useState<{ id: string; base64: string } | null>(null);
  const [loadingQr, setLoadingQr] = useState(false);

  const load = useCallback(async () => {
    setInstances(await api<Instance[]>('/instances').catch(() => []));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 8000);
    return () => clearInterval(t);
  }, [load]);

  async function create() {
    if (!name.trim()) return;
    try {
      await api('/instances', { method: 'POST', json: { name: name.trim() } });
      setName('');
      load();
    } catch (e) {
      alert((e as Error).message);
    }
  }

  async function showQr(id: string) {
    setLoadingQr(true);
    try {
      const data = await api<{ base64?: string; qrcode?: { base64?: string } }>(
        `/instances/${id}/qrcode`,
      );
      const base64 = data.base64 ?? data.qrcode?.base64;
      if (base64) setQr({ id, base64 });
      else alert('QR indisponível — a instância pode já estar conectada.');
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setLoadingQr(false);
    }
  }

  async function remove(id: string, nameToConfirm: string) {
    if (!confirm(`Excluir a instância "${nameToConfirm}"? A sessão do WhatsApp será desconectada.`))
      return;
    await api(`/instances/${id}`, { method: 'DELETE' }).catch((e) =>
      alert((e as Error).message),
    );
    load();
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Conexões WhatsApp</h1>
        <div className="flex gap-2">
          <input
            className="input !w-56"
            placeholder="nome-da-instancia"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
          />
          <button className="btn-primary" onClick={create}>
            + Conectar número
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {instances.map((i) => (
          <div key={i.id} className="card space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">📱 {i.name}</span>
              <span className={`badge ${statusStyle[i.status]}`}>{i.status}</span>
            </div>
            {i.phone && <p className="text-sm text-slate-500">{i.phone}</p>}
            <div className="flex gap-2">
              <button
                className="btn-ghost border border-slate-200"
                onClick={() => showQr(i.id)}
                disabled={loadingQr}
              >
                QR code
              </button>
              <button className="btn-danger" onClick={() => remove(i.id, i.name)}>
                Excluir
              </button>
            </div>
          </div>
        ))}
        {instances.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-slate-400">
            Nenhum número conectado
          </p>
        )}
      </div>

      {qr && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setQr(null)}
        >
          <div className="card max-w-sm text-center" onClick={(e) => e.stopPropagation()}>
            <p className="mb-2 font-medium">Escaneie no WhatsApp</p>
            <p className="mb-3 text-xs text-slate-500">
              Aparelhos conectados → Conectar aparelho. O QR expira em ~40s.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr.base64} alt="QR code" className="mx-auto w-64" />
            <div className="mt-3 flex justify-center gap-2">
              <button className="btn-primary" onClick={() => showQr(qr.id)}>
                Gerar novo
              </button>
              <button className="btn-ghost" onClick={() => setQr(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
