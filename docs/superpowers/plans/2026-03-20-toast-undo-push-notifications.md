# Toast com Undo + Push Notifications — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar os dois últimos itens da Fase 3A: toast com desfazer em todas as operações destrutivas, e notificações push nativas via True Web Push (VAPID) que funcionam mesmo com o browser fechado.

**Architecture:** Feature 1 é puramente frontend — estende `ToastContext`, cria dois hooks reutilizáveis, adiciona funções de delete nos services e integra nas páginas via padrão optimistic UI. Feature 2 adiciona um módulo `push-subscriptions` no backend (Node.js + `web-push`), integra no `notificationService.notify()` existente, cria um SW customizado via Vite PWA `injectManifest` e um `PushNotificationContext` no frontend.

**Tech Stack:** React, Vite PWA (`injectManifest`), Workbox, `web-push` (backend), Node.js/Express, MongoDB/Mongoose, Socket.IO (existente, inalterado)

**Spec:** `docs/superpowers/specs/2026-03-20-toast-undo-push-notifications-design.md`

---

## Repos

- Frontend: `/home/usuario/projeto-2026/crm-frontend`
- Backend: `/home/usuario/projeto-2026/crm-backend`

---

## PARTE 1 — Toast com Undo

---

### Task 1: Estender ToastContext com callback `onUndo`

**Files:**
- Modify: `src/contexts/ToastContext.jsx`

A assinatura atual de `undoable` é `(message, onConfirm, duration = 5000)`. O terceiro parâmetro vira `onUndo` e `duration` passa para o quarto, mantendo compatibilidade retroativa com todos os call sites existentes de 2 argumentos.

- [ ] **Step 1: Editar `ToastContext.jsx`**

Substituir as funções `undoable` e `handleUndo` pelo seguinte:

```jsx
const undoable = useCallback((message, onConfirm, onUndo, duration = 5000) => {
  const id = ++toastId;
  setToasts((prev) => [...prev, { id, message, type: 'undo', onConfirm, onUndo }]);
  timersRef.current[id] = setTimeout(() => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    delete timersRef.current[id];
    try { onConfirm(); } catch (_) { /* ignore */ }
  }, duration);
}, []);

const handleUndo = useCallback((id) => {
  clearTimeout(timersRef.current[id]);
  delete timersRef.current[id];
  setToasts((prev) => {
    const toast = prev.find((t) => t.id === id);
    if (toast?.onUndo) try { toast.onUndo(); } catch (_) { /* ignore */ }
    return prev.filter((t) => t.id !== id);
  });
}, []);
```

Certificar que `undoable` está exportado no objeto `value` (já estava).

- [ ] **Step 2: Verificar que MetaDetailsPage ainda funciona**

Abrir `src/pages/metas/MetaDetailsPage.jsx` e confirmar que a chamada `toast.undoable(message, callback)` com 2 argumentos continua funcionando (o `onUndo` será `undefined` — o código novo faz `if (toast?.onUndo)` antes de chamar).

- [ ] **Step 3: Commit**

```bash
cd /home/usuario/projeto-2026/crm-frontend
git add src/contexts/ToastContext.jsx
git commit -m "feat: extend undoable() with optional onUndo callback"
```

---

### Task 2: Criar hook `useUndoableDelete`

**Files:**
- Create: `src/hooks/useUndoableDelete.js`

Hook para remoção optimista de itens de listas planas com undo. Usa âncora (próximo sibling) para reinserção, evitando posição errada se outras deleções ocorrerem durante a janela de 5s.

- [ ] **Step 1: Criar o arquivo**

```js
// src/hooks/useUndoableDelete.js
import { useToast } from './useToast';

export function useUndoableDelete(setItems, deleteFn, message = 'Item removido.') {
  const toast = useToast();

  function removeWithUndo(id, items) {
    const deletedIdx = items.findIndex((i) => (i.id ?? i._id) === id);
    if (deletedIdx === -1) return;

    const deletedItem = items[deletedIdx];
    const nextSibling = items[deletedIdx + 1] ?? null;
    const nextSiblingId = nextSibling ? (nextSibling.id ?? nextSibling._id) : null;

    // Remove optimisticamente
    setItems((prev) => prev.filter((i) => (i.id ?? i._id) !== id));

    const onUndo = () =>
      setItems((prev) => {
        if (!nextSiblingId) return [...prev, deletedItem];
        const anchorIdx = prev.findIndex((i) => (i.id ?? i._id) === nextSiblingId);
        if (anchorIdx === -1) return [...prev, deletedItem];
        const copy = [...prev];
        copy.splice(anchorIdx, 0, deletedItem);
        return copy;
      });

    toast.undoable(message, () => deleteFn(id), onUndo);
  }

  return { removeWithUndo };
}
```

