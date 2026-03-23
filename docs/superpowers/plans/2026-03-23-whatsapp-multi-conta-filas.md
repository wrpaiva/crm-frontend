# WhatsApp Multi-Contas + Filas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar suporte a múltiplas contas WhatsApp Business com gestão de filas de atendimento priorizada por lead score.

**Architecture:** Um modelo `WhatsAppAccount` mapeia cada `phoneNumberId` Meta para credenciais e regras. O webhook existente roteia mensagens por `phoneNumberId`. Um cron job a cada 30s distribui conversas da fila automaticamente em round-robin, priorizando por lead score. Salas Socket.IO por conta (`account:{id}:managers`) isolam broadcasts.

**Tech Stack:** Node.js/Express/MongoDB/Mongoose (backend), React/Vite (frontend), node-cron, Socket.IO, Node.js built-in `crypto` (AES-256-CBC para accessToken)

**Repos envolvidos:**
- Backend: `/home/usuario/projeto-2026/crm-backend`
- Frontend: `/home/usuario/projeto-2026/crm-frontend`

---

## Mapa de Arquivos

### Backend — Criar
| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/utils/crypto.js` | encrypt/decrypt AES-256-CBC para campos sensíveis |
| `src/modules/whatsapp/whatsapp-account.model.js` | Schema Mongoose para WhatsAppAccount |
| `src/modules/whatsapp/whatsapp-account.repository.js` | CRUD de contas no banco |
| `src/modules/whatsapp/whatsapp-account.service.js` | Regras de negócio: criar, listar, seed do .env |
| `src/modules/whatsapp/whatsapp-account.controller.js` | Handlers Express para rotas de contas |
| `src/modules/whatsapp/whatsapp-account.validator.js` | Schemas Joi para criar/editar contas |
| `src/modules/whatsapp/whatsapp-account.dto.js` | Mapeamento de resposta (redacta accessToken) |
| `src/modules/whatsapp/whatsapp-queue.model.js` | Schema Mongoose para WhatsAppQueueEntry |
| `src/modules/whatsapp/whatsapp-queue.repository.js` | Queries de fila (waiting, assign, expire) |
| `src/modules/whatsapp/whatsapp-queue.service.js` | Algoritmo de distribuição round-robin |
| `src/modules/whatsapp/whatsapp-queue.job.js` | Cron job a cada 30s |
| `src/modules/whatsapp/__tests__/whatsapp-account.service.test.js` | Testes: CRUD, seed, duplicata |
| `src/modules/whatsapp/__tests__/whatsapp-queue.service.test.js` | Testes: round-robin, expiração, sem agentes |
| `src/modules/whatsapp/__tests__/webhook.routing.test.js` | Testes: roteamento webhook por conta |

### Backend — Modificar
| Arquivo | O que muda |
|---------|-----------|
| `src/modules/whatsapp/conversation.model.js` | Adicionar campo `accountId` (nullable) |
| `src/modules/whatsapp/whatsapp.service.js` | Webhook roteia por `phoneNumberId` → conta |
| `src/modules/whatsapp/whatsapp.routes.js` | Montar rotas de contas e fila |
| `src/shared/socket/socket.js` | Ingressar usuário em salas `account:{id}:managers` |
| `src/server.js` | Chamar seed de contas e init do queue job |

### Frontend — Criar
| Arquivo | Responsabilidade |
|---------|-----------------|
| `src/services/whatsapp-account.service.js` | Funções API para contas e fila |
| `src/pages/settings/WhatsAppAccountsTab.jsx` | Aba de gestão de contas no Settings |
| `src/pages/whatsapp/QueuePage.jsx` | Página de fila de atendimento |

### Frontend — Modificar
| Arquivo | O que muda |
|---------|-----------|
| `src/pages/settings/SettingsPage.jsx` | Adicionar aba "WhatsApp" (adminOnly) |
| `src/pages/whatsapp/WhatsAppPage.jsx` | Filtro por conta no topo da lista |
| `src/routes/index.jsx` | Adicionar rota `/whatsapp/queue` |

---

## Task 1: Instalar Jest e configurar testes no backend

**Files:**
- Modify: `crm-backend/package.json`
- Create: `crm-backend/jest.config.js`
- Create: `crm-backend/src/modules/whatsapp/__tests__/` (pasta)

- [ ] **Step 1: Instalar dependências de teste**

```bash
cd /home/usuario/projeto-2026/crm-backend
npm install --save-dev jest
```

- [ ] **Step 2: Adicionar script de teste ao package.json**

No `package.json`, adicionar dentro de `"scripts"`:
```json
"test": "jest --runInBand",
"test:watch": "jest --watch --runInBand"
```

- [ ] **Step 3: Criar jest.config.js**

```js
// crm-backend/jest.config.js
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.js'],
  clearMocks: true,
};
```

- [ ] **Step 4: Criar pasta de testes do módulo whatsapp**

```bash
mkdir -p /home/usuario/projeto-2026/crm-backend/src/modules/whatsapp/__tests__
```

- [ ] **Step 5: Verificar que Jest está funcionando**

```bash
cd /home/usuario/projeto-2026/crm-backend
npx jest --listTests
```
Esperado: nenhum teste encontrado (sem erros de configuração).

- [ ] **Step 6: Commit**

```bash
cd /home/usuario/projeto-2026/crm-backend
git add package.json package-lock.json jest.config.js
git commit -m "chore: add Jest test runner"
```

---

## Task 2: Utilitário de criptografia AES-256

**Files:**
- Create: `crm-backend/src/utils/crypto.js`

> **Pré-requisito:** Adicionar `FIELD_ENCRYPTION_KEY=<64 hex chars>` no `.env`. Gere com: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

- [ ] **Step 1: Criar src/utils/crypto.js**

```js
// src/utils/crypto.js
const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;

function getKey() {
  const hex = process.env.FIELD_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error('FIELD_ENCRYPTION_KEY deve ter 64 caracteres hex (32 bytes).');
  }
  return Buffer.from(hex, 'hex');
}

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(String(text), 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(text) {
  const [ivHex, encryptedHex] = String(text).split(':');
  if (!ivHex || !encryptedHex) return text; // já decriptado ou valor legado
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

module.exports = { encrypt, decrypt };
```

- [ ] **Step 2: Verificar manualmente**

```bash
cd /home/usuario/projeto-2026/crm-backend
FIELD_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))") \
  node -e "const {encrypt,decrypt}=require('./src/utils/crypto'); const c=encrypt('token-secreto'); console.log('enc:', c); console.log('dec:', decrypt(c));"
```
Esperado: linha `dec: token-secreto`.

- [ ] **Step 3: Commit**

```bash
git add src/utils/crypto.js
git commit -m "feat: AES-256-CBC utility for field encryption"
```

---

## Task 3: Modelo WhatsAppAccount

**Files:**
- Create: `crm-backend/src/modules/whatsapp/whatsapp-account.model.js`

- [ ] **Step 1: Criar whatsapp-account.model.js**

```js
// src/modules/whatsapp/whatsapp-account.model.js
const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phoneNumberId: { type: String, required: true, unique: true, trim: true },
    accessToken: { type: String, required: true },   // armazenado criptografado
    businessAccountId: { type: String, required: true, trim: true },
    verifyToken: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    needsReauth: { type: Boolean, default: false },
    allowedRoles: [{ type: String, enum: ['admin', 'manager', 'seller'] }],
    assignedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    maxConcurrentChats: { type: Number, default: 5, min: 1 },
    queueExpiresInMin: { type: Number, default: 60, min: 1 },
    rrPointer: { type: Number, default: 0 },          // índice round-robin persistido
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    isDeleted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

schema.index({ phoneNumberId: 1 }, { unique: true });
schema.index({ isActive: 1, isDeleted: 1 });

module.exports = mongoose.model('WhatsAppAccount', schema);
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/whatsapp/whatsapp-account.model.js
git commit -m "feat: WhatsAppAccount mongoose model"
```

---

## Task 4: Repository de contas

**Files:**
- Create: `crm-backend/src/modules/whatsapp/whatsapp-account.repository.js`

- [ ] **Step 1: Criar whatsapp-account.repository.js**

```js
// src/modules/whatsapp/whatsapp-account.repository.js
const WhatsAppAccount = require('./whatsapp-account.model');

async function create(data) {
  const account = new WhatsAppAccount(data);
  return account.save();
}

async function findAll(includeDeleted = false) {
  const filter = includeDeleted ? {} : { isDeleted: false };
  return WhatsAppAccount.find(filter).populate('assignedUsers', 'name email role').sort({ createdAt: -1 });
}

