# Deploy no Easypanel

Arquitetura no Easypanel — crie um projeto (ex.: `crm`) com **4 serviços**:

```
┌─────────────────────── projeto: crm ───────────────────────┐
│  crm-api (este repo)  ←──── webhook ────  evolution        │
│      │ envia mensagens ────────────────→  (WhatsApp)       │
│      │                                        │            │
│      │                                   evolution-db      │
│      └──→ Supabase (externo)             redis (filas)     │
└────────────────────────────────────────────────────────────┘
```

> **DNS interno do Easypanel**: serviços do mesmo projeto se enxergam pelo nome `<projeto>_<serviço>`. Os exemplos abaixo assumem projeto `crm` — ajuste se usar outro nome.

## 1. Serviço `redis`

- Tipo: **Redis** (serviço nativo do Easypanel), versão 7.
- Anote a senha gerada (ou desative senha se preferir — é rede interna).

## 2. Serviço `evolution-db`

- Tipo: **Postgres** 16.
- Database: `evolution` / user: `evolution` / senha: gere uma.

## 3. Serviço `evolution`

- Tipo: **App** → Docker Image: `atendai/evolution-api:v2.2.3`.
- Porta interna: `8080`. Adicione um domínio se quiser acessar o manager (`https://evolution.seudominio.com`).
- Volume: montar `/evolution/instances` (persistência das sessões).
- Variáveis de ambiente:

```env
AUTHENTICATION_API_KEY=<EVOLUTION_API_KEY>
SERVER_URL=https://evolution.seudominio.com
DATABASE_ENABLED=true
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://evolution:<SENHA_DB>@crm_evolution-db:5432/evolution?schema=public
DATABASE_SAVE_DATA_INSTANCE=true
DATABASE_SAVE_DATA_NEW_MESSAGE=true
DATABASE_SAVE_MESSAGE_UPDATE=true
DATABASE_SAVE_DATA_CONTACTS=true
DATABASE_SAVE_DATA_CHATS=true
CACHE_REDIS_ENABLED=true
CACHE_REDIS_URI=redis://default:<SENHA_REDIS>@crm_redis:6379/1
CACHE_REDIS_PREFIX_KEY=evolution
WEBHOOK_GLOBAL_ENABLED=false
LOG_LEVEL=ERROR,WARN,INFO
```

## 4. Serviço `crm-api` (este repositório)

- Tipo: **App** → Source: GitHub (este repo) → Build: **Dockerfile**.
- Porta interna: `3000`. Domínio: `https://crm.seudominio.com`.
- Variáveis de ambiente:

```env
PORT=3000
CRM_API_KEY=<CRM_API_KEY>

DATABASE_URL=postgresql://postgres.<PROJECT_REF>:<SENHA_SUPABASE>@aws-0-<REGIAO>.pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres:<SENHA_SUPABASE>@db.<PROJECT_REF>.supabase.co:5432/postgres

# comunicação interna entre serviços do projeto
EVOLUTION_BASE_URL=http://crm_evolution:8080
EVOLUTION_API_KEY=<EVOLUTION_API_KEY>
WEBHOOK_BASE_URL=http://crm_crm-api:3000
WEBHOOK_TOKEN=<WEBHOOK_TOKEN>

REDIS_HOST=crm_redis
REDIS_PORT=6379
REDIS_PASSWORD=<SENHA_REDIS>
```

> `EVOLUTION_BASE_URL` e `WEBHOOK_BASE_URL` usam a rede interna — o tráfego CRM↔Evolution não sai do servidor. Crie as tabelas do CRM no Supabase com `npx prisma migrate deploy` (ou via SQL) antes do primeiro deploy.

## Ordem de subida e teste

1. Suba `redis` e `evolution-db`, depois `evolution`, por último `crm-api`.
2. Teste: `curl -H "x-api-key: <CRM_API_KEY>" https://crm.seudominio.com/api/instances`
3. Crie a instância: `POST /api/instances {"name": "vendas-01"}` e escaneie o QR de `GET /api/instances/<id>/qrcode`.

## Checklist de produção

- [ ] Gerar chaves próprias para `<CRM_API_KEY>`, `<EVOLUTION_API_KEY>` e `<WEBHOOK_TOKEN>` (ex.: `openssl rand -hex 16`)
- [ ] Senha no Redis (o Easypanel gera por padrão)
- [ ] Backup do volume `/evolution/instances` (sessões do WhatsApp)
- [ ] Não expor porta pública do `evolution-db` e `redis`