- [ ] **Step 2: Testar manualmente (após integração em uma página — ver Task 5)**

Verificar:
1. Clicar em deletar → item desaparece + toast amarelo aparece com "Desfazer"
2. Aguardar 5s sem clicar → API é chamada, item não retorna
3. Clicar deletar novamente → clicar "Desfazer" → item retorna na posição original

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useUndoableDelete.js
git commit -m "feat: add useUndoableDelete hook with anchor-based undo"
```

---

### Task 3: Criar hook `useUndoableAction`

**Files:**
- Create: `src/hooks/useUndoableAction.js`

Hook para mudanças de status optimistas com undo (ex: marcar atividade como concluída).

- [ ] **Step 1: Criar o arquivo**

```js
// src/hooks/useUndoableAction.js
import { useToast } from './useToast';

export function useUndoableAction(setItems, actionFn, message) {
  const toast = useToast();

  function executeWithUndo(item, applyFn) {
    const id = item.id ?? item._id;
    const original = item;

    // Aplica mudança optimisticamente
    setItems((prev) =>
      prev.map((i) => ((i.id ?? i._id) === id ? applyFn(i) : i))
    );

    const onUndo = () =>
      setItems((prev) =>
        prev.map((i) => ((i.id ?? i._id) === id ? original : i))
      );

    toast.undoable(message, () => actionFn(id), onUndo);
  }

  return { executeWithUndo };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useUndoableAction.js
git commit -m "feat: add useUndoableAction hook for optimistic status changes"
```

---

### Task 4: Adicionar funções de delete nos services do frontend

**Files:**
- Modify: `src/services/lead.service.js`
- Modify: `src/services/contact.service.js`
- Modify: `src/services/deal.service.js`
- Modify: `src/services/activity.service.js`

- [ ] **Step 1: Adicionar `deleteLead` em `lead.service.js`**

Adicionar ao final do arquivo:
```js
export async function deleteLead(id) {
  const response = await api.delete(`/leads/${id}`);
  return response.data;
}
```

- [ ] **Step 2: Adicionar `deleteContact` em `contact.service.js`**

Adicionar ao final do arquivo:
```js
export async function deleteContact(id) {
  const response = await api.delete(`/contacts/${id}`);
  return response.data;
}
```

- [ ] **Step 3: Adicionar `deleteDeal`, `closeDealWon` e `closeDealLost` em `deal.service.js`**

O backend expõe dois endpoints separados para fechar deals — **não** um endpoint genérico `/close`:
- `PATCH /deals/:id/close-won` (sem body)
- `PATCH /deals/:id/close-lost` (body opcional `{ reason }`)

Adicionar ao final do arquivo:
```js
export async function deleteDeal(id) {
  const response = await api.delete(`/deals/${id}`);
  return response.data;
}

export async function closeDealWon(id) {
  const response = await api.patch(`/deals/${id}/close-won`);
  return response.data;
}

export async function closeDealLost(id, reason = '') {
  const response = await api.patch(`/deals/${id}/close-lost`, reason ? { reason } : {});
  return response.data;
}
```

- [ ] **Step 4: Adicionar `deleteActivity` em `activity.service.js`**

Adicionar ao final do arquivo:
```js
export async function deleteActivity(id) {
  const response = await api.delete(`/activities/${id}`);
  return response.data;
}
```

- [ ] **Step 5: Commit**

```bash
git add src/services/lead.service.js src/services/contact.service.js \
        src/services/deal.service.js src/services/activity.service.js
git commit -m "feat: add delete functions to frontend services"
```

---

### Task 5: Integrar undo em LeadsPage

**Files:**
- Modify: `src/pages/leads/LeadsPage.jsx`

- [ ] **Step 1: Importar hook e service**

No topo do arquivo, adicionar:
```js
import { useUndoableDelete } from '../../hooks/useUndoableDelete';
import { deleteLead } from '../../services/lead.service';
```

- [ ] **Step 2: Instanciar o hook dentro do componente**

Após as declarações de state existentes, adicionar:
```js
const leads = response?.data || response?.items || response?.leads || [];
const { removeWithUndo } = useUndoableDelete(
  (updater) => setResponse((prev) => ({ ...prev, data: updater(leads) })),
  deleteLead,
  'Lead removido.'
);
```

- [ ] **Step 3: Adicionar botão de delete na listagem**

Localizar onde cada lead é renderizado e adicionar botão de delete. Seguindo o padrão visual do projeto (botão pequeno com ícone de lixeira):

```jsx
<button
  className="btn-icon btn-danger-ghost"
  title="Remover lead"
  onClick={() => removeWithUndo(lead.id ?? lead._id, leads)}
>
  🗑
</button>
```

> Use o estilo/classe de botão já existente no projeto. Se não houver `btn-danger-ghost`, use o mais próximo visualmente — botão com cor vermelha/cinza que não seja o estilo primário.

- [ ] **Step 4: Testar manualmente**

1. Navegar para `/leads`
2. Clicar no botão de delete de um lead → lead some + toast "Lead removido." aparece
3. Clicar "Desfazer" → lead volta na posição original
4. Deletar novamente e aguardar 5s → lead não volta (API foi chamada)
5. Recarregar página → lead não está mais listado

- [ ] **Step 5: Commit**

```bash
git add src/pages/leads/LeadsPage.jsx
git commit -m "feat: add delete with undo to LeadsPage"
```

---

### Task 6: Integrar undo em LeadDetailsPage

**Files:**
- Modify: `src/pages/leads/LeadDetailsPage.jsx`

- [ ] **Step 1: Importar hook e service**

```js
import { useUndoableDelete } from '../../hooks/useUndoableDelete';
import { deleteLead } from '../../services/lead.service';
```

- [ ] **Step 2: Implementar delete com undo e navegação**

Na página de detalhes não há lista — ao confirmar o delete, navega para `/leads`. Usar `undoable` diretamente do toast (sem o hook de lista):

```js
const toast = useToast();
const navigate = useNavigate(); // já deve existir

function handleDelete() {
  toast.undoable(
    'Lead removido.',
    () => deleteLead(lead.id ?? lead._id).then(() => navigate('/leads')),
    null // sem onUndo: usuário já saiu da página
  );
  navigate('/leads'); // navega imediatamente (optimistic)
}
```

- [ ] **Step 3: Adicionar botão de delete na página**

Localizar a área de ações (provavelmente no header da página de detalhes) e adicionar:
```jsx
<button className="btn btn-danger-ghost" onClick={handleDelete}>
  Remover Lead
</button>
```

- [ ] **Step 4: Testar manualmente**

1. Abrir detalhes de um lead
2. Clicar "Remover Lead" → navega para lista + toast aparece
3. Clicar "Desfazer" → toast fecha, mas permanece em `/leads` (comportamento aceitável para detail pages — o lead ainda existe no banco)
4. Aguardar 5s → lead é deletado da API; verificar que não aparece mais na lista

- [ ] **Step 5: Commit**

```bash
git add src/pages/leads/LeadDetailsPage.jsx
git commit -m "feat: add delete with undo to LeadDetailsPage"
```

---

### Task 7: Integrar undo em ContactsPage e ContactDetailsPage

**Files:**
- Modify: `src/pages/contacts/ContactsPage.jsx`
- Modify: `src/pages/contacts/ContactDetailsPage.jsx`

Padrão idêntico ao de Leads (Tasks 5 e 6).

- [ ] **Step 1: ContactsPage — importar e instanciar**

```js
import { useUndoableDelete } from '../../hooks/useUndoableDelete';
import { deleteContact } from '../../services/contact.service';
```

Instanciar `removeWithUndo` do mesmo modo que em LeadsPage, apontando para o array de contatos no state.

- [ ] **Step 2: ContactsPage — adicionar botão de delete em cada row**

```jsx
<button
  className="btn-icon btn-danger-ghost"
  title="Remover contato"
  onClick={() => removeWithUndo(contact.id ?? contact._id, contacts)}
>
  🗑
</button>
```

- [ ] **Step 3: ContactDetailsPage — delete com navegação**

```js
import { deleteContact } from '../../services/contact.service';

function handleDelete() {
  toast.undoable(
    'Contato removido.',
    () => deleteContact(contact.id ?? contact._id).then(() => navigate('/contacts')),
    null
  );
  navigate('/contacts');
}
```

Adicionar botão "Remover Contato" na página.

- [ ] **Step 4: Testar manualmente**

Repetir os mesmos 4 cenários dos testes de LeadsPage para contatos.

- [ ] **Step 5: Commit**

```bash
git add src/pages/contacts/ContactsPage.jsx src/pages/contacts/ContactDetailsPage.jsx
git commit -m "feat: add delete with undo to Contacts pages"
```

---

### Task 8: Integrar undo em ActivitiesPage

**Files:**
- Modify: `src/pages/activities/ActivitiesPage.jsx`

Duas operações: delete (nova) e concluir (existente, envolver com undo).

- [ ] **Step 1: Importar hooks e services**

```js
import { useUndoableDelete } from '../../hooks/useUndoableDelete';
import { useUndoableAction } from '../../hooks/useUndoableAction';
import { deleteActivity } from '../../services/activity.service';
import { completeActivity } from '../../services/activity.service'; // já importado
import { useToast } from '../../hooks/useToast';
```

- [ ] **Step 2: Extrair array de atividades para state independente**

`ActivitiesPage` armazena `response` (objeto paginado) e deriva `activities` via `useMemo`. Os hooks precisam de um setter de array plano. Solução: extrair para state dedicado sincronizado:

```js
const [activityItems, setActivityItems] = useState([]);

// Substituir o useMemo existente de activities por um useEffect que popula activityItems:
useEffect(() => {
  const data = response?.data || response?.items || response?.activities || [];
  const now = new Date();
  setActivityItems(
    data.map((a) => ({ ...a, isOverdue: a.dueDate ? new Date(a.dueDate) < now : false }))
  );
}, [response]);

// Remover o useMemo de activities — substituído por activityItems acima.
// filteredActivities continua operando sobre activityItems.
```

Agora instanciar os hooks:

```js
const { removeWithUndo } = useUndoableDelete(
  setActivityItems,
  deleteActivity,
  'Atividade removida.'
);

const { executeWithUndo } = useUndoableAction(
  setActivityItems,
  completeActivity,
  'Atividade marcada como concluída.'
);
```

- [ ] **Step 3: Substituir `handleComplete` existente**

O `handleComplete` atual chama `completeActivity` diretamente e recarrega. Substituir por:

```js
function handleComplete(activity) {
  executeWithUndo(
    activity,
    (a) => ({ ...a, status: 'completed', completedAt: new Date().toISOString() })
  );
}
```

- [ ] **Step 4: Adicionar botão de delete em cada atividade**

```jsx
<button
  className="btn-icon btn-danger-ghost"
  title="Remover atividade"
  onClick={() => removeWithUndo(activity.id ?? activity._id, activityItems)}
>
  🗑
</button>
```

- [ ] **Step 5: Testar manualmente**

1. Marcar atividade como concluída → item muda de estado + toast "Desfazer"
2. Clicar "Desfazer" → atividade volta ao estado pendente
3. Deletar atividade → item some + toast
4. Clicar "Desfazer" → atividade volta

- [ ] **Step 6: Commit**

```bash
git add src/pages/activities/ActivitiesPage.jsx
git commit -m "feat: add delete and complete-with-undo to ActivitiesPage"
```

---

### Task 9: Integrar undo em MetasPage

**Files:**
- Modify: `src/pages/metas/MetasPage.jsx`

`MetaDetailsPage` já tem undo implementado. Apenas `MetasPage` (listagem) precisa de delete.

- [ ] **Step 1: Importar hook e service**

```js
import { useUndoableDelete } from '../../hooks/useUndoableDelete';
import { deleteGoal } from '../../services/goal.service'; // verificar nome exato da função
```

- [ ] **Step 2: Instanciar hook e adicionar botão**

```js
const goals = response?.data || response?.items || [];
const { removeWithUndo } = useUndoableDelete(
  (updater) => setResponse((prev) => ({ ...prev, data: updater(goals) })),
  deleteGoal,
  'Meta removida.'
);
```

```jsx
<button
  className="btn-icon btn-danger-ghost"
  title="Remover meta"
  onClick={() => removeWithUndo(goal.id ?? goal._id, goals)}
>
  🗑
</button>
```

- [ ] **Step 3: Testar manualmente**

Mesmo padrão dos outros (delete → toast → undo → retorna; delete → aguarda → não retorna).

- [ ] **Step 4: Commit**

```bash
git add src/pages/metas/MetasPage.jsx
git commit -m "feat: add delete with undo to MetasPage"
```

---

### Task 10: Integrar undo em DealsPage e DealDetailsModal (bespoke Kanban)

**Files:**
- Modify: `src/pages/deals/DealsPage.jsx`
- Modify: `src/components/deals/DealDetailsModal.jsx`

O state de deals é um objeto Kanban `{ [stage]: Deal[] }` — os hooks genéricos não funcionam. Usar `toast.undoable` diretamente com rollback manual do Kanban.

- [ ] **Step 1: Ler DealsPage para entender o state atual**

```bash
head -100 /home/usuario/projeto-2026/crm-frontend/src/pages/deals/DealsPage.jsx
```

Identificar: nome do state Kanban (provavelmente `kanban` / `setKanban`), e como won/lost é tratado atualmente.

- [ ] **Step 2: Importar services**

```js
import { deleteDeal, closeDealWon, closeDealLost } from '../../services/deal.service';
import { useToast } from '../../hooks/useToast';
```

> O backend tem dois endpoints separados: `PATCH /deals/:id/close-won` e `PATCH /deals/:id/close-lost`. Não existe `/close` genérico.

- [ ] **Step 3: Implementar `handleDeleteDeal` com undo Kanban**

```js
const toast = useToast();

function handleDeleteDeal(deal) {
  const dealId = deal.id ?? deal._id;
  const stage = deal.stage;

  setKanban((prev) => ({
    ...prev,
    [stage]: prev[stage].filter((d) => (d.id ?? d._id) !== dealId)
  }));

  const onUndo = () =>
    setKanban((prev) => ({
      ...prev,
      [stage]: [...(prev[stage] || []), deal]
    }));

  toast.undoable('Negócio removido.', () => deleteDeal(dealId), onUndo);
}
```

- [ ] **Step 4: Implementar `handleCloseDealWon` e `handleCloseDealLost` com undo Kanban**

```js
function handleCloseDealWon(deal) {
  const dealId = deal.id ?? deal._id;
  const originalStage = deal.stage;

  setKanban((prev) => {
    const without = { ...prev, [originalStage]: prev[originalStage].filter((d) => (d.id ?? d._id) !== dealId) };
    return { ...without, won: [...(without.won || []), { ...deal, stage: 'won' }] };
  });

  const onUndo = () =>
    setKanban((prev) => {
      const without = { ...prev, won: prev.won.filter((d) => (d.id ?? d._id) !== dealId) };
      return { ...without, [originalStage]: [...(without[originalStage] || []), deal] };
    });

  toast.undoable('Negócio marcado como ganho.', () => closeDealWon(dealId), onUndo);
}

function handleCloseDealLost(deal, reason = '') {
  const dealId = deal.id ?? deal._id;
  const originalStage = deal.stage;

  setKanban((prev) => {
    const without = { ...prev, [originalStage]: prev[originalStage].filter((d) => (d.id ?? d._id) !== dealId) };
    return { ...without, lost: [...(without.lost || []), { ...deal, stage: 'lost' }] };
  });

  const onUndo = () =>
    setKanban((prev) => {
      const without = { ...prev, lost: prev.lost.filter((d) => (d.id ?? d._id) !== dealId) };
      return { ...without, [originalStage]: [...(without[originalStage] || []), deal] };
    });

  toast.undoable('Negócio marcado como perdido.', () => closeDealLost(dealId, reason), onUndo);
}
```

- [ ] **Step 5: Adicionar botões de delete, won e lost nos cards Kanban**

Localizar o JSX dos cards e adicionar ações. O padrão usual é um menu de ações no hover do card ou botões de ação no `DealDetailsModal`.

- [ ] **Step 6: Espelhar as mesmas funções em DealDetailsModal**

`DealDetailsModal` recebe `deal` e provavelmente `onClose`/`onRefresh` como props. Passar `handleDeleteDeal`, `handleCloseDealWon` e `handleCloseDealLost` como props para o modal, ou re-implementar localmente com `onRefresh`.

- [ ] **Step 7: Testar manualmente**

1. Arrastar card para won → aparece em "Ganho" + toast "Desfazer"
2. Clicar "Desfazer" → card volta ao stage original
3. Deletar deal → desaparece do Kanban + toast
4. Clicar "Desfazer" → deal volta

- [ ] **Step 8: Commit**

```bash
git add src/pages/deals/DealsPage.jsx src/components/deals/DealDetailsModal.jsx
git commit -m "feat: add delete and close (won/lost) with undo to Deals Kanban"
```

---

## PARTE 2 — Notificações Push via PWA (True Web Push)

---

### Task 11: Backend — instalar web-push e criar módulo push-subscriptions

**Files (backend):**
- Create: `src/modules/push-subscriptions/push-subscription.model.js`
- Create: `src/modules/push-subscriptions/push-subscription.repository.js`
- Create: `src/modules/push-subscriptions/push-subscription.service.js`
- Create: `src/modules/push-subscriptions/push-subscription.controller.js`
- Create: `src/modules/push-subscriptions/push-subscription.routes.js`
- Modify: `.env`

- [ ] **Step 1: Instalar web-push**

```bash
cd /home/usuario/projeto-2026/crm-backend
npm install web-push
```

- [ ] **Step 2: Gerar chaves VAPID e salvar em `.env`**

```bash
node -e "const wp=require('web-push'); console.log(wp.generateVAPIDKeys())"
```

Adicionar ao `.env`:
```env
VAPID_PUBLIC_KEY=<chave_publica_gerada>
VAPID_PRIVATE_KEY=<chave_privada_gerada>
VAPID_SUBJECT=mailto:admin@crm.com
```

> As chaves são geradas uma única vez. Não regenerar em deploys — as subscriptions existentes se tornariam inválidas.

- [ ] **Step 3: Criar `push-subscription.model.js`**

```js
// src/modules/push-subscriptions/push-subscription.model.js
const mongoose = require('mongoose');

const pushSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    endpoint: {
      type: String,
      required: true,
      trim: true
    },
    keys: {
      p256dh: { type: String, required: true },
      auth: { type: String, required: true }
    },
    userAgent: { type: String, default: '' }
  },
  { timestamps: true }
);

