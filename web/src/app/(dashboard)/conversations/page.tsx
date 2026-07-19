'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import {
  Conversation,
  Instance,
  Message,
  Queue,
  UserT,
  contactName,
} from '@/lib/types';

const statusLabel: Record<string, string> = {
  PENDING: 'Aguardando',
  OPEN: 'Em atendimento',
  CLOSED: 'Fechadas',
};

export default function ConversationsPage() {
  const [filter, setFilter] = useState<'PENDING' | 'OPEN' | 'CLOSED' | ''>('');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [users, setUsers] = useState<UserT[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [instances, setInstances] = useState<Instance[]>([]);
  const [showNew, setShowNew] = useState(false);
  const [newForm, setNewForm] = useState({ phone: '', instanceId: '', text: '' });
  const [starting, setStarting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    const query = filter ? `?status=${filter}` : '';
    const data = await api<Conversation[]>(`/conversations${query}`).catch(() => []);
    setConversations(data);
  }, [filter]);

  const loadMessages = useCallback(async (id: string) => {
    const data = await api<Message[]>(`/conversations/${id}/messages?perPage=100`).catch(
      () => [],
    );
    setMessages(data.slice().reverse());
  }, []);

  useEffect(() => {
    loadConversations();
    const t = setInterval(loadConversations, 5000);
    return () => clearInterval(t);
  }, [loadConversations]);

  useEffect(() => {
    if (!selected) return;
    loadMessages(selected.id);
    const t = setInterval(() => loadMessages(selected.id), 3000);
    return () => clearInterval(t);
  }, [selected, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    api<UserT[]>('/teams/users').then(setUsers).catch(() => {});
    api<Queue[]>('/teams/queues').then(setQueues).catch(() => {});
    api<Instance[]>('/instances').then(setInstances).catch(() => {});
  }, []);

  async function startConversation() {
    const phone = newForm.phone.replace(/\D/g, '');
    if (!phone || !newForm.instanceId) {
      alert('Informe o telefone (com DDI, ex.: 5511999999999) e a instância');
      return;
    }
    setStarting(true);
    try {
      const conv = await api<Conversation>('/conversations', {
        method: 'POST',
        json: {
          phone,
          instanceId: newForm.instanceId,
          text: newForm.text.trim() || undefined,
        },
      });
      setShowNew(false);
      setNewForm({ phone: '', instanceId: '', text: '' });
      await loadConversations();
      setSelected(conv);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setStarting(false);
    }
  }

  async function openConversation(c: Conversation) {
    setSelected(c);
    setMessages([]);
    if (c.unreadCount > 0) {
      await api(`/conversations/${c.id}/read`, { method: 'POST' }).catch(() => {});
      loadConversations();
    }
  }

  async function send() {
    if (!text.trim() || !selected) return;
    setSending(true);
    try {
      await api(`/conversations/${selected.id}/messages`, {
        method: 'POST',
        json: { text: text.trim() },
      });
      setText('');
      await loadMessages(selected.id);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  async function assign(field: 'assignedToId' | 'queueId', value: string) {
    if (!selected) return;
    await api(`/conversations/${selected.id}/assign`, {
      method: 'PATCH',
      json: { [field]: value || undefined },
    }).catch(() => {});
    loadConversations();
  }

  async function setStatus(status: string) {
    if (!selected) return;
    await api(`/conversations/${selected.id}/status`, {
      method: 'PATCH',
      json: { status },
    }).catch(() => {});
    setSelected({ ...selected, status: status as Conversation['status'] });
    loadConversations();
  }

  return (
    <div className="flex h-full">
      {/* Lista */}
      <div className="flex w-80 shrink-0 flex-col border-r border-slate-200 bg-white">
        <div className="space-y-2 border-b border-slate-200 p-3">
          <button
            className="btn-primary w-full justify-center"
            onClick={() => setShowNew(true)}
          >
            + Nova conversa
          </button>
          <div className="flex gap-1">
            {(['', 'PENDING', 'OPEN', 'CLOSED'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  filter === s
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {s === '' ? 'Todas' : statusLabel[s]}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.length === 0 && (
            <p className="p-4 text-center text-sm text-slate-400">
              Nenhuma conversa
            </p>
          )}
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => openConversation(c)}
              className={`flex w-full items-center gap-3 border-b border-slate-100 px-3 py-3 text-left hover:bg-slate-50 ${
                selected?.id === c.id ? 'bg-brand-50' : ''
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-200 text-sm font-semibold text-slate-600">
                {contactName(c.contact).slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="truncate text-sm font-medium">
                    {contactName(c.contact)}
                  </span>
                  {c.unreadCount > 0 && (
                    <span className="ml-1 rounded-full bg-brand-600 px-1.5 text-xs font-semibold text-white">
                      {c.unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1 text-xs text-slate-400">
                  <span
                    className={`badge ${
                      c.status === 'PENDING'
                        ? 'bg-amber-50 text-amber-600'
                        : c.status === 'OPEN'
                          ? 'bg-brand-50 text-brand-700'
                          : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {statusLabel[c.status]}
                  </span>
                  <span className="badge bg-sky-50 text-sky-600">
                    📱 {c.instance.name}
                  </span>
                  {c.assignedTo && <span>· {c.assignedTo.name}</span>}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat */}
      {selected ? (
        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
            <div>
              <p className="font-medium">{contactName(selected.contact)}</p>
              <p className="text-xs text-slate-400">
                {selected.contact.phone} · {selected.instance.name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                className="input !w-auto text-xs"
                value={selected.assignedTo?.id ?? ''}
                onChange={(e) => assign('assignedToId', e.target.value)}
              >
                <option value="">Sem atendente</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
              <select
                className="input !w-auto text-xs"
                value={selected.queue?.id ?? ''}
                onChange={(e) => assign('queueId', e.target.value)}
              >
                <option value="">Sem fila</option>
                {queues.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.name}
                  </option>
                ))}
              </select>
              {selected.status !== 'CLOSED' ? (
                <button className="btn-danger" onClick={() => setStatus('CLOSED')}>
                  Encerrar
                </button>
              ) : (
                <button className="btn-primary" onClick={() => setStatus('OPEN')}>
                  Reabrir
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto bg-slate-100 p-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex ${m.direction === 'OUTBOUND' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-md rounded-2xl px-3.5 py-2 text-sm shadow-sm ${
                    m.direction === 'OUTBOUND'
                      ? 'rounded-br-sm bg-brand-100'
                      : 'rounded-bl-sm bg-white'
                  }`}
                >
                  {m.type !== 'TEXT' && (
                    <span className="mr-1 text-xs text-slate-400">
                      [{m.type.toLowerCase()}]
                    </span>
                  )}
                  {m.content ?? <em className="text-slate-400">mídia</em>}
                  <div className="mt-0.5 text-right text-[10px] text-slate-400">
                    {new Date(m.timestamp).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {m.direction === 'OUTBOUND' && (
                      <span className="ml-1">
                        {m.status === 'READ' ? '✓✓' : m.status === 'DELIVERED' ? '✓✓' : '✓'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="flex gap-2 border-t border-slate-200 bg-white p-3">
            <input
              className="input"
              placeholder="Digite uma mensagem..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            />
            <button className="btn-primary" onClick={send} disabled={sending}>
              Enviar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center text-slate-400">
          Selecione uma conversa
        </div>
      )}

      {showNew && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowNew(false)}
        >
          <div
            className="card w-full max-w-sm space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-medium">Nova conversa</p>
            <input
              className="input"
              placeholder="Telefone com DDI (ex.: 5511999999999)"
              value={newForm.phone}
              onChange={(e) => setNewForm({ ...newForm, phone: e.target.value })}
              autoFocus
            />
            <select
              className="input"
              value={newForm.instanceId}
              onChange={(e) => setNewForm({ ...newForm, instanceId: e.target.value })}
            >
              <option value="">Enviar pela instância...</option>
              {instances.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} ({i.status})
                </option>
              ))}
            </select>
            <textarea
              className="input min-h-20"
              placeholder="Primeira mensagem (opcional)"
              value={newForm.text}
              onChange={(e) => setNewForm({ ...newForm, text: e.target.value })}
            />
            <div className="flex gap-2">
              <button
                className="btn-primary flex-1 justify-center"
                onClick={startConversation}
                disabled={starting}
              >
                {starting ? 'Iniciando...' : 'Iniciar conversa'}
              </button>
              <button className="btn-ghost" onClick={() => setShowNew(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
