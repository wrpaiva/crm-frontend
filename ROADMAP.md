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

### Lead Scoring, Distribuição & Enriquecimento
- [x] Lead scoring automático básico (regra simples configurável)
- [x] Regras de distribuição: Round Robin e Manual
- [x] Enriquecimento automático de lead via BrasilAPI (CNPJ → razão social, endereço, situação, porte, atividade)
- [x] Validação algorítmica de CPF
- [x] Campos CNPJ e CPF no lead (model, formulários, detalhes)
- [x] Botão manual "Enriquecer" na página de detalhes do lead
- [x] Seção "Dados Enriquecidos" com informações retornadas da BrasilAPI
- [x] Enriquecimento automático na criação do lead (assíncrono, não bloqueante)
- [x] Endpoint POST /leads/:id/enrich para enriquecimento manual
- [x] Máscaras visuais de CNPJ e CPF nos formulários

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

### AI Auto-Atendente WhatsApp
- [x] Módulo ai-responder no backend (model, repository, service, controller, routes, validator, DTO)
- [x] Configuração singleton (isActive, systemPrompt, maxMessages, responseDelay, qualifyThreshold, workingHours)
- [x] Resposta automática via OpenAI (GPT-4o-mini) a mensagens inbound do WhatsApp
- [x] Qualificação automática de leads via function calling (BANT: budget, need, urgency, authority)
- [x] Atualização automática de score e status do lead quando qualificado (score >= 70)
- [x] Controle de limite de mensagens por conversa com notificação ao vendedor
- [x] Delay configurável de resposta para parecer mais natural
- [x] Modo horário comercial (AI só atua fora do expediente)
- [x] Ações manuais: transferir para humano e parar AI
- [x] Notificações ao vendedor: lead qualificado pela AI, limite de mensagens atingido
- [x] Emissão de eventos Socket.IO para atualização real-time no frontend
- [x] Painel de configuração em Settings (aba AI Atendente) com toggle, prompt, limites e horários
- [x] Seção AI Atendente na página de detalhes do lead com badge de status, dados BANT e botões de ação
- [x] Seed de configuração padrão no bootstrap do servidor

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

## Fase 3 — Produto Comercial

### 3A — Fundação Comercial

#### Pipeline Avançado
- [x] Card expandido com abas: Conversas, Informações do Lead, Histórico do Pipeline
- [x] Cards compactos com informações essenciais no Kanban

#### Lead Scoring & Distribuição
- [x] Lead scoring automático básico (regra simples configurável)
- [x] Regras de distribuição: Round Robin e Manual
- [x] Enriquecimento automático de lead (BrasilAPI — CNPJ/CPF)
- [x] Qualificação e scoring automático via AI Atendente (BANT)

#### Cadência & Automação
- [x] Cadência automática de 5 tentativas na etapa SDR Qualificando (auto-enrollment via triggerStatus)
- [x] Mudança automática para Lead Frio após cadência expirada (processStep com onExpire + history)
- [x] Agendamento via link integrado ao Google Calendar (OAuth2, criação de evento e lembretes 24h/1h)

#### IA — Copiloto Comercial
- [x] AI Auto-Atendente WhatsApp 24h com qualificação BANT automática
- [x] Resumos automáticos de conversas e próximas ações sugeridas (OpenAI)
- [x] Respostas sugeridas editáveis com variáveis de template
- [x] Rankeamento de respostas por eficácia

#### Dashboard Operacional
- [x] Métricas operacionais chave (taxa de reuniões, leads criados, leads esquecidos)
- [x] Relatórios avançados e exportes customizados (PDF/Excel)
- [x] Dashboard customizável com widgets drag & drop

#### Notificações Avançadas
- [x] Toast com opção "desfazer" (undo)
- [x] Notificações push via PWA

#### Melhorias Gerais
- [x] Busca global — pesquisa unificada de leads, contatos, deals
- [x] Dark/Light mode toggle
- [x] Paginação no frontend em todas as listagens
- [x] Upload de arquivos — anexos em leads, contatos, deals

---

### 3B — Expansão Multicanal & IA

#### Multicanal WhatsApp
- [ ] Multi-contas WhatsApp com gestão avançada de filas
- [ ] Priorização de filas por lead score

#### Ecosistema Multicanal
- [ ] Integração com Instagram (DM via Meta API)
- [ ] Integração com Telegram (Bot API)
- [ ] E-mail conversacional (IMAP/SMTP ou SendGrid/Mailgun)
- [ ] Normalização de conversas — timeline unificada por lead independente do canal

#### IA Avançada
- [ ] Integração com vector DB para busca semântica de conversas
- [ ] Histórico de casos similares via embeddings
- [ ] A/B testing de scripts e playbooks com painel de eficácia

#### Anexos & Documentos
- [ ] Suporte a anexos ricos com preview inline
- [ ] OCR básico para documentos enviados (extração de texto)

#### Mobile
- [ ] Mobile PWA com notificações push e offline básico
- [ ] Mensagens offline com sincronização ao reconectar

---

### 3C — Enterprise & Escala

#### IA Preditiva & ML
- [ ] Machine learning proprietário para predição de fechamento
- [ ] Estimativa de LTV (Customer Lifetime Value) por lead
- [ ] Recomendação automática de consultor ideal por perfil
- [ ] Recomendações de investimento de tempo por lead
- [ ] Modelos de IA customizados treinados com dados anonimizados do setor

#### Integrações Profundas
- [ ] Integração com operadoras para consultas em tempo real (rede credenciada, portabilidade, preços)
- [ ] Geração automática de cotações personalizadas

#### Voz & Análise
- [ ] Transcrição de chamadas de voz (speech-to-text)
- [ ] Análise de tópicos e sentimento em chamadas

#### Automação Full-Funnel
- [ ] Envio programado de materiais educativos multimídia via WhatsApp (respeitando templates e políticas)
- [ ] Sequências omnichannel (e-mail, SMS, WhatsApp) automatizadas

#### Onboarding & Treinamento
- [ ] Ferramenta de onboarding automatizado para novos consultores
- [ ] Treinamento baseado em conversas reais (microlearning)

#### Marketplace
- [ ] Marketplace de scripts e integrações
- [ ] Marketplace de playbooks e templates
- [ ] White-label para grandes parceiros
- [ ] Parceiros de operadoras e parceiros de implantação

#### Governance & Multi-tenant
- [ ] Governance & compliance empresarial (retention policies, DLP, suporte a auditorias externas)
- [ ] Multi-tenant escalável completo com provisioning e quotas dedicadas

#### Mobile Nativo
- [ ] Apps nativos (iOS/Android) com mensagens offline e sincronização completa