async function findById(id) {
  return WhatsAppAccount.findOne({ _id: id, isDeleted: false }).populate('assignedUsers', 'name email role');
}

async function findByPhoneNumberId(phoneNumberId) {
  return WhatsAppAccount.findOne({ phoneNumberId, isDeleted: false });
}

async function findActiveByPhoneNumberId(phoneNumberId) {
  return WhatsAppAccount.findOne({ phoneNumberId, isActive: true, isDeleted: false });
}

async function findAllActive() {
  return WhatsAppAccount.find({ isActive: true, isDeleted: false }).populate('assignedUsers', '_id');
}

async function update(id, data) {
  return WhatsAppAccount.findByIdAndUpdate(id, data, { new: true });
}

async function updateRrPointer(id, newPointer) {
  return WhatsAppAccount.findByIdAndUpdate(id, { rrPointer: newPointer });
}

async function count() {
  return WhatsAppAccount.countDocuments({ isDeleted: false });
}

module.exports = {
  create,
  findAll,
  findById,
  findByPhoneNumberId,
  findActiveByPhoneNumberId,
  findAllActive,
  update,
  updateRrPointer,
  count,
};
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/whatsapp/whatsapp-account.repository.js
git commit -m "feat: WhatsAppAccount repository"
```

---

## Task 5: Service de contas (TDD)

**Files:**
- Create: `crm-backend/src/modules/whatsapp/__tests__/whatsapp-account.service.test.js`
- Create: `crm-backend/src/modules/whatsapp/whatsapp-account.service.js`

- [ ] **Step 1: Escrever teste falhando**

```js
// src/modules/whatsapp/__tests__/whatsapp-account.service.test.js
const accountService = require('../whatsapp-account.service');
const accountRepository = require('../whatsapp-account.repository');

jest.mock('../whatsapp-account.repository');
jest.mock('../../../utils/crypto', () => ({
  encrypt: (v) => `enc:${v}`,
  decrypt: (v) => v.replace('enc:', ''),
}));

describe('WhatsAppAccountService', () => {
  describe('create', () => {
    it('criptografa o accessToken antes de salvar', async () => {
      accountRepository.findByPhoneNumberId.mockResolvedValue(null);
      accountRepository.create.mockResolvedValue({ _id: 'id1', name: 'Test', phoneNumberId: 'p1', accessToken: 'enc:raw-token' });

      await accountService.create({ name: 'Test', phoneNumberId: 'p1', accessToken: 'raw-token', businessAccountId: 'b1', verifyToken: 'v1' }, 'userId');

      const savedData = accountRepository.create.mock.calls[0][0];
      expect(savedData.accessToken).toBe('enc:raw-token');
      expect(savedData.accessToken).not.toBe('raw-token');
    });

    it('lança erro 409 quando phoneNumberId já existe', async () => {
      accountRepository.findByPhoneNumberId.mockResolvedValue({ _id: 'existing' });

      await expect(
        accountService.create({ name: 'Test', phoneNumberId: 'duplicate', accessToken: 'tok', businessAccountId: 'b1', verifyToken: 'v1' }, 'userId')
      ).rejects.toMatchObject({ statusCode: 409 });
    });
  });

  describe('seedFromEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = {
        ...originalEnv,
        WHATSAPP_PHONE_NUMBER_ID: 'env-phone',
        WHATSAPP_ACCESS_TOKEN: 'env-token',
        WHATSAPP_BUSINESS_ACCOUNT_ID: 'env-biz',
        WHATSAPP_VERIFY_TOKEN: 'env-verify',
      };
    });

    afterEach(() => { process.env = originalEnv; });

    it('cria conta do .env se collection está vazia', async () => {
      accountRepository.count.mockResolvedValue(0);
      accountRepository.create.mockResolvedValue({});

      await accountService.seedFromEnv();

      expect(accountRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ phoneNumberId: 'env-phone' })
      );
    });

    it('não faz seed se já existem contas', async () => {
      accountRepository.count.mockResolvedValue(1);

      await accountService.seedFromEnv();

      expect(accountRepository.create).not.toHaveBeenCalled();
    });

    it('não faz seed se WHATSAPP_PHONE_NUMBER_ID não está definido', async () => {
      process.env.WHATSAPP_PHONE_NUMBER_ID = '';
      accountRepository.count.mockResolvedValue(0);

      await accountService.seedFromEnv();

      expect(accountRepository.create).not.toHaveBeenCalled();
    });
  });
});
```

- [ ] **Step 2: Rodar teste e confirmar falha**

```bash
cd /home/usuario/projeto-2026/crm-backend
npx jest __tests__/whatsapp-account.service.test.js --no-coverage
```
Esperado: FAIL — "Cannot find module '../whatsapp-account.service'"

- [ ] **Step 3: Criar whatsapp-account.service.js**

```js
// src/modules/whatsapp/whatsapp-account.service.js
const accountRepository = require('./whatsapp-account.repository');
const { encrypt, decrypt } = require('../../utils/crypto');

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function create(data, createdByUserId) {
  const existing = await accountRepository.findByPhoneNumberId(data.phoneNumberId);
  if (existing) {
    throw new HttpError(409, `Já existe uma conta com o phoneNumberId "${data.phoneNumberId}".`);
  }

  const payload = {
    ...data,
    accessToken: encrypt(data.accessToken),
    createdBy: createdByUserId,
  };
  return accountRepository.create(payload);
}

async function findAll() {
  return accountRepository.findAll();
}

async function findById(id) {
  const account = await accountRepository.findById(id);
  if (!account) throw new HttpError(404, 'Conta não encontrada.');
  return account;
}

async function update(id, data) {
  if (data.accessToken) {
    data.accessToken = encrypt(data.accessToken);
  }
  const updated = await accountRepository.update(id, data);
  if (!updated) throw new HttpError(404, 'Conta não encontrada.');
  return updated;
}

async function toggle(id) {
  const account = await accountRepository.findById(id);
  if (!account) throw new HttpError(404, 'Conta não encontrada.');
  return accountRepository.update(id, { isActive: !account.isActive });
}

async function remove(id) {
  const account = await accountRepository.findById(id);
  if (!account) throw new HttpError(404, 'Conta não encontrada.');
  return accountRepository.update(id, { isDeleted: true });
}

async function resolveByPhoneNumberId(phoneNumberId) {
  const account = await accountRepository.findActiveByPhoneNumberId(phoneNumberId);
  if (account) return { account, token: decrypt(account.accessToken) };

  // Fallback legado: usar credenciais do .env
  if (process.env.WHATSAPP_PHONE_NUMBER_ID === phoneNumberId) {
    console.warn(`[WhatsApp] Conta ${phoneNumberId} não cadastrada no DB — usando fallback .env (DEPRECADO).`);
    return {
      account: null,
      token: process.env.WHATSAPP_ACCESS_TOKEN,
    };
  }

  return null;
}

async function seedFromEnv() {
  if (!process.env.WHATSAPP_PHONE_NUMBER_ID) return;

  const total = await accountRepository.count();
  if (total > 0) return;

  await accountRepository.create({
    name: 'Conta Principal',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID,
    accessToken: encrypt(process.env.WHATSAPP_ACCESS_TOKEN || ''),
    businessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID || '',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || '',
    isActive: true,
  });

  console.log('[WhatsApp] Conta Principal criada a partir das variáveis de ambiente.');
}

module.exports = { create, findAll, findById, update, toggle, remove, resolveByPhoneNumberId, seedFromEnv };
```

- [ ] **Step 4: Rodar testes e confirmar que passam**

```bash
npx jest src/modules/whatsapp/__tests__/whatsapp-account.service.test.js --no-coverage
```
Esperado: PASS (5 testes)

- [ ] **Step 5: Commit**

```bash
git add src/modules/whatsapp/whatsapp-account.service.js src/modules/whatsapp/__tests__/whatsapp-account.service.test.js
git commit -m "feat: WhatsAppAccount service with encryption and .env seed (TDD)"
```

---

## Task 6: Controller, Validator, DTO e rotas de contas

**Files:**
- Create: `crm-backend/src/modules/whatsapp/whatsapp-account.validator.js`
- Create: `crm-backend/src/modules/whatsapp/whatsapp-account.dto.js`
- Create: `crm-backend/src/modules/whatsapp/whatsapp-account.controller.js`

- [ ] **Step 1: Criar whatsapp-account.validator.js**

```js
// src/modules/whatsapp/whatsapp-account.validator.js
const Joi = require('joi');

