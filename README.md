# CRM API WhatsApp

API de CRM para WhatsApp construída com **NestJS + Prisma (Supabase Postgres)**, usando a **[Evolution API](https://doc.evolution-api.com)** como motor de WhatsApp e **BullMQ + Redis** para disparo de campanhas com controle de taxa.

## Funcionalidades

- **Instâncias**: criar/conectar números de WhatsApp via QR code (Evolution API)
- **Contatos**: sincronização automática via webhook, tags e notas
- **Conversas**: histórico de mensagens, envio de texto/mídia, status (pendente/aberta/fechada)
- **Multi-atendente**: usuários, filas/setores, atribuição e transferência de conversas
- **Funil (kanban)**: pipelines, etapas e cards (deals) vinculados a contatos
- **Campanhas**: disparo em massa com taxa configurável (msgs/minuto), agendamento, pausa/retomada

## Subindo o ambiente

```bash
# 1. Infra local: Evolution API + Postgres dela + Redis
docker compose up -d

# 2. Configuração
cp .env.example .env   # preencha DATABASE_URL (Supabase), chaves etc.

# 3. Dependências e banco
npm install
npx prisma migrate dev --name init

# 4. Rodar
npm run start:dev
```

A API sobe em `http://localhost:3000/api`. Todas as rotas exigem o header `x-api-key: <CRM_API_KEY>`, exceto o webhook.

> **Webhook em dev**: a Evolution (no Docker) precisa alcançar esta API. Use `WEBHOOK_BASE_URL=http://host.docker.internal:3000` (Windows/Mac) ou um túnel (ngrok) se a Evolution estiver em outro servidor.

## Fluxo básico

```bash
# criar instância (retorna QR code)
POST /api/instances            { "name": "vendas-01" }
GET  /api/instances/:id/qrcode

# depois de escanear o QR, mensagens recebidas criam contatos/conversas automaticamente
GET  /api/conversations?status=PENDING

# responder
POST /api/conversations/:id/messages   { "text": "Olá!" }

# atribuir a um atendente/fila
PATCH /api/conversations/:id/assign    { "assignedToId": "...", "queueId": "..." }

# funil
POST /api/pipelines                    { "name": "Vendas", "stages": ["Novo", "Negociando", "Fechado"] }
GET  /api/pipelines/:id/board

# campanha para uma tag, 10 msgs/min
POST /api/campaigns                    { "name": "Promo", "instanceId": "...", "message": "...", "tagId": "...", "ratePerMinute": 10 }
POST /api/campaigns/:id/start
```

## Estrutura

```
src/
  evolution/      cliente HTTP da Evolution API
  instances/      gestão de instâncias/números
  webhooks/       recebe eventos da Evolution (mensagens, conexão, contatos)
  contacts/       contatos, tags, notas
  conversations/  conversas, mensagens, atribuição
  pipelines/      funil kanban (pipelines, etapas, deals)
  teams/          usuários/atendentes e filas/setores
  campaigns/      campanhas com fila BullMQ e controle de taxa
```

## Avisos

- **Risco de bloqueio**: disparo em massa viola os termos do WhatsApp. Use taxas baixas (≤10/min), números aquecidos e apenas contatos que consentiram.
- A autenticação por `x-api-key` é um MVP — para produção, migre para Supabase Auth/JWT com usuários reais.
