'use client';

import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Contact, Tag, contactName } from '@/lib/types';

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [newTag, setNewTag] = useState('');

  const load = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (tagFilter) params.set('tagId', tagFilter);
    params.set('perPage', '100');
    const data = await api<Contact[]>(`/contacts?${params}`).catch(() => []);
    setContacts(data);
  }, [search, tagFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    api<Tag[]>('/contacts/tags').then(setTags).catch(() => {});
  }, []);

  async function createTag() {
    if (!newTag.trim()) return;
    const t = await api<Tag>('/contacts/tags', {
      method: 'POST',
      json: { name: newTag.trim() },
    });
    setTags((prev) => [...prev.filter((x) => x.id !== t.id), t]);
    setNewTag('');
  }

  async function toggleTag(contact: Contact, tagId: string) {
    const has = contact.tags?.some((t) => t.tag.id === tagId);
    if (has) {
      await api(`/contacts/${contact.id}/tags/${tagId}`, { method: 'DELETE' });
    } else {
      await api(`/contacts/${contact.id}/tags/${tagId}`, { method: 'POST' });
    }
    load();
  }

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">Contatos</h1>
        <input
          className="input !w-64"
          placeholder="Buscar por nome ou telefone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input !w-auto"
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
        >
          <option value="">Todas as tags</option>
          {tags.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <div className="ml-auto flex gap-2">
          <input
            className="input !w-40"
            placeholder="Nova tag..."
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createTag()}
          />
          <button className="btn-primary" onClick={createTag}>
            + Tag
          </button>
        </div>
      </div>

      <div className="card !p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-400">
              <th className="px-4 py-3">Nome</th>
              <th className="px-4 py-3">Telefone</th>
              <th className="px-4 py-3">Tags</th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium">{contactName(c)}</td>
                <td className="px-4 py-3 text-slate-500">{c.phone}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {tags.map((t) => {
                      const active = c.tags?.some((x) => x.tag.id === t.id);
                      return (
                        <button
                          key={t.id}
                          onClick={() => toggleTag(c, t.id)}
                          className={`badge border ${
                            active
                              ? 'border-brand-600 bg-brand-50 text-brand-700'
                              : 'border-slate-200 text-slate-400 hover:border-slate-300'
                          }`}
                        >
                          {t.name}
                        </button>
                      );
                    })}
                  </div>
                </td>
              </tr>
            ))}
            {contacts.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-400">
                  Nenhum contato — eles são criados automaticamente quando chegam
                  mensagens
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
