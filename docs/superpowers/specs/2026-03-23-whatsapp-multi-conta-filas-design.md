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
  name:                String (required),        // ex: "Vendas SP"
  phoneNumberId:       String (unique, required), // Meta phone_number_id
  accessToken:        String (required),          // Meta access token
  businessAccountId:  String (required),          // Meta WABA ID
  verifyToken:        String (required),          // webhook verify token
  isActive:           Boolean (default: true),
  needsReauth:        Boolean (default: false),   // token expirado
  allowedRoles:       [String] (enum: admin|manager|seller),
  assignedUsers:      [ObjectId ref:User],        // agentes autorizados
  maxConcurrentChats: Number (default: 5),        // limite por agente
  queueExpiresInMin:  Number (default: 60),       // TTL de entrada na fila
  createdBy:          ObjectId ref:User,
  isDeleted:          Boolean (default: false),
  timestamps:         true
}
```

### `WhatsAppQueueEntry` (novo)

```js
{
  accountId:      ObjectId ref:WhatsAppAccount (required),
  conversationId: ObjectId ref:WhatsAppConversation (required, unique),
  leadId:         ObjectId ref:Lead,
  priority:       Number (0–100, calculado do lead.score),
  status:         Enum ['waiting', 'assigned', 'expired'],
  assignedTo:     ObjectId ref:User,
  assignedAt:     Date,
  expiresAt:      Date,  // criatedAt + queueExpiresInMin
  timestamps:     true
}
```

### `WhatsAppConversation` (atualização)

Adicionar campo: `accountId: ObjectId ref:WhatsAppAccount`

---

## Fluxo de Entrada (Webhook)

1. Meta POST `/api/whatsapp/webhook`
2. Extrair `phoneNumberId` de `entry[0].changes[0].value.metadata.phone_number_id`
3. Buscar `WhatsAppAccount` ativo pelo `phoneNumberId`
   - Não encontrado ou inativo → log warning, retornar HTTP 200 (Meta exige 200 sempre)
4. Usar credenciais da conta para operações subsequentes (API calls, token)
5. Criar/atualizar `WhatsAppConversation` com `accountId`
6. Se conversa sem `assignedTo` → criar `WhatsAppQueueEntry` com `priority = lead.score ?? 0`
7. Broadcast Socket.IO `queue:updated` para managers da conta

---

## Job de Distribuição Automática

- **Scheduler:** `node-cron`, intervalo de 30 segundos (usa infra existente)
- **Lógica por ciclo:**
  1. Buscar todas as contas ativas
  2. Para cada conta: buscar `QueueEntry` com `status: 'waiting'`, ordenadas por `priority DESC`, `createdAt ASC` (desempate por FIFO)
  3. Para cada entrada: buscar agentes da conta (`assignedUsers`) com menos de `maxConcurrentChats` conversas ativas
  4. Distribuir em round-robin entre agentes disponíveis
  5. Atualizar `QueueEntry.status = 'assigned'`, `assignedTo`, `assignedAt`
  6. Atualizar `WhatsAppConversation.assignedTo`
  7. Emitir `queue:assigned` para o agente + `queue:updated` para managers
  8. Expirar entradas com `expiresAt < now` → `status: 'expired'` + notificação ao manager

---

## Rotas da API

### Contas (`/api/whatsapp/accounts`)

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| GET | `/accounts` | admin | Listar contas |
| POST | `/accounts` | admin | Criar conta |
| PUT | `/accounts/:id` | admin | Editar conta |
| PATCH | `/accounts/:id/toggle` | admin | Ativar/desativar |
| DELETE | `/accounts/:id` | admin | Soft delete |

### Fila (`/api/whatsapp/queue`)

| Método | Path | Role | Descrição |
|--------|------|------|-----------|
| GET | `/accounts/:id/queue` | admin/manager | Fila de uma conta |
| GET | `/queue` | admin/manager | Fila geral |
| PATCH | `/queue/:entryId/assign` | admin/manager | Reatribuição manual |

### Webhook (atualização)

O handler `processIncomingWebhook` recebe lookup de conta por `phoneNumberId` antes de qualquer processamento.

---

## Frontend

### 1. Settings → Aba "WhatsApp" (admin)
- Listagem de contas com badge ativo/inativo
- Formulário de criação/edição: nome, phoneNumberId, accessToken, businessAccountId, verifyToken, maxConcurrentChats, queueExpiresInMin
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
- Filtro por conta

---

## Eventos Socket.IO

| Evento | Destinatário | Payload |
|--------|-------------|---------|
| `queue:assigned` | agente específico (sala `user:{id}`) | `{ conversationId, leadName, accountName }` |
| `queue:updated` | managers da conta (sala `role:manager`) | `{ accountId, waitingCount }` |
| `queue:expired` | managers (sala `role:manager`) | `{ entryId, leadName, accountName }` |

---

## Tratamento de Erros

| Situação | Comportamento |
|----------|--------------|
| `phoneNumberId` não cadastrado no webhook | Log warning + HTTP 200 (Meta exige) |
| `accessToken` expirado | Marcar conta `needsReauth: true`, notificar admin, não bloquear outras contas |
| Agente removido com conversas ativas | Conversas voltam para fila com prioridade preservada |
| Fila sem agentes disponíveis | Entry fica `waiting` até próximo ciclo; expira após `queueExpiresInMin` |
| `phoneNumberId` duplicado na criação | HTTP 409 com mensagem clara |

---

## Testes

- `whatsapp-account.service.test.js` — CRUD, validação de duplicata, toggle
- `whatsapp-queue.service.test.js` — lógica de prioridade, round-robin, caso sem agentes
- `whatsapp-queue.job.test.js` — ciclo do cron: atribuições, expiração
- `webhook.routing.test.js` — webhook com `phoneNumberId` válido/inválido/inativo

---

## Compatibilidade com Fase Atual

- A configuração single-account via `.env` continua funcionando durante a migração
- `WhatsAppConversation.accountId` é nullable para conversas históricas
- O job de distribuição só processa conversas de contas cadastradas no novo modelo