pushSubscriptionSchema.index({ userId: 1, endpoint: 1 }, { unique: true });

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
```

- [ ] **Step 4: Criar `push-subscription.repository.js`**

```js
// src/modules/push-subscriptions/push-subscription.repository.js
const PushSubscription = require('./push-subscription.model');

async function upsert(userId, endpoint, keys, userAgent) {
  return PushSubscription.findOneAndUpdate(
    { userId, endpoint },
    { userId, endpoint, keys, userAgent },
    { upsert: true, new: true }
  );
}

async function findByUserId(userId) {
  return PushSubscription.find({ userId });
}

async function removeByEndpoint(userId, endpoint) {
  return PushSubscription.deleteOne({ userId, endpoint });
}

async function removeByEndpointOnly(endpoint) {
  return PushSubscription.deleteMany({ endpoint });
}

module.exports = { upsert, findByUserId, removeByEndpoint, removeByEndpointOnly };
```

- [ ] **Step 5: Criar `push-subscription.service.js`**

```js
// src/modules/push-subscriptions/push-subscription.service.js
const webPush = require('web-push');
const repository = require('./push-subscription.repository');

webPush.setVapidDetails(
  process.env.VAPID_SUBJECT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function subscribe(userId, { endpoint, keys, userAgent }) {
  return repository.upsert(userId, endpoint, keys, userAgent || '');
}

async function unsubscribe(userId, endpoint) {
  return repository.removeByEndpoint(userId, endpoint);
}

async function send(userId, title, body, data = {}) {
  const subscriptions = await repository.findByUserId(userId);
  if (!subscriptions.length) return;

  const payload = JSON.stringify({ title, body, data });

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          { endpoint: sub.endpoint, keys: sub.keys },
          payload
        );
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expirada — remover silenciosamente
          await repository.removeByEndpointOnly(sub.endpoint);
        } else {
          console.error(`Push send error (${sub.endpoint}):`, err.message);
        }
      }
    })
  );
}

