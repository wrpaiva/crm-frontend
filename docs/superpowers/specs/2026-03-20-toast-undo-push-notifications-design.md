# Design: Toast com Undo + Notificações Push via PWA

**Data:** 2026-03-20
**Branch:** feature/ia-copiloto-comercial
**Escopo:** Fase 3A — últimos dois itens pendentes do roadmap

---

## Feature 1: Toast com Undo (Optimistic UI)

### Contexto

O `ToastContext` já possui toda a lógica de undo: `undoable()`, `handleUndo()`, CSS das classes `toast-undo` e `toast-undo-btn`. O `MetaDetailsPage.handleDelete()` já usa `toast.undoable()` corretamente — está pronto e não requer alteração.

O trabalho restante é:
1. Adicionar funções de delete nos services do frontend (que hoje não as têm)
2. Adicionar botões/handlers de delete nas páginas que ainda não os têm
3. Criar hooks reutilizáveis para o padrão optimistic + undo
4. Integrar nas mudanças de status (concluir atividade, won/lost em deals)

### Fluxo

1. Usuário aciona delete ou mudança de status
2. O item some da UI / muda de estado **imediatamente** (otimisticamente)
3. Toast amarelo aparece com mensagem + botão "Desfazer" + timer de 5s
4. Se timer expirar → chamada à API é executada
5. Se "Desfazer" clicado → item é reinserido na posição original / status revertido no state local; API nunca é chamada

### Alteração necessária em `ToastContext`

O `undoable(message, onConfirm)` atual expõe apenas o callback de confirmação (executado quando o timer expira). Os hooks precisam de um callback de **cancelamento** (executado quando "Desfazer" é clicado) para reinserir o item no state.

**Solução:** estender a assinatura para `undoable(message, onConfirm, onUndo?, duration = 5000)`.

> A assinatura atual é `(message, onConfirm, duration = 5000)`. O terceiro parâmetro `duration` é deslocado para quarto. Todos os call sites existentes (2 argumentos) continuam funcionando. `duration` agora é parâmetro com default, não variável de closure — sem `ReferenceError`.

```js
// ToastContext.jsx — alteração em undoable()
const undoable = useCallback((message, onConfirm, onUndo, duration = 5000) => {
  const id = ++toastId;
  setToasts((prev) => [...prev, { id, message, type: 'undo', onConfirm, onUndo }]);
  timersRef.current[id] = setTimeout(() => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    delete timersRef.current[id];
    try { onConfirm(); } catch (_) {}
  }, duration);
}, []);

// handleUndo — chamar onUndo se fornecido
const handleUndo = useCallback((id) => {
  clearTimeout(timersRef.current[id]);
  delete timersRef.current[id];
  setToasts((prev) => {
    const toast = prev.find((t) => t.id === id);
    if (toast?.onUndo) try { toast.onUndo(); } catch (_) {}
    return prev.filter((t) => t.id !== id);
  });
}, []);
```

### Hooks

#### `useUndoableDelete` — para remoção de itens de listas planas

```js
// src/hooks/useUndoableDelete.js
function useUndoableDelete(setItems, deleteFn, message = 'Item removido.')
// Retorna: { removeWithUndo(id, items) }
//   items: lista atual (para capturar índice e valor antes de remover)
```

**Lógica interna:**
```js
function removeWithUndo(id, items) {
  const deletedIdx = items.findIndex(i => (i.id ?? i._id) === id);
  const deletedItem = items[deletedIdx];
  // Captura o item que vem após o deletado (âncora para reinserção)
  // Usar âncora em vez de índice numérico evita posição errada se
  // outra deleção ocorrer durante os 5s do timer.
  const nextSibling = items[deletedIdx + 1] ?? null;
  const nextSiblingId = nextSibling ? (nextSibling.id ?? nextSibling._id) : null;

  setItems(prev => prev.filter(i => (i.id ?? i._id) !== id));

  const onUndo = () => setItems(prev => {
    if (!nextSiblingId) return [...prev, deletedItem]; // era o último
    const anchorIdx = prev.findIndex(i => (i.id ?? i._id) === nextSiblingId);
    if (anchorIdx === -1) return [...prev, deletedItem]; // âncora também foi deletada
    const copy = [...prev];
    copy.splice(anchorIdx, 0, deletedItem);
    return copy;
  });

  undoable(message, () => deleteFn(id), onUndo);
}
```

#### `useUndoableAction` — para mudanças de status em listas planas

