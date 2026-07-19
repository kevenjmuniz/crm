'use client';

import { useCallback, useEffect, useState } from 'react';
import { DragDropContext, Draggable, Droppable, DropResult } from '@hello-pangea/dnd';
import { api } from '@/lib/api';
import { Contact, Pipeline, contactName } from '@/lib/types';

export default function PipelinePage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [board, setBoard] = useState<Pipeline | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [showNewDeal, setShowNewDeal] = useState<string | null>(null);
  const [dealTitle, setDealTitle] = useState('');
  const [dealContact, setDealContact] = useState('');
  const [newPipelineName, setNewPipelineName] = useState('');

  const loadBoard = useCallback(async (id: string) => {
    const data = await api<Pipeline>(`/pipelines/${id}/board`).catch(() => null);
    if (data) setBoard(data);
  }, []);

  useEffect(() => {
    api<Pipeline[]>('/pipelines').then((p) => {
      setPipelines(p);
      if (p[0]) loadBoard(p[0].id);
    });
    api<Contact[]>('/contacts?perPage=200').then(setContacts).catch(() => {});
  }, [loadBoard]);

  async function createPipeline() {
    if (!newPipelineName.trim()) return;
    const p = await api<Pipeline>('/pipelines', {
      method: 'POST',
      json: {
        name: newPipelineName.trim(),
        stages: ['Novo', 'Em contato', 'Proposta', 'Fechado'],
      },
    });
    setPipelines((prev) => [...prev, p]);
    setNewPipelineName('');
    loadBoard(p.id);
  }

  async function onDragEnd(result: DropResult) {
    if (!result.destination || !board) return;
    const { draggableId, destination } = result;
    // otimista
    setBoard((prev) => {
      if (!prev) return prev;
      const stages = prev.stages.map((s) => ({
        ...s,
        deals: s.deals.filter((d) => d.id !== draggableId),
      }));
      const deal = prev.stages
        .flatMap((s) => s.deals)
        .find((d) => d.id === draggableId);
      if (deal) {
        const target = stages.find((s) => s.id === destination.droppableId);
        target?.deals.splice(destination.index, 0, deal);
      }
      return { ...prev, stages };
    });
    await api(`/pipelines/deals/${draggableId}/move`, {
      method: 'PATCH',
      json: { stageId: destination.droppableId, position: destination.index },
    }).catch(() => {});
    loadBoard(board.id);
  }

  async function createDeal(stageId: string) {
    if (!dealTitle.trim() || !dealContact) return;
    await api('/pipelines/deals', {
      method: 'POST',
      json: { title: dealTitle.trim(), stageId, contactId: dealContact },
    }).catch((e) => alert(e.message));
    setShowNewDeal(null);
    setDealTitle('');
    setDealContact('');
    if (board) loadBoard(board.id);
  }

  if (pipelines.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="card w-full max-w-sm space-y-3 text-center">
          <p className="font-medium">Nenhum funil criado</p>
          <p className="text-sm text-slate-500">
            Crie o primeiro funil (com etapas padrão: Novo, Em contato, Proposta,
            Fechado)
          </p>
          <input
            className="input"
            placeholder="Nome do funil (ex.: Vendas)"
            value={newPipelineName}
            onChange={(e) => setNewPipelineName(e.target.value)}
          />
          <button className="btn-primary w-full justify-center" onClick={createPipeline}>
            Criar funil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <select
          className="input !w-auto"
          value={board?.id ?? ''}
          onChange={(e) => loadBoard(e.target.value)}
        >
          {pipelines.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      {board && (
        <div className="flex-1 overflow-x-auto p-4">
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex h-full gap-4">
              {board.stages.map((stage) => (
                <div key={stage.id} className="flex w-72 shrink-0 flex-col">
                  <div className="mb-2 flex items-center justify-between px-1">
                    <span className="text-sm font-semibold">
                      {stage.name}{' '}
                      <span className="text-slate-400">({stage.deals.length})</span>
                    </span>
                    <button
                      className="text-slate-400 hover:text-brand-600"
                      onClick={() => setShowNewDeal(stage.id)}
                    >
                      +
                    </button>
                  </div>
                  {showNewDeal === stage.id && (
                    <div className="card mb-2 space-y-2 !p-3">
                      <input
                        className="input"
                        placeholder="Título do card"
                        value={dealTitle}
                        onChange={(e) => setDealTitle(e.target.value)}
                        autoFocus
                      />
                      <select
                        className="input"
                        value={dealContact}
                        onChange={(e) => setDealContact(e.target.value)}
                      >
                        <option value="">Contato...</option>
                        {contacts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {contactName(c)}
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <button
                          className="btn-primary flex-1 justify-center"
                          onClick={() => createDeal(stage.id)}
                        >
                          Adicionar
                        </button>
                        <button className="btn-ghost" onClick={() => setShowNewDeal(null)}>
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                  <Droppable droppableId={stage.id}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex-1 space-y-2 rounded-xl bg-slate-100 p-2"
                      >
                        {stage.deals.map((deal, i) => (
                          <Draggable key={deal.id} draggableId={deal.id} index={i}>
                            {(prov) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                className="card !p-3"
                              >
                                <p className="text-sm font-medium">{deal.title}</p>
                                <p className="text-xs text-slate-400">
                                  {contactName(deal.contact)}
                                </p>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        </div>
      )}
    </div>
  );
}