function getPublicKey() {
  return process.env.VAPID_PUBLIC_KEY;
}

module.exports = { subscribe, unsubscribe, send, getPublicKey };
```

- [ ] **Step 6: Criar `push-subscription.controller.js`**

```js
// src/modules/push-subscriptions/push-subscription.controller.js
const pushService = require('./push-subscription.service');

async function getVapidPublicKey(req, res, next) {
  try {
    return res.status(200).json({ publicKey: pushService.getPublicKey() });
  } catch (err) {
    next(err);
  }
}

async function subscribe(req, res, next) {
  try {
    const { endpoint, keys, userAgent } = req.body;
    await pushService.subscribe(req.user.id, { endpoint, keys, userAgent });
    return res.status(200).json({ message: 'Subscription registrada.' });
  } catch (err) {
    next(err);
  }
}

async function unsubscribe(req, res, next) {
  try {
    const { endpoint } = req.body;
    await pushService.unsubscribe(req.user.id, endpoint);
    return res.status(200).json({ message: 'Subscription removida.' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getVapidPublicKey, subscribe, unsubscribe };
```

- [ ] **Step 7: Criar `push-subscription.routes.js`**

```js
// src/modules/push-subscriptions/push-subscription.routes.js
const express = require('express');
const controller = require('./push-subscription.controller');
const authMiddleware = require('../../shared/middlewares/auth.middleware');

const router = express.Router();

// Sem auth — necessário antes do login para verificar suporte
router.get('/vapid-public-key', controller.getVapidPublicKey);

router.post('/subscribe', authMiddleware, controller.subscribe);
router.delete('/subscribe', authMiddleware, controller.unsubscribe);

module.exports = router;
```

- [ ] **Step 8: Commit (backend)**

```bash
cd /home/usuario/projeto-2026/crm-backend
git add src/modules/push-subscriptions/ .env
git commit -m "feat: add push-subscriptions module with VAPID web-push"
```

---

### Task 12: Backend — integrar push em notification service e registrar rotas

**Files (backend):**
- Modify: `src/modules/notifications/notification.service.js`
- Modify: `src/app.js`

- [ ] **Step 1: Adicionar `pushService.send()` em `notification.service.js`**

No início do arquivo, adicionar:
```js
const pushService = require('../push-subscriptions/push-subscription.service');
```

Na função `notify()`, após o bloco `try/catch` do Socket.IO emit existente, adicionar (fire-and-forget):
```js
// Push notification (True Web Push — funciona com browser fechado)
pushService.send(userId.toString(), notification.title, notification.message, {
  entityType: data.entityType || null,
  entityId: data.entityId ? data.entityId.toString() : null
}).catch((err) => console.error('Push send error:', err.message));
```

- [ ] **Step 2: Registrar rotas em `app.js`**

Adicionar no bloco de imports:
```js
const pushRoutes = require('./modules/push-subscriptions/push-subscription.routes');
```

Adicionar no bloco de routes (após `notificationRoutes`):
```js
app.use('/api/push', pushRoutes);
```

- [ ] **Step 3: Testar backend manualmente**

```bash
cd /home/usuario/projeto-2026/crm-backend
npm run dev
# Em outro terminal:
curl http://localhost:3000/api/push/vapid-public-key
# Deve retornar: {"publicKey":"..."}
```

- [ ] **Step 4: Commit (backend)**

```bash
git add src/modules/notifications/notification.service.js src/app.js
git commit -m "feat: integrate push notifications into notification service and register routes"
```

---

### Task 13: Frontend — criar SW customizado e migrar vite.config.js

**Files (frontend):**
- Create: `src/sw.js`
- Modify: `vite.config.js`

- [ ] **Step 1: Criar `src/sw.js`**

```js
// src/sw.js
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache gerado automaticamente pelo Vite PWA
precacheAndRoute(self.__WB_MANIFEST);

// Runtime caching — portado do bloco workbox: do vite.config.js anterior
registerRoute(
  ({ url }) => /^https?:\/\/.*\/api\/.*/i.test(url.href),
  new NetworkFirst({
    cacheName: 'api-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 5 })]
  })
);

registerRoute(
  ({ url }) => /^https:\/\/fonts\.googleapis\.com\/.*/i.test(url.href),
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [
      new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })
    ]
  })
);