```js
// src/hooks/useUndoableAction.js
function useUndoableAction(setItems, actionFn, message)
// Retorna: { executeWithUndo(item, applyFn) }
//   applyFn: função que transforma o item no novo estado para aplicar otimisticamente
```

**Lógica interna:**
```js
function executeWithUndo(item, applyFn) {
  const original = item;
  // Aplica mudança otimisticamente
  setItems(prev => prev.map(i => (i.id ?? i._id) === (item.id ?? item._id) ? applyFn(i) : i));
  // onUndo: reverte para o estado original
  const onUndo = () => setItems(prev => prev.map(i => (i.id ?? i._id) === (item.id ?? item._id) ? original : i));
  undoable(message, () => actionFn(item.id ?? item._id), onUndo);
}
```

> **Deals (Kanban):** O state de deals é um objeto com chaves por stage `{ lead: [], contacted: [], ..., won: [], lost: [] }`, não uma lista plana. As ações de won/lost no `DealsPage` e `DealDetailsModal` usam implementação **bespoke** (não os hooks genéricos), operando diretamente sobre o objeto Kanban com `setKanban`. O rollback restaura o card na coluna de stage original usando `undoable(message, onConfirm, onUndo)` diretamente.

> **Deals (Kanban):** O state de deals é um objeto com chaves por stage `{ lead: [], contacted: [], ..., won: [], lost: [] }`, não uma lista plana. As ações de won/lost no `DealsPage` e `DealDetailsModal` usam implementação **bespoke** (não o hook genérico), operando diretamente sobre o objeto Kanban com `setKanban`. O rollback restaura o card na coluna de stage original.

### Serviços a criar/complementar no frontend

Os services do frontend hoje não possuem funções de delete. Devem ser adicionadas:

| Service | Função a adicionar |
|---------|-------------------|
| `src/services/lead.service.js` | `deleteLead(id)` → `DELETE /leads/:id` |
| `src/services/contact.service.js` | `deleteContact(id)` → `DELETE /contacts/:id` |
| `src/services/deal.service.js` | `deleteDeal(id)` → `DELETE /deals/:id`; `closeDeal(id, outcome)` → `PATCH /deals/:id/close` |
| `src/services/activity.service.js` | `deleteActivity(id)` → `DELETE /activities/:id` |

> `src/services/goal.service.js` já possui delete. `MetaDetailsPage` já usa `undoable()`.

### Operações e páginas

| Página | O que fazer | Undo |
|--------|------------|------|
| `LeadsPage` | Adicionar botão delete + `removeWithUndo` via hook | delete lead |
| `LeadDetailsPage` | Adicionar botão delete + `removeWithUndo` (navega após confirm) | delete lead |
| `ContactsPage` | Adicionar botão delete + `removeWithUndo` | delete contato |
| `ContactDetailsPage` | Adicionar botão delete + `removeWithUndo` | delete contato |
| `DealsPage` | Adicionar delete + won/lost com rollback Kanban bespoke | delete, won, lost |
| `DealDetailsModal` | Adicionar delete + won/lost com rollback Kanban | delete, won, lost |
| `ActivitiesPage` | Adicionar delete + wrapping do `completeActivity` existente | delete, concluir |
| `MetasPage` | Adicionar botão delete + `removeWithUndo` | delete meta |
| `MetaDetailsPage` | **Já implementado** — verificar e manter | — |

### Arquivos a criar/alterar (frontend)

- `src/hooks/useUndoableDelete.js` — novo
- `src/hooks/useUndoableAction.js` — novo
- `src/services/lead.service.js` — adicionar `deleteLead`
- `src/services/contact.service.js` — adicionar `deleteContact`
- `src/services/deal.service.js` — adicionar `deleteDeal`, `closeDeal`
- `src/services/activity.service.js` — adicionar `deleteActivity`
- `src/pages/leads/LeadsPage.jsx`
- `src/pages/leads/LeadDetailsPage.jsx`
- `src/pages/contacts/ContactsPage.jsx`
- `src/pages/contacts/ContactDetailsPage.jsx`
- `src/pages/deals/DealsPage.jsx`
- `src/components/deals/DealDetailsModal.jsx`
- `src/pages/activities/ActivitiesPage.jsx`
- `src/pages/metas/MetasPage.jsx`

---

## Feature 2: Notificações Push via PWA (True Web Push com VAPID)

### Contexto e reconciliação com infraestrutura existente

O projeto já possui:
- `src/utils/push-notifications.js` — utilitários: `isPushSupported()`, `requestPermission()`, `getPermissionStatus()`, `showNotification()`
- `src/contexts/SocketContext.jsx` — já chama `showNotification()` quando `notification:new` chega e o tab está oculto, controlado por `localStorage.getItem('crm_push_enabled')`
- `SettingsPage` (aba Preferências) — já tem toggle de push backed por `localStorage`

