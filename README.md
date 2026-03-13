
# CRM Frontend

Frontend do **CRM Pro** para gestão de leads, contatos, negócios (pipeline/kanban) e atividades.

## Stack

- **React 18**
- **Vite 5**
- **React Router DOM 6**
- **Axios**

## Requisitos

- Node.js (recomendado: 18+)
- npm (ou gerenciador compatível)

## Como rodar

1) Instale as dependências

```bash
npm install
```

2) Configure variáveis de ambiente

Este projeto usa `VITE_API_URL` como base URL da API.

Crie/edite um arquivo `.env` na raiz do projeto:

```bash
VITE_API_URL=http://localhost:3000
```

3) Rode em desenvolvimento

```bash
npm run dev
```

4) Build e preview

```bash
npm run build
npm run preview
```

## Funcionalidades

- **Autenticação**
  - Login em `/login`
  - Token armazenado no `localStorage` na chave `crm_token`
  - Interceptor do Axios adiciona `Authorization: Bearer <token>` automaticamente
  - Respostas `401` limpam o token e redirecionam para `/login`
- **Dashboard**
  - KPIs executivos, pipeline e resumo de atividades
- **Leads**
  - Listagem com filtros (`search`, `status`, `source`)
  - Atualização de status
  - Conversão de lead (gera negócio)
- **Contatos**
  - Listagem, criação e detalhes
- **Negócios (Deals)**
  - Listagem e visão kanban (`/deals/kanban`)
  - Atualização de estágio do negócio
- **Atividades**
  - Pendências do usuário e conclusão de atividade

## Rotas

Rotas públicas:

- `/login`

Rotas protegidas (exigem autenticação):

- `/dashboard`
- `/leads`
- `/leads/new`
- `/leads/:id`
- `/contacts`
- `/contacts/new`
- `/contacts/:id`
- `/deals`
- `/deals/new`
- `/deals/kanban`
- `/activities`

## Integração com a API (endpoints esperados)

Base URL definida por `VITE_API_URL`.

Autenticação:

- `POST /auth/login`
- `GET /auth/me`

Dashboard:

- `GET /dashboard/executive`
- `GET /dashboard/pipeline`
- `GET /dashboard/activities`

Leads:

- `GET /leads`
- `GET /leads/:id`
- `POST /leads`
- `PATCH /leads/:id/status`
- `POST /leads/:id/convert`

Contatos:

- `GET /contacts`
- `GET /contacts/:id`
- `POST /contacts`

Negócios:

- `GET /deals`
- `GET /deals/kanban/board`
- `PATCH /deals/:dealId/stage`

Atividades:

- `GET /activities/pending/me`
- `GET /activities/:relatedType/:relatedId`
- `PATCH /activities/:activityId/complete`

## Estrutura de pastas

- `src/main.jsx`
  - Bootstrap do React + Providers (`AuthProvider`, `ToastProvider`) + `BrowserRouter`
- `src/routes/index.jsx`
  - Definição de rotas e proteção via `ProtectedRoute`
- `src/contexts/`
  - `AuthContext.jsx`: login/logout, carregamento do usuário, estado de autenticação
  - `ToastContext.jsx`: toasts simples (success/error/info)
- `src/services/`
  - `api.js`: instância do Axios, interceptors (token + 401)
  - `*.service.js`: chamadas aos endpoints
- `src/pages/`
  - Telas por domínio (auth, leads, contacts, deals, dashboard, activities)
- `src/components/`
  - Componentes comuns e layout (Sidebar/Header/AppLayout)
- `src/styles/global.css`
  - Estilos globais

## Troubleshooting

- **Tela fica voltando para o login**
  - Verifique se `VITE_API_URL` está correto e a API está respondendo.
  - Um `401` em qualquer request remove `crm_token` e redireciona para `/login`.

- **Requests sem token**
  - Confirme se o login está retornando `{ token, user }`.
  - Confirme se o token está em `localStorage` com a chave `crm_token`.