// Push handler — recebe push do servidor e exibe notificação nativa
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'CRM', {
      body: data.body ?? '',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: data.data ?? {}
    })
  );
});

// Notification click — foca/abre a aba do CRM na URL da entidade
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { entityType, entityId } = event.notification.data ?? {};
  const urlMap = {
    deal: 'deals',
    lead: 'leads',
    contact: 'contacts',
    activity: 'activities',
    conversation: 'whatsapp'
  };
  const path =
    entityType && entityId
      ? `/${urlMap[entityType] ?? entityType}/${entityId}`
      : '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((list) => {
        if (list.length > 0) {
          list[0].navigate(path);
          return list[0].focus();
        }
        return clients.openWindow(path);
      })
  );
});
```

- [ ] **Step 2: Migrar `vite.config.js` para `injectManifest`**

Substituir o objeto `VitePWA({...})` atual pelo seguinte (manter o resto do config intacto):

```js
VitePWA({
  strategies: 'injectManifest',
  srcDir: 'src',
  filename: 'sw.js',
  registerType: 'autoUpdate',
  manifest: {
    name: 'CRM Pro',
    short_name: 'CRM',
    description: 'CRM para gestão de leads, contatos e negócios',
    theme_color: '#1a1d21',
    background_color: '#1a1d21',
    display: 'standalone',
    start_url: '/',
    icons: [
      { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ]
  }
  // bloco workbox: removido — regras portadas para src/sw.js
})
```

> O bloco `workbox: { globPatterns, runtimeCaching }` é **removido** do `vite.config.js` pois é ignorado com `injectManifest`. As mesmas regras já estão em `src/sw.js`.

- [ ] **Step 3: Verificar build**

```bash
cd /home/usuario/projeto-2026/crm-frontend
npm run build
# Verificar que dist/sw.js existe e contém "push" e "workbox"
grep -l "push" dist/sw.js && echo "OK"
```

- [ ] **Step 4: Commit**

```bash
git add src/sw.js vite.config.js
git commit -m "feat: add custom service worker with push handler and migrate vite.config to injectManifest"
```

---

### Task 14: Frontend — criar PushNotificationContext e push.service.js

**Files (frontend):**
- Create: `src/services/push.service.js`
- Create: `src/contexts/PushNotificationContext.jsx`

- [ ] **Step 1: Criar `src/services/push.service.js`**

```js
// src/services/push.service.js
import api from './api';

export function getVapidPublicKey() {
  return api.get('/push/vapid-public-key');
}

export function subscribe(data) {
  return api.post('/push/subscribe', data);
}

export function unsubscribe(endpoint) {
  return api.delete('/push/subscribe', { data: { endpoint } });
}
```

- [ ] **Step 2: Criar `src/contexts/PushNotificationContext.jsx`**

```jsx
// src/contexts/PushNotificationContext.jsx
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getVapidPublicKey, subscribe, unsubscribe } from '../services/push.service';
import { useToast } from '../hooks/useToast';

