# WhatsApp Multi-Contas + Gestão Avançada de Filas

**Data:** 2026-03-23
**Fase:** 3B — Expansão Multicanal & IA
**Status:** Aprovado

---

## Contexto

O CRM atualmente suporta uma única conta WhatsApp Business configurada via variáveis de ambiente (`WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`). A Fase 3B exige suporte a múltiplas contas (múltiplos Meta Business Accounts, cada um com múltiplos números) com gestão de filas de atendimento e priorização por lead score.

---

## Escopo

- Múltiplos Meta Business Accounts e múltiplos números de telefone por deployment
- Fila de atendimento com espera + roteamento por regras
- Priorização da fila por lead score
- Auto-distribuição de conversas (sistema distribui, agente não precisa "puxar")
- Admin cria e configura contas; managers gerenciam agentes por conta

Fora do escopo: multi-tenant completo com namespacing por empresa (previsto para Fase 3C).

---

## Abordagem Escolhida

**Modelo de Conta Plano com webhook único.**

O webhook da Meta identifica a conta pelo campo `entry[].changes[].value.metadata.phone_number_id` no payload. Um modelo `WhatsAppAccount` mapeia cada `phoneNumberId` para suas credenciais e regras. Webhook único registrado no Meta, roteamento interno por `phoneNumberId`.

---

## Modelos de Dados

### `WhatsAppAccount` (novo)

```js
{
  name:                String (required),         // ex: "Vendas SP"
  phoneNumberId:       String (unique, required), // Meta phone_number_id
  accessToken:        String (required),           // Meta access token — CRIPTOGRAFADO em repouso (AES-256 via mongoose-field-encryption ou equivalente)
  businessAccountId:  String (required),           // Meta WABA ID
  verifyToken:        String (required),           // webhook verify token
  isActive:           Boolean (default: true),
  needsReauth:        Boolean (default: false),    // token expirado/inválido
  allowedRoles:       [String] (enum: admin|manager|seller),
  assignedUsers:      [ObjectId ref:User],         // agentes autorizados
  maxConcurrentChats: Number (default: 5),         // limite por agente
  queueExpiresInMin:  Number (default: 60),        // TTL de entrada na fila
  rrPointer:          Number (default: 0),         // índice round-robin persistido por conta
  createdBy:          ObjectId ref:User,
  isDeleted:          Boolean (default: false),
  timestamps:         true
}
```

**Segurança do `accessToken`:**
- Criptografado em repouso no campo do banco (AES-256)
- Redactado (substituído por `"***"`) em todas as respostas GET (`/accounts` e `/accounts/:id`)
- Retornado completo apenas ao criar/editar (para confirmação imediata)
- Toda alteração de token é registrada no sistema de auditoria existente

### `WhatsAppQueueEntry` (novo)

```js
{
  accountId:      ObjectId ref:WhatsAppAccount (required),
  conversationId: ObjectId ref:WhatsAppConversation (required),  // sem unique — re-entrada é permitida
  leadId:         ObjectId ref:Lead,
  priority:       Number (0–100, calculado do lead.score),
  status:         Enum ['waiting', 'assigned', 'expired'],
  assignedTo:     ObjectId ref:User,
  assignedAt:     Date,
  expiresAt:      Date,  // createdAt + queueExpiresInMin da conta
  timestamps:     true
}
```

**Índice composto:** `{ conversationId: 1, status: 1 }` — permite múltiplos históricos por conversa mas garante query eficiente de entradas ativas.

**Re-entrada na fila:** Quando um agente é removido de uma conta e tem conversas ativas, o sistema reutiliza a `QueueEntry` existente (se `status !== 'waiting'`, reseta para `waiting` e limpa `assignedTo`/`assignedAt`). Não cria nova entrada para evitar duplicatas ativas.

### `WhatsAppConversation` (atualização)

Adicionar campo: `accountId: ObjectId ref:WhatsAppAccount` (nullable para conversas históricas)

---

## Fluxo de Entrada (Webhook)