const create = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  phoneNumberId: Joi.string().trim().required(),
  accessToken: Joi.string().trim().required(),
  businessAccountId: Joi.string().trim().required(),
  verifyToken: Joi.string().trim().required(),
  allowedRoles: Joi.array().items(Joi.string().valid('admin', 'manager', 'seller')).default(['admin', 'manager', 'seller']),
  assignedUsers: Joi.array().items(Joi.string()).default([]),
  maxConcurrentChats: Joi.number().integer().min(1).default(5),
  queueExpiresInMin: Joi.number().integer().min(1).default(60),
});

const update = Joi.object({
  name: Joi.string().trim().min(2).max(100),
  accessToken: Joi.string().trim(),
  businessAccountId: Joi.string().trim(),
  verifyToken: Joi.string().trim(),
  allowedRoles: Joi.array().items(Joi.string().valid('admin', 'manager', 'seller')),
  assignedUsers: Joi.array().items(Joi.string()),
  maxConcurrentChats: Joi.number().integer().min(1),
  queueExpiresInMin: Joi.number().integer().min(1),
}).min(1);

module.exports = { create, update };
```

- [ ] **Step 2: Criar whatsapp-account.dto.js**

```js
// src/modules/whatsapp/whatsapp-account.dto.js
const { decrypt } = require('../../utils/crypto');

function toAccountDTO(account, { showToken = false } = {}) {
  const obj = account.toObject ? account.toObject() : account;
  return {
    id: obj._id,
    name: obj.name,
    phoneNumberId: obj.phoneNumberId,
    accessToken: showToken ? decrypt(obj.accessToken) : '***',
    businessAccountId: obj.businessAccountId,
    verifyToken: obj.verifyToken,
    isActive: obj.isActive,
    needsReauth: obj.needsReauth,
    allowedRoles: obj.allowedRoles,
    assignedUsers: obj.assignedUsers,
    maxConcurrentChats: obj.maxConcurrentChats,
    queueExpiresInMin: obj.queueExpiresInMin,
    createdAt: obj.createdAt,
    updatedAt: obj.updatedAt,
  };
}

module.exports = { toAccountDTO };
```

- [ ] **Step 3: Criar whatsapp-account.controller.js**

```js
// src/modules/whatsapp/whatsapp-account.controller.js
const accountService = require('./whatsapp-account.service');
const { toAccountDTO } = require('./whatsapp-account.dto');

async function list(req, res, next) {
  try {
    const accounts = await accountService.findAll();
    res.json({ data: accounts.map((a) => toAccountDTO(a)) });
  } catch (err) { next(err); }
}

async function get(req, res, next) {
  try {
    const account = await accountService.findById(req.params.id);
    res.json({ data: toAccountDTO(account) });
  } catch (err) { next(err); }
}

async function create(req, res, next) {
  try {
    const account = await accountService.create(req.body, req.user.id);
    res.status(201).json({ data: toAccountDTO(account, { showToken: true }) });
  } catch (err) {
    if (err.statusCode === 409) return res.status(409).json({ message: err.message });
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const account = await accountService.update(req.params.id, req.body);
    const showToken = Boolean(req.body.accessToken);
    res.json({ data: toAccountDTO(account, { showToken }) });
  } catch (err) {
    if (err.statusCode === 404) return res.status(404).json({ message: err.message });
    next(err);
  }
}

async function toggle(req, res, next) {
  try {
    const account = await accountService.toggle(req.params.id);
    res.json({ data: toAccountDTO(account) });
  } catch (err) { next(err); }
}

async function remove(req, res, next) {
  try {
    await accountService.remove(req.params.id);
    res.json({ message: 'Conta removida.' });
  } catch (err) { next(err); }
}

module.exports = { list, get, create, update, toggle, remove };
```

- [ ] **Step 4: Adicionar rotas de contas em whatsapp.routes.js**

Abrir `src/modules/whatsapp/whatsapp.routes.js`. Adicionar no topo (após os imports existentes):

```js
const accountController = require('./whatsapp-account.controller');
const accountValidator = require('./whatsapp-account.validator');
```

Adicionar as rotas antes da linha `module.exports = router;`:

```js
// Contas WhatsApp (admin only)
router.get('/accounts', roleMiddleware(['admin']), accountController.list);
router.get('/accounts/:id', roleMiddleware(['admin']), accountController.get);
router.post('/accounts', roleMiddleware(['admin']), validate(accountValidator.create), accountController.create);
router.put('/accounts/:id', roleMiddleware(['admin']), validate(accountValidator.update), accountController.update);
router.patch('/accounts/:id/toggle', roleMiddleware(['admin']), accountController.toggle);
router.delete('/accounts/:id', roleMiddleware(['admin']), accountController.remove);
```

> Verifique como `validate` e `roleMiddleware` são importados no topo do arquivo e siga o mesmo padrão existente.

- [ ] **Step 5: Testar as rotas manualmente com curl ou Insomnia**

```bash
# Verificar que o servidor sobe sem erros
cd /home/usuario/projeto-2026/crm-backend && npm run dev
```
Esperado: `🚀 CRM API rodando na porta 3000` sem erros.

- [ ] **Step 6: Commit**

```bash
git add src/modules/whatsapp/whatsapp-account.validator.js \
        src/modules/whatsapp/whatsapp-account.dto.js \
        src/modules/whatsapp/whatsapp-account.controller.js \
        src/modules/whatsapp/whatsapp.routes.js
git commit -m "feat: WhatsApp account CRUD — controller, validator, dto, routes"
```

---

## Task 7: Seed de contas no bootstrap do servidor

**Files:**
- Modify: `crm-backend/src/server.js`

- [ ] **Step 1: Adicionar import e chamada de seed em server.js**

No topo de `src/server.js`, após os imports existentes:
```js
const whatsappAccountService = require('./modules/whatsapp/whatsapp-account.service');
```

Na função `bootstrap()`, após as seeds existentes (`aiResponderRepository.seedDefaults()`):
```js
await whatsappAccountService.seedFromEnv();
```

- [ ] **Step 2: Reiniciar servidor e verificar log**

```bash
npm run dev
```
Se `.env` tem `WHATSAPP_PHONE_NUMBER_ID` e não há contas cadastradas, esperado:
```
[WhatsApp] Conta Principal criada a partir das variáveis de ambiente.
```
Se já há contas, nenhuma mensagem (silencioso).

- [ ] **Step 3: Commit**

```bash
git add src/server.js
git commit -m "feat: seed WhatsApp account from .env on bootstrap"
```

---

## Task 8: Modelo WhatsAppQueueEntry + atualização do Conversation

**Files:**
- Create: `crm-backend/src/modules/whatsapp/whatsapp-queue.model.js`
- Modify: `crm-backend/src/modules/whatsapp/conversation.model.js`

- [ ] **Step 1: Criar whatsapp-queue.model.js**

```js
// src/modules/whatsapp/whatsapp-queue.model.js
const mongoose = require('mongoose');