const PushNotificationContext = createContext(null);

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushNotificationProvider({ children }) {
  const toast = useToast();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState(null);

  const isVapidSupported =
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window;

  // Buscar chave pública uma vez
  useEffect(() => {
    if (!isVapidSupported) return;
    getVapidPublicKey()
      .then((res) => setVapidPublicKey(res.data.publicKey))
      .catch(() => {}); // silencioso — não bloqueia o app
  }, [isVapidSupported]);

  // Auto-subscribe quando push estiver habilitado no localStorage
  useEffect(() => {
    if (!isVapidSupported || !vapidPublicKey) return;
    const enabled = localStorage.getItem('crm_push_enabled') === 'true';
    const granted = Notification.permission === 'granted';
    if (enabled && granted) {
      subscribeToPush().catch(() => {});
    }
  }, [vapidPublicKey]);

  const subscribeToPush = useCallback(async () => {
    if (!isVapidSupported || !vapidPublicKey) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
      const { endpoint, keys } = sub.toJSON();
      await subscribe({ endpoint, keys, userAgent: navigator.userAgent });
      setIsSubscribed(true);
    } catch (err) {
      console.error('Push subscribe error:', err);
      toast.error('Não foi possível ativar notificações push nativas.');
    }
  }, [isVapidSupported, vapidPublicKey, toast]);

  const unsubscribeFromPush = useCallback(async () => {
    if (!isVapidSupported) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe(); // browser-side primeiro
        await unsubscribe(sub.endpoint); // então backend
      }
      setIsSubscribed(false);
    } catch (err) {
      console.error('Push unsubscribe error:', err);
    }
  }, [isVapidSupported]);

  return (
    <PushNotificationContext.Provider
      value={{ isVapidSupported, isSubscribed, subscribeToPush, unsubscribeFromPush }}
    >
      {children}
    </PushNotificationContext.Provider>
  );
}

