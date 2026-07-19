'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Queue, UserT } from '@/lib/types';

export default function TeamPage() {
  const [users, setUsers] = useState<UserT[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [userForm, setUserForm] = useState({ name: '', email: '', role: 'AGENT' });
  const [queueName, setQueueName] = useState('');

  const load = useCallback(async () => {
    setUsers(await api<UserT[]>('/teams/users').catch(() => []));
    setQueues(await api<Queue[]>('/teams/queues').catch(() => []));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function createUser() {
    if (!userForm.name || !userForm.email) return;
    await api('/teams/users', { method: 'POST', json: userForm }).catch((e) =>
      alert((e as Error).message),
    );
    setUserForm({ name: '', email: '', role: 'AGENT' });
    load();
  }

  async function createQueue() {
    if (!queueName.trim()) return;
    await api('/teams/queues', {
      method: 'POST',
      json: { name: queueName.trim() },
    }).catch((e) => alert((e as Error).message));
    setQueueName('');
    load();
  }

  async function toggleQueue(user: UserT, queueId: string) {
    const has = user.queues?.some((q) => q.queue.id === queueId);
    const method = has ? 'DELETE' : 'POST';
    await api(`/teams/queues/${queueId}/users/${user.id}`, { method }).catch(() => {});
    load();
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <h1 className="mb-4 text-lg font-semibold">Equipe</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-3 flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500">Nome</label>
              <input
                className="input"
                value={userForm.name}
                onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500">E-mail</label>
              <input
                className="input"
                value={userForm.email}
                onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
              />
            </div>
            <select
              className="input !w-auto"
              value={userForm.role}
              onChange={(e) => setUserForm({ ...userForm, role: e.target.value })}
            >
              <option value="AGENT">Atendente</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="ADMIN">Admin</option>
            </select>
            <button className="btn-primary" onClick={createUser}>
              +
            </button>
          </div>

          <div className="card !p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
                  <th className="px-4 py-3">Atendente</th>
                  <th className="px-4 py-3">Papel</th>
                  <th className="px-4 py-3">Filas</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-4 py-3">
                      <p className="font-medium">{u.name}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{u.role}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {queues.map((q) => {
                          const active = u.queues?.some((x) => x.queue.id === q.id);
                          return (
                            <button
                              key={q.id}
                              onClick={() => toggleQueue(u, q.id)}
                              className={`badge border ${
                                active
                                  ? 'border-brand-600 bg-brand-50 text-brand-700'
                                  : 'border-slate-200 text-slate-400'
                              }`}
                            >
                              {q.name}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-slate-400">
                      Nenhum atendente
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-end gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-slate-500">
                Nova fila/setor
              </label>
              <input
                className="input"
                placeholder="ex.: Vendas, Suporte"
                value={queueName}
                onChange={(e) => setQueueName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && createQueue()}
              />
            </div>
            <button className="btn-primary" onClick={createQueue}>
              +
            </button>
          </div>
          <div className="grid gap-2">
            {queues.map((q) => (
              <div key={q.id} className="card flex items-center justify-between !p-3">
                <span className="font-medium">{q.name}</span>
                <span className="text-xs text-slate-400">
                  {q.users?.length ?? 0} atendente(s)
                </span>
              </div>
            ))}
            {queues.length === 0 && (
              <p className="py-4 text-center text-sm text-slate-400">Nenhuma fila</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