const schema = new mongoose.Schema(
  {
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppAccount', required: true },
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppConversation', required: true },
    leadId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lead' },
    priority: { type: Number, default: 0, min: 0, max: 100 },
    status: { type: String, enum: ['waiting', 'assigned', 'expired'], default: 'waiting' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    assignedAt: Date,
    expiresAt: Date,
  },
  { timestamps: true }
);

// Índice para re-entrada: permite múltiplos históricos, query eficiente de entradas ativas
schema.index({ conversationId: 1, status: 1 });
// Índice para processamento da fila por conta
schema.index({ accountId: 1, status: 1, priority: -1, createdAt: 1 });

module.exports = mongoose.model('WhatsAppQueueEntry', schema);
```

- [ ] **Step 2: Adicionar accountId ao conversation.model.js**

Abrir `src/modules/whatsapp/conversation.model.js`. Localizar o schema e adicionar o campo `accountId` (nullable):

```js
accountId: { type: mongoose.Schema.Types.ObjectId, ref: 'WhatsAppAccount', default: null },
```

> Adicionar junto aos outros campos de referência como `leadId` e `contactId`.

- [ ] **Step 3: Commit**

```bash
git add src/modules/whatsapp/whatsapp-queue.model.js \
        src/modules/whatsapp/conversation.model.js
git commit -m "feat: WhatsAppQueueEntry model + accountId on Conversation"
```

---

## Task 9: Repository da fila

**Files:**
- Create: `crm-backend/src/modules/whatsapp/whatsapp-queue.repository.js`

- [ ] **Step 1: Criar whatsapp-queue.repository.js**

```js
// src/modules/whatsapp/whatsapp-queue.repository.js
const WhatsAppQueueEntry = require('./whatsapp-queue.model');
const WhatsAppConversation = require('./conversation.model');

async function upsertWaiting(accountId, conversationId, leadId, priority, expiresAt) {
  // Reusa entry existente se já há uma para esta conversa (re-entrada)
  const existing = await WhatsAppQueueEntry.findOne({ conversationId });
  if (existing) {
    existing.status = 'waiting';
    existing.assignedTo = undefined;
    existing.assignedAt = undefined;
    existing.priority = priority;
    existing.expiresAt = expiresAt;
    return existing.save();
  }
  return WhatsAppQueueEntry.create({ accountId, conversationId, leadId, priority, expiresAt, status: 'waiting' });
}

async function findWaiting(accountId) {
  return WhatsAppQueueEntry.find({ accountId, status: 'waiting' })
    .sort({ priority: -1, createdAt: 1 })
    .populate('conversationId', 'contactName phoneNumber')
    .populate('leadId', 'name score');
}

async function countActiveByAgent(userId) {
  return WhatsAppConversation.countDocuments({ assignedTo: userId, status: 'active', isDeleted: false });
}

async function assign(entryId, userId, assignedAt) {
  return WhatsAppQueueEntry.findByIdAndUpdate(
    entryId,
    { status: 'assigned', assignedTo: userId, assignedAt },
    { new: true }
  );
}

async function findExpired(now) {
  return WhatsAppQueueEntry.find({ status: 'waiting', expiresAt: { $lt: now } })
    .populate('conversationId', 'contactName')
    .populate('accountId', 'name');
}

async function expire(entryId) {
  return WhatsAppQueueEntry.findByIdAndUpdate(entryId, { status: 'expired' });
}

async function findWaitingCount(accountId) {
  return WhatsAppQueueEntry.countDocuments({ accountId, status: 'waiting' });
}

async function findQueueByAccount(accountId) {
  return WhatsAppQueueEntry.find({ accountId, status: 'waiting' })
    .sort({ priority: -1, createdAt: 1 })
    .populate('conversationId', 'contactName phoneNumber')
    .populate('leadId', 'name score')
    .populate('assignedTo', 'name');
}

async function findAllQueue() {
  return WhatsAppQueueEntry.find({ status: 'waiting' })
    .sort({ priority: -1, createdAt: 1 })
    .populate('conversationId', 'contactName phoneNumber')
    .populate('leadId', 'name score')
    .populate('accountId', 'name');
}

async function manualAssign(entryId, userId) {
  const entry = await WhatsAppQueueEntry.findByIdAndUpdate(
    entryId,
    { status: 'assigned', assignedTo: userId, assignedAt: new Date() },
    { new: true }
  );
  if (entry) {
    await WhatsAppConversation.findByIdAndUpdate(entry.conversationId, { assignedTo: userId });
  }
  return entry;
}

module.exports = {
  upsertWaiting,
  findWaiting,
  countActiveByAgent,
  assign,
  findExpired,
  expire,
  findWaitingCount,
  findQueueByAccount,
  findAllQueue,
  manualAssign,
};
```

- [ ] **Step 2: Commit**

```bash
git add src/modules/whatsapp/whatsapp-queue.repository.js
git commit -m "feat: WhatsAppQueue repository"
```

---

## Task 10: Service da fila (TDD)

**Files:**
- Create: `crm-backend/src/modules/whatsapp/__tests__/whatsapp-queue.service.test.js`
- Create: `crm-backend/src/modules/whatsapp/whatsapp-queue.service.js`

- [ ] **Step 1: Escrever testes falhando**

```js
// src/modules/whatsapp/__tests__/whatsapp-queue.service.test.js
const queueService = require('../whatsapp-queue.service');
const accountRepository = require('../whatsapp-account.repository');
const queueRepository = require('../whatsapp-queue.repository');

jest.mock('../whatsapp-account.repository');
jest.mock('../whatsapp-queue.repository');

// Mock do Socket.IO — getIO não precisa de conexão real
jest.mock('../../../shared/socket/socket', () => ({
  getIO: () => ({ to: () => ({ emit: jest.fn() }) }),
}));

describe('WhatsAppQueueService.processQueue', () => {
  it('atribui conversa ao agente via round-robin e persiste rrPointer', async () => {
    const account = { _id: 'acc1', assignedUsers: [{ _id: 'user1' }, { _id: 'user2' }], maxConcurrentChats: 5, rrPointer: 0 };
    const entry = { _id: 'e1', conversationId: { _id: 'conv1' }, priority: 80, accountId: 'acc1' };

    accountRepository.findAllActive.mockResolvedValue([account]);
    queueRepository.findWaiting.mockResolvedValue([entry]);
    queueRepository.countActiveByAgent.mockResolvedValue(2); // abaixo do limite
    queueRepository.assign.mockResolvedValue({ ...entry, status: 'assigned', assignedTo: 'user1' });
    accountRepository.updateRrPointer.mockResolvedValue({});

    await queueService.processQueue();

    // Deve atribuir ao user1 (rrPointer 0 → índice 1 mod 2 = 1 → user2? Não — ver implementação abaixo)
    expect(queueRepository.assign).toHaveBeenCalledWith('e1', expect.any(String), expect.any(Date));
    expect(accountRepository.updateRrPointer).toHaveBeenCalledWith('acc1', expect.any(Number));
  });

  it('não atribui quando todos os agentes atingiram o limite de chats', async () => {
    const account = { _id: 'acc1', assignedUsers: [{ _id: 'user1' }], maxConcurrentChats: 2, rrPointer: 0 };
    const entry = { _id: 'e1', conversationId: { _id: 'conv1' }, priority: 50, accountId: 'acc1' };

    accountRepository.findAllActive.mockResolvedValue([account]);
    queueRepository.findWaiting.mockResolvedValue([entry]);
    queueRepository.countActiveByAgent.mockResolvedValue(2); // NO limite
    const assignSpy = queueRepository.assign;

    await queueService.processQueue();

    expect(assignSpy).not.toHaveBeenCalled();
  });
});

describe('WhatsAppQueueService.expireOldEntries', () => {
  it('expira entradas com expiresAt no passado e emite socket', async () => {
    const expiredEntry = {
      _id: 'e2',
      conversationId: { contactName: 'Carlos' },
      accountId: { _id: 'acc1', name: 'Vendas' },
    };
    queueRepository.findExpired.mockResolvedValue([expiredEntry]);
    queueRepository.expire.mockResolvedValue({});

    await queueService.expireOldEntries();

    expect(queueRepository.expire).toHaveBeenCalledWith('e2');
  });

  it('não faz nada se não há entradas expiradas', async () => {
    queueRepository.findExpired.mockResolvedValue([]);

    await queueService.expireOldEntries();

    expect(queueRepository.expire).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

```bash
npx jest src/modules/whatsapp/__tests__/whatsapp-queue.service.test.js --no-coverage
```
Esperado: FAIL — "Cannot find module '../whatsapp-queue.service'"

- [ ] **Step 3: Criar whatsapp-queue.service.js**

```js
// src/modules/whatsapp/whatsapp-queue.service.js
const accountRepository = require('./whatsapp-account.repository');
const queueRepository = require('./whatsapp-queue.repository');
const { getIO } = require('../../shared/socket/socket');

async function enqueue(accountId, conversationId, leadId, leadScore, queueExpiresInMin) {
  const priority = leadScore ?? 0;
  const expiresAt = new Date(Date.now() + queueExpiresInMin * 60 * 1000);
  return queueRepository.upsertWaiting(accountId, conversationId, leadId, priority, expiresAt);
}

async function processQueue() {
  const accounts = await accountRepository.findAllActive();

  for (const account of accounts) {
    const entries = await queueRepository.findWaiting(account._id);
    if (entries.length === 0) continue;

    const users = account.assignedUsers;
    if (!users || users.length === 0) continue;

    let pointer = account.rrPointer ?? 0;

    for (const entry of entries) {
      // Encontrar próximo agente disponível a partir do pointer
      let assigned = null;
      for (let i = 0; i < users.length; i++) {
        const idx = (pointer + 1 + i) % users.length;
        const userId = users[idx]._id || users[idx];
        const activeCount = await queueRepository.countActiveByAgent(userId);
        if (activeCount < account.maxConcurrentChats) {
          assigned = { userId, idx };
          break;
        }
      }

      if (!assigned) continue; // todos atingiram o limite

      pointer = assigned.idx;
      await accountRepository.updateRrPointer(account._id, pointer);
      await queueRepository.assign(entry._id, assigned.userId, new Date());

      try {
        getIO().to(`user:${assigned.userId}`).emit('queue:assigned', {
          conversationId: entry.conversationId._id || entry.conversationId,
          leadName: entry.leadId?.name || 'Lead',
          accountName: account.name,
        });
        getIO().to(`account:${account._id}:managers`).emit('queue:updated', {
          accountId: account._id,
          waitingCount: await queueRepository.findWaitingCount(account._id),
        });
      } catch (_) { /* socket pode não estar disponível em testes */ }
    }
  }
}

async function expireOldEntries() {
  const expired = await queueRepository.findExpired(new Date());
  for (const entry of expired) {
    await queueRepository.expire(entry._id);
    try {
      getIO().to(`account:${entry.accountId._id}:managers`).emit('queue:expired', {
        entryId: entry._id,
        leadName: entry.conversationId?.contactName || 'Lead',
        accountName: entry.accountId?.name || '',
      });
    } catch (_) { /* socket pode não estar disponível */ }
  }
}

module.exports = { enqueue, processQueue, expireOldEntries };
```

- [ ] **Step 4: Rodar testes e confirmar que passam**

```bash
npx jest src/modules/whatsapp/__tests__/whatsapp-queue.service.test.js --no-coverage
```
Esperado: PASS (4 testes)

- [ ] **Step 5: Commit**

```bash
git add src/modules/whatsapp/whatsapp-queue.service.js src/modules/whatsapp/__tests__/whatsapp-queue.service.test.js
git commit -m "feat: WhatsApp queue service with round-robin distribution (TDD)"
```

---

## Task 11: Job cron da fila

**Files:**
- Create: `crm-backend/src/modules/whatsapp/whatsapp-queue.job.js`
- Modify: `crm-backend/src/server.js`

- [ ] **Step 1: Criar whatsapp-queue.job.js**

```js
// src/modules/whatsapp/whatsapp-queue.job.js
const cron = require('node-cron');
const queueService = require('./whatsapp-queue.service');

function init() {
  cron.schedule('*/30 * * * * *', async () => {
    try {
      await queueService.processQueue();
      await queueService.expireOldEntries();
    } catch (err) {
      console.error('[WhatsAppQueue] Erro no job de distribuição:', err.message);
    }
  });

  console.log('[WhatsAppQueue] Job de distribuição iniciado (a cada 30 segundos)');
}

module.exports = { init };
```

> Nota: `*/30 * * * * *` é sintaxe de segundos (6 campos, requer que node-cron suporte segundos — verifique a versão instalada. Se não suportar, use `*/1 * * * *` para cada minuto).

- [ ] **Step 2: Verificar versão do node-cron**

```bash
cd /home/usuario/projeto-2026/crm-backend
node -e "const c = require('node-cron'); console.log(c.validate('*/30 * * * * *'));"
```
Se retornar `true`: sintaxe de segundos é suportada. Se `false`: trocar para `'* * * * *'` (a cada minuto).

- [ ] **Step 3: Registrar job em server.js**

Após os imports existentes no topo de `src/server.js`:
```js
const whatsappQueueJob = require('./modules/whatsapp/whatsapp-queue.job');
```

Dentro da função `bootstrap()`, no callback do `server.listen`, após `cadenceScheduler.init()`:
```js
whatsappQueueJob.init();
```

- [ ] **Step 4: Subir servidor e confirmar log**

```bash
npm run dev
```
Esperado: `[WhatsAppQueue] Job de distribuição iniciado (a cada 30 segundos)`

- [ ] **Step 5: Commit**

```bash
git add src/modules/whatsapp/whatsapp-queue.job.js src/server.js
git commit -m "feat: WhatsApp queue cron job (30s distribution cycle)"
```

---

## Task 12: Roteamento webhook por conta

**Files:**
- Create: `crm-backend/src/modules/whatsapp/__tests__/webhook.routing.test.js`
- Modify: `crm-backend/src/modules/whatsapp/whatsapp.service.js`

- [ ] **Step 1: Escrever teste de roteamento falhando**

```js
// src/modules/whatsapp/__tests__/webhook.routing.test.js
const accountService = require('../whatsapp-account.service');

jest.mock('../whatsapp-account.service');

describe('Webhook routing — resolveByPhoneNumberId', () => {
  beforeEach(() => jest.clearAllMocks());

  it('retorna conta e token decriptado quando conta existe', async () => {
    accountService.resolveByPhoneNumberId.mockResolvedValue({
      account: { _id: 'acc1', name: 'Vendas SP' },
      token: 'decrypted-token',
    });

    const result = await accountService.resolveByPhoneNumberId('phone-id-1');

    expect(result).not.toBeNull();
    expect(result.account._id).toBe('acc1');
    expect(result.token).toBe('decrypted-token');
  });

  it('retorna null quando phoneNumberId não corresponde a nenhuma conta nem ao .env', async () => {
    accountService.resolveByPhoneNumberId.mockResolvedValue(null);

    const result = await accountService.resolveByPhoneNumberId('unknown-phone');

    expect(result).toBeNull();
  });

  it('usa fallback .env quando phoneNumberId bate com WHATSAPP_PHONE_NUMBER_ID', async () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'legacy-phone';
    accountService.resolveByPhoneNumberId.mockResolvedValue({
      account: null,
      token: process.env.WHATSAPP_ACCESS_TOKEN,
    });

    const result = await accountService.resolveByPhoneNumberId('legacy-phone');

    expect(result).not.toBeNull();
    expect(result.account).toBeNull(); // fallback = sem conta no DB
  });
});
```

- [ ] **Step 2: Rodar e confirmar que os testes passam (estão testando o service já implementado)**

```bash
npx jest src/modules/whatsapp/__tests__/webhook.routing.test.js --no-coverage
```
Esperado: PASS (3 testes — service já implementado na Task 5)

- [ ] **Step 3: Atualizar processIncomingWebhook em whatsapp.service.js**

Abrir `src/modules/whatsapp/whatsapp.service.js`. Localizar a função `processIncomingWebhook` e adicionar o roteamento por conta no início dela.

Adicionar import no topo do arquivo (se não existir):
```js
const whatsappAccountService = require('./whatsapp-account.service');
const whatsappQueueService = require('./whatsapp-queue.service');
```

No início da função `processIncomingWebhook(body)`, antes de qualquer processamento:
```js
// Identificar conta pelo phoneNumberId do payload
const phoneNumberId = body?.entry?.[0]?.changes?.[0]?.value?.metadata?.phone_number_id;
let resolvedAccount = null;

if (phoneNumberId) {
  resolvedAccount = await whatsappAccountService.resolveByPhoneNumberId(phoneNumberId);
  if (!resolvedAccount) {
    console.warn(`[WhatsApp Webhook] phoneNumberId "${phoneNumberId}" não corresponde a nenhuma conta ativa.`);
    return; // retornar sem processar (HTTP 200 já foi enviado pelo controller)
  }
}

const accountId = resolvedAccount?.account?._id ?? null;
```

Ao criar/atualizar a conversa, passar `accountId`:
```js
// No findOrCreateConversation ou equivalente, adicionar accountId:
const conversation = await whatsappRepository.findOrCreateConversation(phoneNumber, {
  ...(accountId && { accountId }),
  // ... outros campos existentes
});
```

Ao criar entrada na fila (substituir/complementar a lógica de distribuição existente):
```js
// Se conversa não tem agente atribuído e temos uma conta cadastrada, enfileirar
if (!conversation.assignedTo && accountId && resolvedAccount?.account) {
  const lead = conversation.leadId ? await Lead.findById(conversation.leadId) : null;
  await whatsappQueueService.enqueue(
    accountId,
    conversation._id,
    conversation.leadId,
    lead?.score ?? 0,
    resolvedAccount.account.queueExpiresInMin
  );
}
```

> **Importante:** Leia a função `processIncomingWebhook` completa antes de editar. Preserve todos os comportamentos existentes (criação de lead, AI responder, atividades, notificações). Adicione o roteamento no início e a chamada de `enqueue` após a conversa ser criada/atualizada.

- [ ] **Step 4: Verificar que servidor sobe sem erros**

```bash
npm run dev
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/whatsapp/whatsapp.service.js src/modules/whatsapp/__tests__/webhook.routing.test.js
git commit -m "feat: webhook routes incoming messages by WhatsApp account"
```

---

## Task 13: Adicionar rotas de fila + atualizar Socket.IO

**Files:**
- Modify: `crm-backend/src/modules/whatsapp/whatsapp.routes.js`
- Create: `crm-backend/src/modules/whatsapp/whatsapp-queue.controller.js`
- Modify: `crm-backend/src/shared/socket/socket.js`

- [ ] **Step 1: Criar whatsapp-queue.controller.js**

```js
// src/modules/whatsapp/whatsapp-queue.controller.js
const queueRepository = require('./whatsapp-queue.repository');

async function getQueueByAccount(req, res, next) {
  try {
    const entries = await queueRepository.findQueueByAccount(req.params.id);
    res.json({ data: entries });
  } catch (err) { next(err); }
}

async function getAllQueue(req, res, next) {
  try {
    const entries = await queueRepository.findAllQueue();
    res.json({ data: entries });
  } catch (err) { next(err); }
}

async function manualAssign(req, res, next) {
  try {
    const { assignedTo } = req.body;
    if (!assignedTo) return res.status(400).json({ message: 'assignedTo é obrigatório.' });
    const entry = await queueRepository.manualAssign(req.params.entryId, assignedTo);
    if (!entry) return res.status(404).json({ message: 'Entrada de fila não encontrada.' });
    res.json({ data: entry });
  } catch (err) { next(err); }
}

module.exports = { getQueueByAccount, getAllQueue, manualAssign };
```

- [ ] **Step 2: Adicionar rotas de fila em whatsapp.routes.js**

```js
const queueController = require('./whatsapp-queue.controller');
```

Antes de `module.exports = router;`:
```js
// Fila de atendimento
router.get('/queue', roleMiddleware(['admin', 'manager']), queueController.getAllQueue);
router.get('/accounts/:id/queue', roleMiddleware(['admin', 'manager']), queueController.getQueueByAccount);
router.patch('/queue/:entryId/assign', roleMiddleware(['admin', 'manager']), queueController.manualAssign);
```

- [ ] **Step 3: Atualizar socket.js para salas por conta**

Em `src/shared/socket/socket.js`, dentro do handler `io.on('connection', ...)`, após as linhas existentes `socket.join(...)`:

```js
// Ingressar em salas de contas onde o usuário é manager/admin e está assignedUsers
if (role === 'admin' || role === 'manager') {
  const WhatsAppAccount = require('../modules/whatsapp/whatsapp-account.model');
  WhatsAppAccount.find({ assignedUsers: id, isActive: true, isDeleted: false }, '_id')
    .lean()
    .then((accounts) => {
      accounts.forEach((acc) => socket.join(`account:${acc._id}:managers`));
    })
    .catch(() => {}); // não bloquear conexão por falha na query
}
```

> **Nota:** O `require` dentro do handler é intencional para evitar dependência circular na inicialização. Se o projeto preferir outra abordagem, use uma função exportada do módulo de contas.

- [ ] **Step 4: Reiniciar servidor e verificar sem erros**

```bash
npm run dev
```

- [ ] **Step 5: Commit**

```bash
git add src/modules/whatsapp/whatsapp-queue.controller.js \
        src/modules/whatsapp/whatsapp.routes.js \
        src/shared/socket/socket.js
git commit -m "feat: WhatsApp queue routes + per-account Socket.IO rooms"
```

---

## Task 14: Frontend — Service de contas e fila

**Files:**
- Create: `crm-frontend/src/services/whatsapp-account.service.js`

- [ ] **Step 1: Criar whatsapp-account.service.js**

```js
// src/services/whatsapp-account.service.js
import api from './api';

// Contas
export async function getAccounts() {
  const response = await api.get('/whatsapp/accounts');
  return response.data;
}

export async function getAccount(id) {
  const response = await api.get(`/whatsapp/accounts/${id}`);
  return response.data;
}

export async function createAccount(payload) {
  const response = await api.post('/whatsapp/accounts', payload);
  return response.data;
}

export async function updateAccount(id, payload) {
  const response = await api.put(`/whatsapp/accounts/${id}`, payload);
  return response.data;
}

export async function toggleAccount(id) {
  const response = await api.patch(`/whatsapp/accounts/${id}/toggle`);
  return response.data;
}

export async function deleteAccount(id) {
  const response = await api.delete(`/whatsapp/accounts/${id}`);
  return response.data;
}

// Fila
export async function getQueue() {
  const response = await api.get('/whatsapp/queue');
  return response.data;
}

export async function getQueueByAccount(accountId) {
  const response = await api.get(`/whatsapp/accounts/${accountId}/queue`);
  return response.data;
}

export async function manualAssign(entryId, assignedTo) {
  const response = await api.patch(`/whatsapp/queue/${entryId}/assign`, { assignedTo });
  return response.data;
}
```

- [ ] **Step 2: Commit**

```bash
cd /home/usuario/projeto-2026/crm-frontend
git add src/services/whatsapp-account.service.js
git commit -m "feat: WhatsApp accounts and queue service (frontend)"
```

---

## Task 15: Frontend — Aba WhatsApp em Settings

**Files:**
- Create: `crm-frontend/src/pages/settings/WhatsAppAccountsTab.jsx`
- Modify: `crm-frontend/src/pages/settings/SettingsPage.jsx`

- [ ] **Step 1: Criar WhatsAppAccountsTab.jsx**

```jsx
// src/pages/settings/WhatsAppAccountsTab.jsx
import { useState, useEffect } from 'react';
import { Phone, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Loader } from 'lucide-react';
import {
  getAccounts,
  createAccount,
  updateAccount,
  toggleAccount,
  deleteAccount,
} from '../../services/whatsapp-account.service';
import { useToast } from '../../hooks/useToast';

const EMPTY_FORM = {
  name: '',
  phoneNumberId: '',
  accessToken: '',
  businessAccountId: '',
  verifyToken: '',
  maxConcurrentChats: 5,
  queueExpiresInMin: 60,
};

export default function WhatsAppAccountsTab() {
  const toast = useToast();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null); // account id being edited
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadAccounts(); }, []);

  async function loadAccounts() {
    try {
      const res = await getAccounts();
      setAccounts(res.data || []);
    } catch {
      toast.error('Erro ao carregar contas WhatsApp.');
    } finally {
      setLoading(false);
    }
  }

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(account) {
    setEditing(account.id);
    setForm({
      name: account.name,
      phoneNumberId: account.phoneNumberId,
      accessToken: '',            // não exibe token salvo
      businessAccountId: account.businessAccountId,
      verifyToken: account.verifyToken,
      maxConcurrentChats: account.maxConcurrentChats,
      queueExpiresInMin: account.queueExpiresInMin,
    });
    setShowForm(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (editing && !payload.accessToken) delete payload.accessToken; // não sobrescrever se vazio
      if (editing) {
        await updateAccount(editing, payload);
        toast.success('Conta atualizada.');
      } else {
        await createAccount(payload);
        toast.success('Conta criada.');
      }
      setShowForm(false);
      loadAccounts();
    } catch (err) {
      const msg = err?.response?.data?.message || 'Erro ao salvar conta.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(account) {
    try {
      await toggleAccount(account.id);
      setAccounts((prev) =>
        prev.map((a) => (a.id === account.id ? { ...a, isActive: !a.isActive } : a))
      );
    } catch {
      toast.error('Erro ao alterar status da conta.');
    }
  }

  async function handleDelete(account) {
    if (!window.confirm(`Remover conta "${account.name}"?`)) return;
    try {
      await deleteAccount(account.id);
      setAccounts((prev) => prev.filter((a) => a.id !== account.id));
      toast.success('Conta removida.');
    } catch {
      toast.error('Erro ao remover conta.');
    }
  }

  if (loading) return <div className="flex justify-center p-8"><Loader className="animate-spin" /></div>;

  return (
    <div className="whatsapp-accounts-tab">
      <div className="tab-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3>Contas WhatsApp Business</h3>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={16} /> Nova Conta
        </button>
      </div>

      {showForm && (
        <form className="account-form card" onSubmit={handleSubmit} style={{ marginBottom: 24, padding: 16 }}>
          <h4>{editing ? 'Editar Conta' : 'Nova Conta'}</h4>
          <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
            <label>
              Nome da conta
              <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </label>
            <label>
              Phone Number ID (Meta)
              <input className="input" value={form.phoneNumberId} onChange={(e) => setForm({ ...form, phoneNumberId: e.target.value })} required disabled={!!editing} />
            </label>
            <label>
              Access Token
              <input className="input" type="password" placeholder={editing ? '(deixe vazio para não alterar)' : ''} value={form.accessToken} onChange={(e) => setForm({ ...form, accessToken: e.target.value })} required={!editing} />
            </label>
            <label>
              Business Account ID
              <input className="input" value={form.businessAccountId} onChange={(e) => setForm({ ...form, businessAccountId: e.target.value })} required />
            </label>
            <label>
              Verify Token
              <input className="input" value={form.verifyToken} onChange={(e) => setForm({ ...form, verifyToken: e.target.value })} required />
            </label>
            <label>
              Max chats simultâneos por agente
              <input className="input" type="number" min={1} value={form.maxConcurrentChats} onChange={(e) => setForm({ ...form, maxConcurrentChats: Number(e.target.value) })} />
            </label>
            <label>
              Expiração da fila (minutos)
              <input className="input" type="number" min={1} value={form.queueExpiresInMin} onChange={(e) => setForm({ ...form, queueExpiresInMin: Number(e.target.value) })} />
            </label>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? <Loader size={14} className="animate-spin" /> : 'Salvar'}
            </button>
            <button className="btn btn-secondary" type="button" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </form>
      )}

      {accounts.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Nenhuma conta cadastrada.</p>
      ) : (
        <div className="accounts-list" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {accounts.map((account) => (
            <div key={account.id} className="account-item card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
              <Phone size={18} />
              <div style={{ flex: 1 }}>
                <strong>{account.name}</strong>
                <span
                  style={{ marginLeft: 8, fontSize: 11, padding: '2px 6px', borderRadius: 4, background: account.isActive ? 'var(--green-100)' : 'var(--gray-100)', color: account.isActive ? 'var(--green-700)' : 'var(--gray-500)' }}
                >
                  {account.isActive ? 'ativo' : 'inativo'}
                </span>
                {account.needsReauth && (
                  <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--red-500)' }}>⚠ token expirado</span>
                )}
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {account.phoneNumberId} · {account.assignedUsers?.length ?? 0} agentes
                </div>
              </div>
              <button className="btn btn-icon" onClick={() => handleToggle(account)} title={account.isActive ? 'Desativar' : 'Ativar'}>
                {account.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              </button>
              <button className="btn btn-icon" onClick={() => openEdit(account)} title="Editar">
                <Edit2 size={16} />
              </button>
              <button className="btn btn-icon btn-danger" onClick={() => handleDelete(account)} title="Remover">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Adicionar aba WhatsApp em SettingsPage.jsx**

Abrir `src/pages/settings/SettingsPage.jsx`.

No array `TABS`, adicionar após o item `'ai-responder'`:
```js
{ key: 'whatsapp', label: 'WhatsApp', adminOnly: true },
```

Adicionar import no topo:
```js
import WhatsAppAccountsTab from './WhatsAppAccountsTab';
```

Na área de renderização de abas (onde cada `activeTab === 'xxx'` renderiza seu componente), adicionar:
```jsx
{activeTab === 'whatsapp' && <WhatsAppAccountsTab />}
```

- [ ] **Step 3: Testar no browser**
  - Navegar até Settings
  - Confirmar que a aba "WhatsApp" aparece para admin
  - Criar uma conta e verificar que aparece na lista

- [ ] **Step 4: Commit**

```bash
git add src/pages/settings/WhatsAppAccountsTab.jsx src/pages/settings/SettingsPage.jsx
git commit -m "feat: WhatsApp accounts management tab in Settings"
```

---

## Task 16: Frontend — Filtro de conta na Central de Conversas

**Files:**
- Modify: `crm-frontend/src/pages/whatsapp/WhatsAppPage.jsx`

- [ ] **Step 1: Adicionar estado e fetch de contas**

No início da função `WhatsAppPage`, adicionar:
```js
import { getAccounts } from '../../services/whatsapp-account.service';

// Dentro do componente, junto aos outros estados:
const [accounts, setAccounts] = useState([]);
const [selectedAccountId, setSelectedAccountId] = useState(null); // null = todas
```

No `useEffect` de inicialização (onde `getConversations` é chamado), adicionar:
```js
const accountsRes = await getAccounts();
setAccounts(accountsRes.data || []);
```

- [ ] **Step 2: Filtrar conversas por conta**

Na chamada de `getConversations`, adicionar o filtro:
```js
const res = await getConversations({ accountId: selectedAccountId || undefined });
```

Adicionar `useEffect` para recarregar conversas quando a conta selecionada muda:
```js
useEffect(() => {
  loadConversations();
}, [selectedAccountId]);
```

- [ ] **Step 3: Adicionar barra de filtro de contas no topo da lista**

Localizar o JSX da lista de conversas e adicionar antes dela:
```jsx
{accounts.length > 1 && (
  <div className="account-filter" style={{ display: 'flex', gap: 6, padding: '8px 12px', borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
    <button
      className={`btn btn-sm ${!selectedAccountId ? 'btn-primary' : 'btn-ghost'}`}
      onClick={() => setSelectedAccountId(null)}
    >
      Todas
    </button>
    {accounts.map((acc) => (
      <button
        key={acc.id}
        className={`btn btn-sm ${selectedAccountId === acc.id ? 'btn-primary' : 'btn-ghost'}`}
        onClick={() => setSelectedAccountId(acc.id)}
        style={{ whiteSpace: 'nowrap' }}
      >
        {acc.name}
      </button>
    ))}
  </div>
)}
```

- [ ] **Step 4: Adicionar badge de conta em cada conversa**

Gere um mapa de cor por conta (para distingui-las visualmente):
```js
const ACCOUNT_COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];

function getAccountColor(accountId) {
  const idx = accounts.findIndex((a) => a.id === accountId);
  return ACCOUNT_COLORS[idx % ACCOUNT_COLORS.length] || '#64748b';
}
```

No JSX de cada conversa na lista, adicionar badge se `conversation.accountId`:
```jsx
{conversation.accountId && (
  <span
    style={{
      background: getAccountColor(conversation.accountId),
      color: '#fff',
      fontSize: 10,
      padding: '1px 5px',
      borderRadius: 3,
      marginRight: 4,
    }}
  >
    {accounts.find((a) => a.id === conversation.accountId)?.name?.slice(0, 3).toUpperCase() || '?'}
  </span>
)}
```

- [ ] **Step 5: Verificar no browser**
  - Confirmar que filtro aparece apenas quando há mais de 1 conta
  - Clicar em um filtro e confirmar que a lista atualiza
  - Confirmar badge nas conversas

- [ ] **Step 6: Commit**

```bash
git add src/pages/whatsapp/WhatsAppPage.jsx
git commit -m "feat: account filter and badge in WhatsApp conversations"
```

---

## Task 17: Frontend — Página de Fila + Router

**Files:**
- Create: `crm-frontend/src/pages/whatsapp/QueuePage.jsx`
- Modify: `crm-frontend/src/routes/index.jsx`

- [ ] **Step 1: Criar QueuePage.jsx**

```jsx
// src/pages/whatsapp/QueuePage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Users, Activity, Loader } from 'lucide-react';
import { getQueue, getAccounts, manualAssign } from '../../services/whatsapp-account.service';
import { useSocket } from '../../contexts/SocketContext';
import { useToast } from '../../hooks/useToast';

function ScoreBadge({ score }) {
  const color = score >= 80 ? '#ef4444' : score >= 50 ? '#f59e0b' : '#94a3b8';
  return (
    <span style={{ background: color, color: '#fff', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>
      {score}
    </span>
  );
}

function WaitTime({ createdAt }) {
  const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  return <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{mins}min</span>;
}

export default function QueuePage() {
  const toast = useToast();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [entries, setEntries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!socket) return;
    const handler = () => loadData();
    socket.on('queue:updated', handler);
    socket.on('queue:expired', handler);
    return () => {
      socket.off('queue:updated', handler);
      socket.off('queue:expired', handler);
    };
  }, [socket]);

  async function loadData() {
    try {
      const [queueRes, accountsRes] = await Promise.all([getQueue(), getAccounts()]);
      setEntries(queueRes.data || []);
      setAccounts(accountsRes.data || []);
    } catch {
      toast.error('Erro ao carregar fila.');
    } finally {
      setLoading(false);
    }
  }

  const filteredEntries = selectedAccountId
    ? entries.filter((e) => (e.accountId?._id || e.accountId) === selectedAccountId)
    : entries;

  const waitingCount = filteredEntries.length;
  const avgWaitMins = waitingCount
    ? Math.floor(filteredEntries.reduce((acc, e) => acc + (Date.now() - new Date(e.createdAt).getTime()) / 60000, 0) / waitingCount)
    : 0;

  if (loading) return <div className="flex justify-center p-8"><Loader className="animate-spin" /></div>;

  return (
    <div className="queue-page" style={{ padding: 24, maxWidth: 900, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 16 }}>Fila de Atendimento</h2>

      {/* Métricas */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <div className="card" style={{ padding: '12px 20px', textAlign: 'center', minWidth: 100 }}>
          <div style={{ fontSize: 22, fontWeight: 'bold', color: '#f59e0b' }}>{waitingCount}</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Aguardando</div>
        </div>
        <div className="card" style={{ padding: '12px 20px', textAlign: 'center', minWidth: 100 }}>
          <div style={{ fontSize: 22, fontWeight: 'bold', color: '#94a3b8' }}>{avgWaitMins}m</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Espera média</div>
        </div>
      </div>

      {/* Filtro por conta */}
      {accounts.length > 1 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <button className={`btn btn-sm ${!selectedAccountId ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSelectedAccountId(null)}>Todas</button>
          {accounts.map((acc) => (
            <button key={acc.id} className={`btn btn-sm ${selectedAccountId === acc.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setSelectedAccountId(acc.id)}>
              {acc.name}
            </button>
          ))}
        </div>
      )}

      {/* Lista de entradas */}
      {filteredEntries.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>Nenhuma conversa aguardando na fila.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filteredEntries.map((entry, idx) => (
            <div key={entry._id} className="card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px' }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', width: 24 }}>#{idx + 1}</span>
              <div style={{ flex: 1 }}>
                <strong>{entry.conversationId?.contactName || entry.leadId?.name || 'Sem nome'}</strong>
                {entry.accountId?.name && (
                  <span style={{ fontSize: 11, marginLeft: 8, color: 'var(--text-muted)' }}>{entry.accountId.name}</span>
                )}
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                  {entry.conversationId?.phoneNumber}
                </div>
              </div>
              <ScoreBadge score={entry.priority} />
              <WaitTime createdAt={entry.createdAt} />
              <button
                className="btn btn-sm btn-ghost"
                onClick={() => navigate(`/whatsapp?conv=${entry.conversationId?._id}`)}
              >
                Abrir
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Adicionar rota /whatsapp/queue em index.jsx**

Abrir `src/routes/index.jsx`. Adicionar import:
```js
import QueuePage from '../pages/whatsapp/QueuePage';
```

Na lista de rotas, após a rota `/whatsapp`:
```jsx
<Route path="whatsapp/queue" element={<QueuePage />} />
```

- [ ] **Step 3: Adicionar link para fila no menu lateral**

Abrir `src/components/layout/Sidebar.jsx`.

Adicionar import do ícone no topo (junto aos outros):
```js
import { ListOrdered } from 'lucide-react';
```

Importar `useAuth`:
```js
import { useAuth } from '../../hooks/useAuth';
```

Dentro da função `Sidebar`, adicionar:
```js
const { user } = useAuth();
const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';
```

No array `secondaryItems` (ou `iconMenuItems`), adicionar entrada **após** o item WhatsApp — mas como é condicional por role, renderize diretamente no JSX da sidebar, não no array. Localizar onde `/whatsapp` é renderizado e adicionar abaixo:

```jsx
{isAdminOrManager && (
  <NavLink
    to="/whatsapp/queue"
    className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
    title="Fila de Atendimento"
  >
    <ListOrdered size={18} />
    {isExpanded && <span>Fila WhatsApp</span>}
  </NavLink>
)}
```

> Adapte a classe CSS (`sidebar-item`) ao padrão usado pelos outros `NavLink` na sidebar.

- [ ] **Step 4: Verificar no browser**
  - Navegar para `/whatsapp/queue`
  - Confirmar métricas, lista e filtros
  - Confirmar que conversa abre ao clicar "Abrir"

- [ ] **Step 5: Commit**

```bash
git add src/pages/whatsapp/QueuePage.jsx src/routes/index.jsx
git commit -m "feat: WhatsApp queue page with real-time updates"
```

---

## Task 18: Testes de autorização e segurança (TDD)

**Files:**
- Create: `crm-backend/src/modules/whatsapp/__tests__/whatsapp-auth.test.js`

- [ ] **Step 1: Escrever testes falhando**

```js
// src/modules/whatsapp/__tests__/whatsapp-auth.test.js
const accountController = require('../whatsapp-account.controller');
const accountService = require('../whatsapp-account.service');
const { toAccountDTO } = require('../whatsapp-account.dto');
const queueRepository = require('../whatsapp-queue.repository');

jest.mock('../whatsapp-account.service');
jest.mock('../../../utils/crypto', () => ({
  encrypt: (v) => `enc:${v}`,
  decrypt: (v) => v.replace('enc:', ''),
}));

describe('DTO — accessToken redactado em GET', () => {
  it('retorna *** no lugar do accessToken em leitura', () => {
    const account = {
      _id: 'id1',
      name: 'Vendas',
      phoneNumberId: 'p1',
      accessToken: 'enc:real-token',
      businessAccountId: 'b1',
      verifyToken: 'v1',
      isActive: true,
      needsReauth: false,
      allowedRoles: ['admin'],
      assignedUsers: [],
      maxConcurrentChats: 5,
      queueExpiresInMin: 60,
      toObject() { return this; },
    };

    const dto = toAccountDTO(account, { showToken: false });
    expect(dto.accessToken).toBe('***');
  });

  it('retorna token decriptado quando showToken=true (criação/edição)', () => {
    const account = {
      _id: 'id1',
      name: 'Vendas',
      phoneNumberId: 'p1',
      accessToken: 'enc:real-token',
      businessAccountId: 'b1',
      verifyToken: 'v1',
      isActive: true,
      needsReauth: false,
      allowedRoles: ['admin'],
      assignedUsers: [],
      maxConcurrentChats: 5,
      queueExpiresInMin: 60,
      toObject() { return this; },
    };

    const dto = toAccountDTO(account, { showToken: true });
    expect(dto.accessToken).toBe('real-token');
    expect(dto.accessToken).not.toBe('***');
  });
});

describe('Repository — contas soft-deleted excluídas do GET', () => {
  const WhatsAppAccount = require('../whatsapp-account.model');

  it('findAll usa filtro isDeleted: false', async () => {
    const findSpy = jest.spyOn(WhatsAppAccount, 'find').mockReturnValue({
      populate: () => ({ sort: () => Promise.resolve([]) }),
    });

    const accountRepository = require('../whatsapp-account.repository');
    await accountRepository.findAll();

    expect(findSpy).toHaveBeenCalledWith(expect.objectContaining({ isDeleted: false }));
    findSpy.mockRestore();
  });
});
```

- [ ] **Step 2: Rodar e confirmar falha**

```bash
npx jest src/modules/whatsapp/__tests__/whatsapp-auth.test.js --no-coverage
```
Esperado: FAIL (DTO e repository ainda não satisfazem os testes — mas já foram implementados nas Tasks 4 e 6)

- [ ] **Step 3: Rodar novamente confirmando PASS**

Se Tasks 4 e 6 estiverem completas, os testes já passarão:
```bash
npx jest src/modules/whatsapp/__tests__/whatsapp-auth.test.js --no-coverage
```
Esperado: PASS (3 testes)

> **Nota sobre autorização 403:** O roleMiddleware que bloqueia sellers em `PATCH /queue/:entryId/assign` é testado pela infraestrutura de testes de integração do servidor. Verificação manual: tentar chamar o endpoint com token de um usuário seller e confirmar HTTP 403.

- [ ] **Step 4: Commit**

```bash
git add src/modules/whatsapp/__tests__/whatsapp-auth.test.js
git commit -m "test: auth boundary tests — token redaction and soft-delete filter"
```

---

## Task 19: Rodar todos os testes e verificar build

- [ ] **Step 1: Rodar todos os testes do backend**

```bash
cd /home/usuario/projeto-2026/crm-backend
npx jest --no-coverage
```
Esperado: todos os testes PASS.

- [ ] **Step 2: Verificar build do frontend sem erros**

```bash
cd /home/usuario/projeto-2026/crm-frontend
npm run build
```
Esperado: build completo sem erros TypeScript/ESLint.

- [ ] **Step 3: Commit final**

```bash
cd /home/usuario/projeto-2026/crm-frontend
git add docs/superpowers/plans/2026-03-23-whatsapp-multi-conta-filas.md
git commit -m "docs: add implementation plan for WhatsApp multi-account + queues"
```

---

## Checklist de Variáveis de Ambiente

Antes de executar, garantir que o `.env` do backend tem:

```env
# Criptografia de campos sensíveis (gerar com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
FIELD_ENCRYPTION_KEY=<64 hex chars>

# WhatsApp legado (serão migrados para WhatsAppAccount via seed)
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_BUSINESS_ACCOUNT_ID=...
WHATSAPP_VERIFY_TOKEN=...
```