Essa infraestrutura existente é **in-browser SW push** (funciona só com browser aberto). O objetivo desta feature é adicionar **True Web Push via VAPID** (funciona com browser fechado).

**Estratégia de coexistência:**
- O toggle existente em Settings e a lógica do `SocketContext` são mantidos como estão (push em foreground via Socket.IO)
- O `PushNotificationContext` novo gerencia exclusivamente a subscription VAPID (push em background/browser fechado)
- A verificação de suporte usa `isPushSupported()` existente + checagem adicional de `'PushManager' in window`
- Ao usuário ativar notificações (já existente), também registra a subscription VAPID no backend

### Arquitetura

```
Browser                        Backend                    MongoDB
───────                        ───────                    ───────
PushNotificationContext
  ↓ PushManager.subscribe(vapidPublicKey)
  ↓ POST /api/push/subscribe ──────────────────────────→ push_subscriptions

(evento ocorre no sistema)
                               notificationService.notify()
                                 ↓ salva Notification ──→ notifications
                                 ↓ Socket.IO emit (existente, inalterado)
                                 ↓ pushService.send(userId)
                                   ↓ busca subscriptions do userId
                                   ↓ web-push.sendNotification()
SW recebe evento 'push' ←──────────────────────────────────────────
  ↓ self.registration.showNotification()
OS exibe notificação nativa (mesmo com browser fechado)
```

### Backend — novo módulo `push-subscriptions`

**Instalação:** `npm install web-push`
> O backend usa `"type": "commonjs"` (confirmado no `package.json`), portanto `require('web-push')` funciona normalmente.

**Geração de chaves VAPID (uma única vez, salvar em `.env`):**
```bash
node -e "const wp=require('web-push'); console.log(wp.generateVAPIDKeys())"
```
```env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@crm.com
```

**Model `PushSubscription` (`push-subscription.model.js`):**
```js
{
  userId: ObjectId (ref: User, required),
  endpoint: String (required, trim),
  keys: {
    p256dh: String (required),
    auth: String (required)
  },
  userAgent: String,
  timestamps: true
}
// Index: { userId: 1, endpoint: 1 } unique
```

**Rotas (`/api/push`):**
- `GET /vapid-public-key` — retorna `{ publicKey: VAPID_PUBLIC_KEY }` (sem authMiddleware — necessário antes do login)
- `POST /subscribe` — (authMiddleware) upsert subscription pelo endpoint; body: `{ endpoint, keys: { p256dh, auth }, userAgent }`
- `DELETE /subscribe` — (authMiddleware) chama `pushSubscription.unsubscribe()` no browser **antes** desta chamada; body: `{ endpoint }`

**`pushService.send(userId, title, body, data)`:**
- Busca todas subscriptions do userId
- Para cada subscription, chama `webPush.sendNotification(subscription, JSON.stringify({ title, body, data }))`
- Erros 410/404 (subscription expirada): remove do banco automaticamente (não relança erro)
- Demais erros: loga mas não interrompe o `notify()` principal

**Integração em `notificationService.notify()`:**
```js
// Após o emit Socket.IO já existente, adiciona (fire-and-forget):
pushService.send(userId, notification.title, notification.message, {
  entityType: data.entityType,
  entityId: data.entityId
}).catch(err => console.error('Push send error:', err.message));
```

### Frontend

#### `PushNotificationContext` (`src/contexts/PushNotificationContext.jsx`)

Expõe: `isVapidSupported`, `isSubscribed`, `subscribeToPush()`, `unsubscribeFromPush()`

**`isVapidSupported`:** `'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window`

**Fluxo de subscription:**
1. Busca chave pública: `GET /api/push/vapid-public-key`
2. `const reg = await navigator.serviceWorker.ready`
3. `const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) })`
4. `POST /api/push/subscribe` com `{ endpoint: sub.endpoint, keys: { p256dh, auth }, userAgent }`

**Fluxo de revogação:**
1. `sub.unsubscribe()` — remove do browser/push service primeiro
2. `DELETE /api/push/subscribe` com `{ endpoint }`

**Quando ativar:** o contexto observa `localStorage.crm_push_enabled`. Quando o toggle existente em Settings for ativado e `permission === 'granted'`, o `PushNotificationContext` automaticamente chama `subscribeToPush()`.

#### Árvore de providers (`src/main.jsx`) — ordem completa

