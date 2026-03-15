# CRM - Roadmap do Projeto

## Implementado

### Autenticação
- [x] Login (frontend + backend)
- [x] Registro de usuário (backend + frontend)
- [x] Middleware de autenticação JWT
- [x] Controle de roles (admin, manager, seller)
- [x] Proteção de rotas no frontend

### Leads
- [x] Listagem com filtros por status e source
- [x] Criação de novo lead
- [x] Detalhes do lead
- [x] Atualização de status
- [x] Conversão de lead para contato/negócio
- [x] Soft delete

### Contatos
- [x] Listagem de contatos
- [x] Criação de novo contato
- [x] Detalhes do contato
- [x] Soft delete (backend)

### Negócios (Deals)
- [x] Listagem de negócios
- [x] Criação de novo negócio
- [x] Kanban board com drag & drop
- [x] Transição de stages
- [x] Fechamento (won/lost)
- [x] Modal de detalhes
- [x] Soft delete

### Atividades
- [x] Listagem de atividades pendentes
- [x] Filtros (hoje, semana, atrasadas)
- [x] Marcar como concluída
- [x] Criação de atividade
- [x] Soft delete

### Metas
- [x] Listagem com filtros (tipo, categoria)
- [x] Criação de nova meta
- [x] Detalhes com barra de progresso
- [x] Atualização de progresso
- [x] Summary cards (super, desejado, mínimo, abaixo)
- [x] Soft delete

### Dashboard
- [x] Visão executiva (resumo geral)
- [x] Pipeline (análise de funil)
- [x] Atividades (pendentes, concluídas)
- [x] Performance de vendedores
- [x] Performance por fonte de leads
- [x] Análise de riscos
- [x] Timeline

### IA Consultiva
- [x] Chat interativo com OpenAI (GPT-4o-mini)
- [x] Contexto automático dos dados do CRM
- [x] Histórico de conversas
- [x] Listagem de conversas com sidebar
- [x] Exclusão de conversa
- [x] Renderização de markdown nas respostas

### Auditoria e Histórico
- [x] Registro de auditoria em CRUD (backend)
- [x] Endpoint de consulta de auditoria (backend)
- [x] Endpoint de histórico de entidades (backend)
- [x] Timeline de histórico nas páginas de detalhes (Lead, Contato)
- [x] Página de Histórico geral (listagem paginada com filtro por tipo)

### Favoritos
- [x] Módulo de favoritos (backend — model, CRUD, check)
- [x] Página de Favoritos (listagem com navegação para entidade)
- [x] Botão de favoritar nas páginas de detalhes (Lead, Contato)

### Edição de Entidades
- [x] Edição de Lead (formulário + PUT /leads/:id)
- [x] Edição de Contato (formulário + PUT /contacts/:id)

### Administração
- [x] Gestão de Usuários — listagem, criação, alteração de role/status (admin)
- [x] Página de Configurações com abas (Perfil, Segurança, Usuários, Pipeline, Preferências)
- [x] Administração de Pipeline — CRUD de pipelines e stages customizados (backend + frontend)

### Notificações em Tempo Real
- [x] Módulo de notificações (backend — model, repository, service, controller, routes)
- [x] Persistência de notificações no MongoDB com leitura/não lida
- [x] Emissão via Socket.IO direcionada ao usuário (sala `user:{id}`)
- [x] Bell icon no Header com badge de contagem de não lidas
- [x] Dropdown com lista de notificações, ícones por tipo, marcar como lida
- [x] Marcar todas como lidas
- [x] Navegação ao clicar na notificação (redireciona para entidade)
- [x] Notificações integradas em: deals (stage/won/lost), leads (created/converted), atividades (assigned), WhatsApp (new message/conversation assigned)
- [x] Atualização real-time via Socket.IO (contagem e lista)

### Integração WhatsApp Business
- [x] Webhook de verificação e recebimento (Meta Cloud API)
- [x] Envio de mensagens de texto via Cloud API
- [x] Auto-criação de leads a partir de mensagens recebidas (source: 'whatsapp')
- [x] Central de conversas com lista, busca, preview e badge de não lidas
- [x] Chat real-time com bolhas inbound/outbound e checkmarks de status (sent/delivered/read)
- [x] Vínculo de conversa com lead/contato
- [x] Atribuição de conversa a usuário (admin/manager)
- [x] Marcar conversa como lida
- [x] Criação automática de atividades (type: 'whatsapp') no lead vinculado
- [x] Envio de mídia (imagem, vídeo, áudio, documento) via Cloud API
- [x] Renderização de mídia recebida no chat (imagens, vídeos, áudios, documentos)
- [x] Botão de anexo com menu de tipo de mídia
- [x] Modal de envio de mídia com URL, legenda e nome do arquivo
- [x] Envio de mensagens template (HSM) para iniciar conversas
- [x] Listagem de templates aprovados do Meta Business Manager
- [x] Preenchimento de variáveis do template com preview do corpo
- [x] Modal dedicado para seleção e envio de templates

### Infraestrutura
- [x] Axios com interceptors (token, redirect 401)
- [x] Rate limiting
- [x] CORS configurável
- [x] Health check
- [x] Request ID tracking
- [x] Middleware de validação (Joi)
- [x] Tratamento centralizado de erros
- [x] Toast notifications
- [x] Sidebar colapsável com ícones
- [x] Socket.IO server com autenticação JWT e salas por usuário/role
- [x] Socket.IO client context com auto-reconexão

---

## Pendente

### Frontend — Sidebar
- [x] ~~Favoritos~~ — implementado com página dedicada
- [x] ~~Histórico~~ — implementado com página dedicada

### Melhorias potenciais
- [x] ~~**Integração com WhatsApp**~~ — implementado com Cloud API, webhook, central de conversas e Socket.IO
- [x] ~~**Notificações em tempo real**~~ — implementado com módulo completo (model, Socket.IO, bell dropdown, integração em todos os módulos)
- [ ] **Relatórios exportáveis** — PDF/Excel de pipeline, performance, metas
- [ ] **Busca global** — pesquisa unificada de leads, contatos, deals
- [ ] **Dark/Light mode toggle** — atualmente só dark mode
- [ ] **Paginação no frontend** — algumas listagens não têm navegação de páginas
- [ ] **Upload de arquivos** — anexos em leads, contatos, deals
- [ ] **Integração com e-mail** — envio de e-mails direto do CRM
- [ ] **Dashboard customizável** — widgets drag & drop
- [x] ~~**WhatsApp — envio de mídia**~~ — imagens, documentos, áudio, vídeo via Cloud API
- [x] ~~**WhatsApp — templates**~~ — envio de mensagens template (HSM) para iniciar conversas