export function usePushNotification() {
  return useContext(PushNotificationContext);
}
```

- [ ] **Step 3: Commit**

```bash
git add src/services/push.service.js src/contexts/PushNotificationContext.jsx
git commit -m "feat: add PushNotificationContext and push service"
```

---

### Task 15: Frontend — registrar provider e atualizar SettingsPage

**Files (frontend):**
- Modify: `src/main.jsx`
- Modify: `src/pages/settings/SettingsPage.jsx`

- [ ] **Step 1: Adicionar `PushNotificationProvider` em `main.jsx`**

Adicionar o import:
```js
import { PushNotificationProvider } from './contexts/PushNotificationContext';
```

Envolver `<App />` com o provider dentro de `<ToastProvider>`:

```jsx
<ToastProvider>
  <PushNotificationProvider>
    <App />
  </PushNotificationProvider>
</ToastProvider>
```

A árvore completa ficará:
```jsx
<React.StrictMode>
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <ToastProvider>
            <PushNotificationProvider>
              <App />
            </PushNotificationProvider>
          </ToastProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
</React.StrictMode>
```

- [ ] **Step 2: Adicionar UI de push nativo na aba Preferências de SettingsPage**

Localizar a `PreferencesPanel` ou aba de Preferências e adicionar após o toggle de push existente:

```jsx
import { usePushNotification } from '../../contexts/PushNotificationContext';