Apenas `PushNotificationProvider` é adicionado. A árvore existente é mantida integralmente:

```jsx
<React.StrictMode>
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        <SocketProvider>
          <ToastProvider>
            <PushNotificationProvider>   {/* ← único novo provider */}
              <App />
            </PushNotificationProvider>
          </ToastProvider>
        </SocketProvider>
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
</React.StrictMode>
```

> `PushNotificationProvider` deve estar dentro de `AuthProvider` (precisa do token JWT para `POST /api/push/subscribe`) e dentro de `ToastProvider` (para exibir erros de permissão via `toast.error`). `ThemeProvider`, `BrowserRouter` e `React.StrictMode` são mantidos sem alteração.

#### UI em `SettingsPage` (aba Preferências)

O toggle existente de push é mantido. Adicionar abaixo dele:
- Se `!isVapidSupported`: nenhuma UI adicional (funcionalidade não disponível)
- Se `isSubscribed`: badge "Push nativo ativo" (verde)
- Se toggle ativo + `permission === 'granted'` + `!isSubscribed`: botão "Ativar notificação nativa" (aciona `subscribeToPush()`)

#### `src/services/push.service.js`

```js
export const getVapidPublicKey = () => api.get('/push/vapid-public-key')
export const subscribe = (data) => api.post('/push/subscribe', data)
export const unsubscribe = (endpoint) => api.delete('/push/subscribe', { data: { endpoint } })
```

### Service Worker personalizado (`src/sw.js`)

O Vite PWA muda de `generateSW` (padrão atual) para `injectManifest`. **Atenção:** ao migrar, o bloco `workbox` de `vite.config.js` (com `runtimeCaching`) é ignorado — essas regras devem ser portadas manualmente para `src/sw.js`.

**`vite.config.js` — ajuste:**
```js
VitePWA({
  strategies: 'injectManifest',
  srcDir: 'src',
  filename: 'sw.js',
  manifest: { /* igual ao atual */ }
  // bloco workbox: removido (portado para src/sw.js)
})
```

**`src/sw.js` — completo (incluindo runtime caching portado):**
```js
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst, CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache (injetado pelo Vite PWA)
precacheAndRoute(self.__WB_MANIFEST);

// Runtime caching — portado do vite.config.js anterior
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
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })]
  })
);

// Push handler
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'CRM', {
      body: data.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      data: data.data ?? {}
    })
  );
});

// Notification click — navega para a entidade
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { entityType, entityId } = event.notification.data ?? {};
  const urlMap = { deal: 'deals', lead: 'leads', contact: 'contacts', activity: 'activities', conversation: 'whatsapp' };
  const path = entityType && entityId ? `/${urlMap[entityType] ?? entityType}/${entityId}` : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      // Se há janela aberta, navega para o path correto e foca (não apenas foca)
      if (list.length > 0) {
        list[0].navigate(path);
        return list[0].focus();
      }
      return clients.openWindow(path);
    })
  );
});
```

### Arquivos a criar/alterar

**Backend (`crm-backend`):**
- `src/modules/push-subscriptions/push-subscription.model.js` — novo
- `src/modules/push-subscriptions/push-subscription.repository.js` — novo
- `src/modules/push-subscriptions/push-subscription.service.js` — novo
- `src/modules/push-subscriptions/push-subscription.controller.js` — novo
- `src/modules/push-subscriptions/push-subscription.routes.js` — novo
- `src/modules/notifications/notification.service.js` — integrar `pushService.send()`
- `src/app.js` — registrar rotas `/api/push`
- `.env` — adicionar `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`

**Frontend (`crm-frontend`):**
- `src/sw.js` — novo (service worker personalizado com workbox + push + notificationclick)
- `src/contexts/PushNotificationContext.jsx` — novo
- `src/services/push.service.js` — novo
- `src/main.jsx` — adicionar `PushNotificationProvider`
- `src/pages/settings/SettingsPage.jsx` — UI adicional na aba Preferências
- `vite.config.js` — migrar para `injectManifest`

---

## Ordem de implementação

1. **Feature 1 — Toast undo**
   - Criar `useUndoableDelete` e `useUndoableAction`
   - Adicionar funções de delete nos services do frontend
   - Integrar em todas as páginas listadas

2. **Feature 2 — Push notifications**
   - Backend: instalar `web-push`, gerar VAPID keys, criar módulo `push-subscriptions`, integrar em `notification.service`
   - Frontend: criar `src/sw.js` com workbox portado + push handlers, migrar `vite.config.js`, criar `PushNotificationContext`, atualizar `SettingsPage`