1. Meta POST `/api/whatsapp/webhook`
2. Extrair `phoneNumberId` de `entry[0].changes[0].value.metadata.phone_number_id`
3. Buscar `WhatsAppAccount` ativo pelo `phoneNumberId`
   - Não encontrado → **fallback legado**: usar credenciais do `.env` se `WHATSAPP_PHONE_NUMBER_ID` bater; log deprecation warning. Se não bater → log warning + HTTP 200 (Meta exige 200 sempre, sem retry)
   - **Migração:** Na inicialização do servidor, se `WhatsAppAccount` collection está vazia e `.env` tem `WHATSAPP_PHONE_NUMBER_ID`, fazer seed automático de um registro "Conta Principal" com as credenciais do `.env`. Isso garante que a conta existente seja gerenciada pelo novo modelo sem interrupção de mensagens.
4. Usar credenciais da conta para operações subsequentes (API calls, token)
5. Criar/atualizar `WhatsAppConversation` com `accountId`
6. Se conversa sem `assignedTo` → upsert `WhatsAppQueueEntry` (`status: 'waiting'`, `priority = lead.score ?? 0`, `expiresAt = now + conta.queueExpiresInMin`)
7. Broadcast Socket.IO `queue:updated` para sala `account:{accountId}:managers`

---

## Job de Distribuição Automática

- **Scheduler:** `node-cron`, intervalo de 30 segundos (usa infra existente)
- **Round-robin persistido:** O campo `rrPointer` em `WhatsAppAccount` armazena o índice do último agente atribuído para aquela conta. Persistido no MongoDB — correto em deploys multi-processo e reinicializações.
- **Lógica por ciclo:**
  1. Buscar todas as contas ativas
  2. Para cada conta: buscar `QueueEntry` com `status: 'waiting'`, ordenadas por `priority DESC`, `createdAt ASC` (desempate FIFO)
  3. Para cada entrada: calcular agentes elegíveis = `assignedUsers` com menos de `maxConcurrentChats` conversas ativas
  4. Se nenhum agente elegível → pular (entry permanece `waiting` até expirar)
  5. Selecionar agente: `assignedUsers[(rrPointer + 1) % assignedUsers.length]` dentre os elegíveis; atualizar `rrPointer` na conta
  6. Atualizar `QueueEntry.status = 'assigned'`, `assignedTo`, `assignedAt`
  7. Atualizar `WhatsAppConversation.assignedTo`
  8. Emitir `queue:assigned` (sala `user:{agentId}`) + `queue:updated` (sala `account:{accountId}:managers`)
  9. Expirar entradas com `expiresAt < now` → `status: 'expired'` + notificação ao manager via `queue:expired`

---

## Rotas da API

### Contas (`/api/whatsapp/accounts`)

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| GET | `/accounts` | admin | Listar contas (accessToken redactado) |
| GET | `/accounts/:id` | admin | Detalhe de uma conta (accessToken redactado) |
| POST | `/accounts` | admin | Criar conta (resposta inclui accessToken decriptado para confirmação) |
| PUT | `/accounts/:id` | admin | Editar conta (resposta inclui accessToken decriptado para confirmação) |
| PATCH | `/accounts/:id/toggle` | admin | Ativar/desativar |
| DELETE | `/accounts/:id` | admin | Soft delete |

### Fila (`/api/whatsapp/queue`)

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| GET | `/accounts/:id/queue` | admin/manager | Fila de uma conta |
| GET | `/queue` | admin/manager | Fila geral |
| PATCH | `/queue/:entryId/assign` | admin/manager | Reatribuição manual |

### Webhook (atualização)

O handler `processIncomingWebhook` recebe lookup de conta por `phoneNumberId` antes de qualquer processamento, com fallback legado descrito acima.

---

## Frontend

### 1. Settings → Aba "WhatsApp" (admin)
- Listagem de contas com badge ativo/inativo
- Formulário de criação/edição: nome, phoneNumberId, accessToken (input mascarado, nunca exibido em texto claro após salvar), businessAccountId, verifyToken, maxConcurrentChats, queueExpiresInMin
- Assign/unassign de agentes por conta
- Toggle ativar/desativar

