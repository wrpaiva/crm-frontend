# Design: Toast com Undo + Notificações Push via PWA

**Data:** 2026-03-20
**Branch:** feature/ia-copiloto-comercial
**Escopo:** Fase 3A — últimos dois itens pendentes do roadmap

---

## Feature 1: Toast com Undo (Optimistic UI)

### Contexto

O `ToastContext` já possui toda a lógica de undo implementada: função `undoable()`, `handleUndo()`, CSS das classes `toast-undo` e `toast-undo-btn`. O trabalho consiste em integrar esse mecanismo nas operações de delete e mudança de status nas páginas.

### Fluxo

1. Usuário aciona delete ou mudança de status
2. O item some da UI **imediatamente** (otimisticamente)
3. Toast amarelo aparece com mensagem + botão "Desfazer" + timer de 5s
4. Se timer expirar → chamada à API é executada
5. Se "Desfazer" clicado → item é reinserido no state local, API nunca é chamada

### Hook `useUndoableDelete`

Criado em `src/hooks/useUndoableDelete.js`. Encapsula o padrão de remoção otimista + undo para reutilização em todas as páginas.

```js
// Assinatura
function useUndoableDelete(setItems, deleteFn, message = 'Item removido.')
// Retorna: { removeWithUndo }

// Para ações de status (concluir, won, lost):
function useUndoableAction(setItems, actionFn, message)
// Retorna: { executeWithUndo }
```

**Lógica interna:** ao acionar, o item é removido do state e armazenado em um `ref`. Se o usuário clicar "Desfazer", o item é reinserido na posição original. Ao expirar o timer, `deleteFn(id)` é chamado.

### Operações que receberão undo

| Página | Operação |
|--------|----------|
| `LeadsPage` | delete lead |
| `LeadDetailsPage` | delete lead |
| `ContactsPage` | delete contato |
| `ContactDetailsPage` | delete contato |
| `DealsPage` | delete deal, fechar como won, fechar como lost |
| `DealDetailsModal` | delete deal, won, lost |
| `ActivitiesPage` | delete atividade, marcar como concluída |
| `MetasPage` | delete meta |
| `MetaDetailsPage` | delete meta |

### Arquivos alterados (frontend)

- `src/hooks/useUndoableDelete.js` — novo hook
- Todos os arquivos de página listados acima

---

## Feature 2: Notificações Push via PWA (True Web Push com VAPID)

### Contexto

A infraestrutura de PWA já está configurada (Vite PWA plugin, manifesto, ícones). O sistema de notificações do backend já persiste no MongoDB e emite via Socket.IO. O objetivo é adicionar push nativo do OS que funcione mesmo com o browser em background ou fechado.

### Arquitetura

```
Browser                        Backend                    MongoDB
───────                        ───────                    ───────
PushNotificationContext
  ↓ serviceWorker.subscribe()
  ↓ POST /api/push/subscribe ──────────────────────────→ push_subscriptions

(evento ocorre no sistema)
                               notificationService.notify()
                                 ↓ salva Notification ──→ notifications
                                 ↓ Socket.IO emit (existente)
                                 ↓ pushService.send(userId)
                                   ↓ busca subscriptions do userId
                                   ↓ web-push.sendNotification()
SW recebe evento 'push' ←──────────────────────────────────────────
  ↓ self.registration.showNotification()
OS exibe notificação nativa
```

### Backend — novo módulo `push-subscriptions`

**Instalação:** `npm install web-push`

**Geração de chaves VAPID (uma única vez):**
```
node -e "const wp=require('web-push'); const k=wp.generateVAPIDKeys(); console.log(k)"
```
Salvar em `.env`:
```
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:admin@crm.com
```

**Model `PushSubscription`:**
```js
{
  userId: ObjectId (ref: User),
  endpoint: String (unique por usuário+endpoint),
  keys: { p256dh: String, auth: String },
  userAgent: String,
  timestamps: true
}
```

**Rotas (`/api/push`):**
- `GET /vapid-public-key` — retorna `VAPID_PUBLIC_KEY` (público, sem auth)
- `POST /subscribe` — salva ou atualiza subscription do usuário autenticado
- `DELETE /subscribe` — remove subscription pelo endpoint

**`pushService.send(userId, title, body, data)`:**
- Busca todas subscriptions ativas do userId
- Chama `webPush.sendNotification()` para cada uma
- Em caso de erro 410/404 (subscription expirada), remove do banco automaticamente

**Integração em `notificationService.notify()`:**
```js
// Após emitir Socket.IO, adiciona:
await pushService.send(userId, notification.title, notification.message, {
  entityType: data.entityType,
  entityId: data.entityId
});
```

### Frontend

**`src/contexts/PushNotificationContext.jsx`:**
- Expõe: `isSupported`, `permission`, `isSubscribed`, `requestPermission()`
- No mount: busca chave pública via `GET /api/push/vapid-public-key`
- Se `permission === 'granted'` e SW disponível: inscreve automaticamente e envia ao backend
- Ao revogar: chama `DELETE /api/push/subscribe`

**Integração na árvore de providers (`src/main.jsx`):**
```jsx
<PushNotificationProvider>
  <App />
</PushNotificationProvider>
```

**UI em `SettingsPage` (aba Preferências):**
- Se `!isSupported`: mensagem "Seu navegador não suporta notificações push"
- Se `permission === 'default'`: botão "Ativar notificações push"
- Se `permission === 'granted'` e `isSubscribed`: badge verde "Notificações ativas"
- Se `permission === 'denied'`: instrução para habilitar manualmente no browser

### Service Worker personalizado (`src/sw.js`)

Vite PWA muda de `generateSW` para `injectManifest` para permitir SW customizado:

```js
// vite.config.js — ajuste na estratégia
VitePWA({
  strategies: 'injectManifest',
  srcDir: 'src',
  filename: 'sw.js',
  // ... resto igual
})
```

**`src/sw.js`:**
```js
import { precacheAndRoute } from 'workbox-precaching';

precacheAndRoute(self.__WB_MANIFEST); // injetado pelo Vite PWA

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

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      if (list.length > 0) return list[0].focus();
      return clients.openWindow('/');
    })
  );
});
```

### Arquivos alterados/criados

**Backend (`crm-backend`):**
- `src/modules/push-subscriptions/push-subscription.model.js`
- `src/modules/push-subscriptions/push-subscription.repository.js`
- `src/modules/push-subscriptions/push-subscription.service.js`
- `src/modules/push-subscriptions/push-subscription.controller.js`
- `src/modules/push-subscriptions/push-subscription.routes.js`
- `src/modules/notifications/notification.service.js` — integrar push
- `src/app.js` — registrar rotas `/api/push`
- `.env` — adicionar VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT

**Frontend (`crm-frontend`):**
- `src/sw.js` — service worker personalizado
- `src/contexts/PushNotificationContext.jsx`
- `src/services/push.service.js` — chamadas à API de push
- `src/main.jsx` — adicionar provider
- `src/pages/settings/SettingsPage.jsx` — UI na aba Preferências
- `vite.config.js` — mudar para estratégia `injectManifest`

---

## Ordem de implementação sugerida

1. **Feature 1** — toast undo (zero risco, só frontend)
   - Criar `useUndoableDelete`
   - Integrar em todas as páginas

2. **Feature 2** — push notifications
   - Backend: instalar web-push, criar módulo, integrar no notification service
   - Frontend: SW customizado, PushNotificationContext, UI em Settings