// dentro do componente:
const { isVapidSupported, isSubscribed, subscribeToPush } = usePushNotification();

// JSX:
{isVapidSupported && (
  <div className="settings-row">
    <div>
      <span className="settings-label">Push nativo (background)</span>
      <span className="settings-description">
        Receba notificações mesmo com o CRM fechado
      </span>
    </div>
    {isSubscribed ? (
      <span className="badge badge-success">Ativo</span>
    ) : (
      <button className="btn btn-secondary btn-sm" onClick={subscribeToPush}>
        Ativar push nativo
      </button>
    )}
  </div>
)}
```

> Use as classes CSS já existentes no projeto. `badge-success` ou equivalente verde.

- [ ] **Step 3: Testar manualmente**

1. Abrir Settings → aba Preferências → ativar toggle de notificações
2. Se ainda não deu permissão → browser pede permissão → aceitar
3. Clicar "Ativar push nativo" → badge "Ativo" aparece
4. Verificar no backend:
```bash
# No MongoDB, verificar que a subscription foi salva:
# db.pushsubscriptions.find({ userId: ObjectId('...') })
```
5. Simular push (via curl ou Postman): criar uma notificação que dispare `notificationService.notify()`
6. Minimizar o browser → verificar notificação nativa do OS

- [ ] **Step 4: Commit**

```bash
git add src/main.jsx src/pages/settings/SettingsPage.jsx
git commit -m "feat: register PushNotificationProvider and add push native UI to Settings"
```

---

### Task 16: Atualizar ROADMAP.md

**Files:**
- Modify: `ROADMAP.md`

- [ ] **Step 1: Marcar os dois itens como concluídos**

Localizar e substituir:
```markdown
- [ ] Toast com opção "desfazer" (undo)
- [ ] Notificações push via PWA
```
por:
```markdown
- [x] Toast com opção "desfazer" (undo)
- [x] Notificações push via PWA
```

- [ ] **Step 2: Commit final**

```bash
git add ROADMAP.md
git commit -m "docs: mark Phase 3A as complete — toast undo and PWA push notifications done"
```