### 2. Central de Conversas (atualização)
- Filtro por conta no topo da lista (tabs ou dropdown)
- Badge colorido por conta em cada item da lista
- Sellers veem apenas conversas de contas às quais estão atribuídos

### 3. Página de Fila (`/whatsapp/queue`) (nova — manager/admin)
- Métricas no topo: total aguardando, em atendimento, tempo médio de espera
- Lista de `QueueEntry` aguardando, ordenada por `priority DESC`
- Badge de score colorido (vermelho ≥80, amarelo ≥50, cinza <50)
- Tempo de espera por entrada
- Ação de reatribuição manual
- Filtro por conta (managers veem apenas contas às quais têm acesso)

---

## Eventos Socket.IO

| Evento | Destinatário | Payload |
|--------|-------------|---------|
| `queue:assigned` | agente específico (sala `user:{id}`) | `{ conversationId, leadName, accountName }` |
| `queue:updated` | managers da conta (sala `account:{accountId}:managers`) | `{ accountId, waitingCount }` |
| `queue:expired` | managers da conta (sala `account:{accountId}:managers`) | `{ entryId, leadName, accountName }` |

**Associação de sala:** Ao conectar via Socket.IO, o server deve ingressar o usuário nas salas `account:{id}:managers` para cada conta onde o usuário está em `assignedUsers` e tem role `manager` ou `admin`.

---

## Tratamento de Erros

| Situação | Comportamento |
|----------|--------------|
| `phoneNumberId` não cadastrado e sem match no `.env` | Log warning + HTTP 200 (Meta exige) |
| `phoneNumberId` não cadastrado mas bate com `.env` | Usar credenciais `.env` + log deprecation |
| `accessToken` expirado/inválido | Marcar conta `needsReauth: true`, notificar admin, não bloquear outras contas |
| Agente removido com conversas ativas | `QueueEntry` existente resetada para `waiting`, `assignedTo` limpo |
| Fila sem agentes disponíveis | Entry fica `waiting` até próximo ciclo; expira após `queueExpiresInMin` + notificação manager |
| `phoneNumberId` duplicado na criação | HTTP 409 com mensagem clara |
| Reatribuição manual por não-manager | HTTP 403 |

---

## Testes

- `whatsapp-account.service.test.js` — CRUD, validação de duplicata, toggle, soft delete (não aparece em GET)
- `whatsapp-queue.service.test.js` — lógica de prioridade, round-robin com `rrPointer`, re-entrada na fila, caso sem agentes disponíveis
- `whatsapp-queue.job.test.js` — ciclo do cron: atribuições, expiração, `rrPointer` incrementado corretamente
- `webhook.routing.test.js` — webhook com `phoneNumberId` válido/inválido/inativo; fallback legado; seed automático
- `whatsapp-socket.test.js` — `queue:updated` entregue apenas para sala `account:{id}:managers` correta; `queue:assigned` entregue apenas ao agente correto
- `whatsapp-auth.test.js` — `PATCH /queue/:id/assign` retorna 403 para sellers; `GET /accounts` retorna accessToken redactado; soft-deleted accounts excluídas do GET

---

## Compatibilidade com Fase Atual

- **Seed automático na inicialização:** Se `WhatsAppAccount` collection está vazia e `.env` tem `WHATSAPP_PHONE_NUMBER_ID`, o servidor cria automaticamente uma conta "Conta Principal" com as credenciais do `.env`. Elimina período de silêncio de mensagens durante a migração.
- `WhatsAppConversation.accountId` é nullable para conversas históricas (anteriores à migração)
- O job de distribuição só processa conversas de contas cadastradas no modelo `WhatsAppAccount`
- Variáveis de ambiente legadas (`WHATSAPP_*`) continuam lidas como fallback até serem substituídas pela conta seedada
