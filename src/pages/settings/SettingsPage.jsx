import { useEffect, useMemo, useState } from 'react';
import { usePushNotification } from '../../contexts/PushNotificationContext';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/http';
import {
  getProfile,
  updateProfile,
  changePassword,
  getUsers,
  createUser,
  updateUser
} from '../../services/user.service';
import {
  getPipelines,
  createPipeline,
  updatePipeline,
  removePipeline,
  getStages,
  createStage,
  updateStage,
  removeStage
} from '../../services/pipeline.service';
import {
  getRules,
  createRule,
  updateRule as updateScoringRule,
  deleteRule,
  recalculateAll
} from '../../services/scoring.service';
import {
  getConfig as getDistributionConfig,
  updateConfig as updateDistributionConfig,
  addToPool,
  removeFromPool
} from '../../services/distribution.service';
import {
  getCadenceConfig,
  updateCadenceConfig
} from '../../services/cadence.service';
import {
  getAiResponderConfig,
  updateAiResponderConfig
} from '../../services/ai-responder.service';
import {
  getAuthUrl as getGoogleAuthUrl,
  getConnectionStatus as getGoogleStatus,
  disconnectGoogle
} from '../../services/google-calendar.service';
import PageLoader from '../../components/common/PageLoader';

const TABS = [
  { key: 'profile', label: 'Perfil' },
  { key: 'security', label: 'Segurança' },
  { key: 'users', label: 'Usuários', adminOnly: true },
  { key: 'pipeline', label: 'Pipeline', adminOnly: true },
  { key: 'scoring', label: 'Scoring', adminOnly: true },
  { key: 'distribution', label: 'Distribuição', adminOnly: true },
  { key: 'cadence', label: 'Cadência', adminOnly: true },
  { key: 'ai-responder', label: 'AI Atendente', adminOnly: true },
  { key: 'preferences', label: 'Preferências' }
];

const ROLE_LABELS = {
  admin: 'Admin',
  manager: 'Gerente',
  seller: 'Vendedor'
};

function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('profile');

  const isAdminOrManager = user?.role === 'admin' || user?.role === 'manager';
  const visibleTabs = useMemo(
    () => TABS.filter((t) => !t.adminOnly || isAdminOrManager),
    [isAdminOrManager]
  );

  return (
    <div className="settings-container">
      <div className="page-title-row">
        <div>
          <h1>Configurações</h1>
          <p className="page-subtitle">Gerencie seu perfil e preferências</p>
        </div>
      </div>

      <div className="settings-tabs">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            className={`settings-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="settings-panel">
        {activeTab === 'profile' && <ProfilePanel toast={toast} refreshUser={refreshUser} />}
        {activeTab === 'security' && <SecurityPanel toast={toast} />}
        {activeTab === 'users' && isAdminOrManager && (
          <UsersPanel toast={toast} currentUser={user} />
        )}
        {activeTab === 'pipeline' && isAdminOrManager && (
          <PipelinePanel toast={toast} />
        )}
        {activeTab === 'scoring' && isAdminOrManager && (
          <ScoringPanel toast={toast} />
        )}
        {activeTab === 'distribution' && isAdminOrManager && (
          <DistributionPanel toast={toast} />
        )}
        {activeTab === 'cadence' && isAdminOrManager && (
          <CadencePanel toast={toast} />
        )}
        {activeTab === 'ai-responder' && isAdminOrManager && (
          <AiResponderPanel toast={toast} />
        )}
        {activeTab === 'preferences' && <PreferencesPanel />}
      </div>
    </div>
  );
}

// --- Profile Panel ---
function ProfilePanel({ toast, refreshUser }) {
  const [form, setForm] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    try {
      const data = await getProfile();
      setForm({ name: data.name || '', email: data.email || '' });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao carregar perfil.'));
    } finally {
      setLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Informe o nome.');
      return;
    }
    if (!form.email.trim()) {
      toast.error('Informe o e-mail.');
      return;
    }

    try {
      setSaving(true);
      await updateProfile({ name: form.name.trim(), email: form.email.trim() });
      if (refreshUser) await refreshUser();
      toast.success('Perfil atualizado com sucesso.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao atualizar perfil.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader text="Carregando perfil..." />;

  return (
    <form className="settings-form" onSubmit={handleSubmit}>
      <div className="settings-form-group">
        <label>Nome</label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Seu nome"
        />
      </div>
      <div className="settings-form-group">
        <label>E-mail</label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          placeholder="seu@email.com"
        />
      </div>
      <div className="settings-form-actions">
        <button type="submit" className="primary-button" disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </form>
  );
}

// --- Security Panel ---
function SecurityPanel({ toast }) {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.currentPassword) {
      toast.error('Informe a senha atual.');
      return;
    }
    if (!form.newPassword || form.newPassword.length < 6) {
      toast.error('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      toast.error('As senhas não conferem.');
      return;
    }

    try {
      setSaving(true);
      await changePassword({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Senha alterada com sucesso.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao alterar senha.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="settings-form" onSubmit={handleSubmit}>
      <div className="settings-form-group">
        <label>Senha Atual</label>
        <input
          type="password"
          name="currentPassword"
          value={form.currentPassword}
          onChange={handleChange}
          placeholder="Digite a senha atual"
        />
      </div>
      <div className="settings-form-group">
        <label>Nova Senha</label>
        <input
          type="password"
          name="newPassword"
          value={form.newPassword}
          onChange={handleChange}
          placeholder="Mínimo 6 caracteres"
        />
      </div>
      <div className="settings-form-group">
        <label>Confirmar Nova Senha</label>
        <input
          type="password"
          name="confirmPassword"
          value={form.confirmPassword}
          onChange={handleChange}
          placeholder="Repita a nova senha"
        />
      </div>
      <div className="settings-form-actions">
        <button type="submit" className="primary-button" disabled={saving}>
          {saving ? 'Alterando...' : 'Alterar Senha'}
        </button>
      </div>
    </form>
  );
}

// --- Users Panel ---
function UsersPanel({ toast, currentUser }) {
  const [users, setUsers] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'seller'
  });
  const [creatingUser, setCreatingUser] = useState(false);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers(params = {}) {
    try {
      setLoading(true);
      const data = await getUsers(params);
      setUsers(data.data || []);
      setMeta(data.meta || null);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao carregar usuários.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleActive(userId, currentActive) {
    try {
      await updateUser(userId, { active: !currentActive });
      toast.success(currentActive ? 'Usuário desativado.' : 'Usuário ativado.');
      loadUsers(search ? { search } : {});
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao atualizar status.'));
    }
  }

  async function handleRoleChange(userId, newRole) {
    try {
      await updateUser(userId, { role: newRole });
      toast.success('Papel atualizado com sucesso.');
      loadUsers(search ? { search } : {});
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao atualizar papel.'));
    }
  }

  async function handleCreateUser(e) {
    e.preventDefault();
    if (!newUserForm.name.trim() || !newUserForm.email.trim() || !newUserForm.password) {
      toast.error('Preencha todos os campos obrigatórios.');
      return;
    }
    if (newUserForm.password.length < 6) {
      toast.error('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    try {
      setCreatingUser(true);
      await createUser(newUserForm);
      toast.success('Usuário criado com sucesso.');
      setShowModal(false);
      setNewUserForm({ name: '', email: '', password: '', role: 'seller' });
      loadUsers(search ? { search } : {});
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao criar usuário.'));
    } finally {
      setCreatingUser(false);
    }
  }

  function handleSearch(e) {
    e.preventDefault();
    loadUsers(search ? { search } : {});
  }

  if (loading) return <PageLoader text="Carregando usuários..." />;

  return (
    <div>
      <div className="settings-users-header">
        <form className="settings-search-form" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="secondary-button">Buscar</button>
        </form>
        {currentUser?.role === 'admin' && (
          <button className="primary-button" onClick={() => setShowModal(true)}>
            Novo Usuário
          </button>
        )}
      </div>

      <div className="table-card">
        <table className="crm-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>E-mail</th>
              <th>Papel</th>
              <th>Status</th>
              {currentUser?.role === 'admin' && <th>Ações</th>}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={currentUser?.role === 'admin' ? 5 : 4} style={{ textAlign: 'center' }}>
                  Nenhum usuário encontrado.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong></td>
                  <td>{u.email}</td>
                  <td>
                    {currentUser?.role === 'admin' && u.id !== currentUser.id ? (
                      <select
                        className="user-role-select"
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Gerente</option>
                        <option value="seller">Vendedor</option>
                      </select>
                    ) : (
                      <span className={`user-role-badge role-${u.role}`}>
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`user-status-badge ${u.active ? 'active' : 'inactive'}`}>
                      {u.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  {currentUser?.role === 'admin' && (
                    <td>
                      {u.id !== currentUser.id && (
                        <button
                          className={`user-status-toggle ${u.active ? 'deactivate' : 'activate'}`}
                          onClick={() => handleToggleActive(u.id, u.active)}
                        >
                          {u.active ? 'Desativar' : 'Ativar'}
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="settings-pagination">
          {Array.from({ length: meta.totalPages }, (_, i) => (
            <button
              key={i + 1}
              className={`pagination-btn ${meta.page === i + 1 ? 'active' : ''}`}
              onClick={() => loadUsers({ page: i + 1, search: search || undefined })}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Novo Usuário</h2>
            <form className="settings-form" onSubmit={handleCreateUser}>
              <div className="settings-form-group">
                <label>Nome *</label>
                <input
                  type="text"
                  value={newUserForm.name}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="Nome do usuário"
                />
              </div>
              <div className="settings-form-group">
                <label>E-mail *</label>
                <input
                  type="email"
                  value={newUserForm.email}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="email@exemplo.com"
                />
              </div>
              <div className="settings-form-group">
                <label>Senha *</label>
                <input
                  type="password"
                  value={newUserForm.password}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({ ...prev, password: e.target.value }))
                  }
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="settings-form-group">
                <label>Papel</label>
                <select
                  value={newUserForm.role}
                  onChange={(e) =>
                    setNewUserForm((prev) => ({ ...prev, role: e.target.value }))
                  }
                >
                  <option value="seller">Vendedor</option>
                  <option value="manager">Gerente</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="settings-form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowModal(false)}
                  disabled={creatingUser}
                >
                  Cancelar
                </button>
                <button type="submit" className="primary-button" disabled={creatingUser}>
                  {creatingUser ? 'Criando...' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Pipeline Panel ---
function PipelinePanel({ toast }) {
  const [pipelines, setPipelines] = useState([]);
  const [stages, setStages] = useState([]);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [showStageModal, setShowStageModal] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [pipelineForm, setPipelineForm] = useState({ name: '', code: '', description: '' });
  const [stageForm, setStageForm] = useState({
    name: '', code: '', description: '', order: '', color: '', isFinal: false, finalType: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadPipelines();
  }, []);

  useEffect(() => {
    if (selectedPipeline) {
      loadStages(selectedPipeline._id);
    }
  }, [selectedPipeline]);

  async function loadPipelines() {
    try {
      setLoading(true);
      const data = await getPipelines();
      setPipelines(data);
      if (data.length > 0 && !selectedPipeline) {
        setSelectedPipeline(data[0]);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao carregar pipelines.'));
    } finally {
      setLoading(false);
    }
  }

  async function loadStages(pipelineId) {
    try {
      const data = await getStages(pipelineId);
      setStages(data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao carregar estágios.'));
    }
  }

  async function handleCreatePipeline(e) {
    e.preventDefault();
    if (!pipelineForm.name.trim() || !pipelineForm.code.trim()) {
      toast.error('Nome e código são obrigatórios.');
      return;
    }
    try {
      setSaving(true);
      const created = await createPipeline({
        name: pipelineForm.name.trim(),
        code: pipelineForm.code.trim(),
        description: pipelineForm.description.trim() || undefined
      });
      toast.success('Pipeline criado com sucesso.');
      setShowPipelineModal(false);
      setPipelineForm({ name: '', code: '', description: '' });
      await loadPipelines();
      setSelectedPipeline(created);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao criar pipeline.'));
    } finally {
      setSaving(false);
    }
  }

  function handleDeletePipeline() {
    if (!selectedPipeline) return;
    toast.undoable(`Pipeline "${selectedPipeline.name}" será removido.`, async () => {
      try {
        await removePipeline(selectedPipeline._id);
        toast.success('Pipeline removido.');
        setSelectedPipeline(null);
        setStages([]);
        await loadPipelines();
      } catch (err) {
        toast.error(getErrorMessage(err, 'Erro ao remover pipeline.'));
      }
    });
  }

  function openStageModal(stage = null) {
    if (stage) {
      setEditingStage(stage);
      setStageForm({
        name: stage.name,
        code: stage.code,
        description: stage.description || '',
        order: String(stage.order),
        color: stage.color || '',
        isFinal: stage.isFinal || false,
        finalType: stage.finalType || ''
      });
    } else {
      setEditingStage(null);
      setStageForm({
        name: '', code: '', description: '',
        order: String(stages.length + 1),
        color: '', isFinal: false, finalType: ''
      });
    }
    setShowStageModal(true);
  }

  async function handleSaveStage(e) {
    e.preventDefault();
    if (!stageForm.name.trim() || !stageForm.code.trim() || !stageForm.order) {
      toast.error('Nome, código e ordem são obrigatórios.');
      return;
    }
    const payload = {
      name: stageForm.name.trim(),
      code: stageForm.code.trim(),
      description: stageForm.description.trim() || undefined,
      order: parseInt(stageForm.order, 10),
      color: stageForm.color.trim() || undefined,
      isFinal: stageForm.isFinal,
      finalType: stageForm.isFinal ? (stageForm.finalType || null) : null
    };

    try {
      setSaving(true);
      if (editingStage) {
        const { code, ...updatePayload } = payload;
        await updateStage(selectedPipeline._id, editingStage._id, updatePayload);
        toast.success('Estágio atualizado.');
      } else {
        await createStage(selectedPipeline._id, payload);
        toast.success('Estágio criado.');
      }
      setShowStageModal(false);
      await loadStages(selectedPipeline._id);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao salvar estágio.'));
    } finally {
      setSaving(false);
    }
  }

  function handleDeleteStage(stageId) {
    toast.undoable('Estágio será removido.', async () => {
      try {
        await removeStage(selectedPipeline._id, stageId);
        toast.success('Estágio removido.');
        await loadStages(selectedPipeline._id);
      } catch (err) {
        toast.error(getErrorMessage(err, 'Erro ao remover estágio.'));
      }
    });
  }

  if (loading) return <PageLoader text="Carregando pipelines..." />;

  return (
    <div>
      <div className="pipeline-header-row">
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {pipelines.length > 0 && (
            <select
              className="pipeline-select"
              value={selectedPipeline?._id || ''}
              onChange={(e) => {
                const p = pipelines.find((pl) => pl._id === e.target.value);
                setSelectedPipeline(p || null);
              }}
            >
              {pipelines.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name} {p.isDefault ? '(Padrão)' : ''}
                </option>
              ))}
            </select>
          )}
          {selectedPipeline && !selectedPipeline.isDefault && (
            <button className="secondary-button" onClick={handleDeletePipeline}>
              Excluir
            </button>
          )}
        </div>
        <button className="primary-button" onClick={() => setShowPipelineModal(true)}>
          Novo Pipeline
        </button>
      </div>

      {selectedPipeline ? (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ margin: 0 }}>Estágios</h3>
            <button className="primary-button" onClick={() => openStageModal()}>
              Novo Estágio
            </button>
          </div>

          {stages.length === 0 ? (
            <p className="muted-text">Nenhum estágio cadastrado neste pipeline.</p>
          ) : (
            <div className="pipeline-stages-list">
              {stages.map((stage) => (
                <div key={stage._id} className="pipeline-stage-row">
                  <span className="pipeline-stage-order">{stage.order}</span>
                  <span
                    className="pipeline-stage-color"
                    style={{ background: stage.color || '#6b7280' }}
                  />
                  <div className="pipeline-stage-info">
                    <div className="pipeline-stage-name">{stage.name}</div>
                    <div className="pipeline-stage-code">{stage.code}</div>
                  </div>
                  <div className="pipeline-stage-badges">
                    {stage.isFinal && stage.finalType === 'won' && (
                      <span className="pipeline-stage-badge final-won">Ganho</span>
                    )}
                    {stage.isFinal && stage.finalType === 'lost' && (
                      <span className="pipeline-stage-badge final-lost">Perdido</span>
                    )}
                  </div>
                  <div className="pipeline-stage-actions">
                    <button className="secondary-button" onClick={() => openStageModal(stage)}>
                      Editar
                    </button>
                    <button className="secondary-button" onClick={() => handleDeleteStage(stage._id)}>
                      Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <p className="muted-text">Crie um pipeline para começar a configurar estágios.</p>
      )}

      {/* Modal: Novo Pipeline */}
      {showPipelineModal && (
        <div className="modal-overlay" onClick={() => setShowPipelineModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Novo Pipeline</h2>
            <form className="settings-form" onSubmit={handleCreatePipeline}>
              <div className="settings-form-group">
                <label>Nome *</label>
                <input
                  type="text"
                  value={pipelineForm.name}
                  onChange={(e) => setPipelineForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Pipeline Comercial"
                />
              </div>
              <div className="settings-form-group">
                <label>Código *</label>
                <input
                  type="text"
                  value={pipelineForm.code}
                  onChange={(e) => setPipelineForm((p) => ({ ...p, code: e.target.value }))}
                  placeholder="Ex: comercial"
                />
                <small>Identificador único, em minúsculo.</small>
              </div>
              <div className="settings-form-group">
                <label>Descrição</label>
                <input
                  type="text"
                  value={pipelineForm.description}
                  onChange={(e) => setPipelineForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Descrição opcional"
                />
              </div>
              <div className="settings-form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowPipelineModal(false)}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? 'Criando...' : 'Criar Pipeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Novo/Editar Estágio */}
      {showStageModal && (
        <div className="modal-overlay" onClick={() => setShowStageModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingStage ? 'Editar Estágio' : 'Novo Estágio'}</h2>
            <form className="settings-form" onSubmit={handleSaveStage}>
              <div className="settings-form-group">
                <label>Nome *</label>
                <input
                  type="text"
                  value={stageForm.name}
                  onChange={(e) => setStageForm((s) => ({ ...s, name: e.target.value }))}
                  placeholder="Ex: Proposta"
                />
              </div>
              {!editingStage && (
                <div className="settings-form-group">
                  <label>Código *</label>
                  <input
                    type="text"
                    value={stageForm.code}
                    onChange={(e) => setStageForm((s) => ({ ...s, code: e.target.value }))}
                    placeholder="Ex: proposta"
                  />
                </div>
              )}
              <div className="settings-form-group">
                <label>Ordem *</label>
                <input
                  type="number"
                  min="1"
                  value={stageForm.order}
                  onChange={(e) => setStageForm((s) => ({ ...s, order: e.target.value }))}
                />
              </div>
              <div className="settings-form-group">
                <label>Cor</label>
                <input
                  type="color"
                  value={stageForm.color || '#6b7280'}
                  onChange={(e) => setStageForm((s) => ({ ...s, color: e.target.value }))}
                />
              </div>
              <div className="settings-form-group">
                <label>Descrição</label>
                <input
                  type="text"
                  value={stageForm.description}
                  onChange={(e) => setStageForm((s) => ({ ...s, description: e.target.value }))}
                  placeholder="Descrição opcional"
                />
              </div>
              <div className="settings-form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="checkbox"
                    checked={stageForm.isFinal}
                    onChange={(e) => setStageForm((s) => ({
                      ...s,
                      isFinal: e.target.checked,
                      finalType: e.target.checked ? s.finalType : ''
                    }))}
                  />
                  Estágio final
                </label>
              </div>
              {stageForm.isFinal && (
                <div className="settings-form-group">
                  <label>Tipo final</label>
                  <select
                    value={stageForm.finalType}
                    onChange={(e) => setStageForm((s) => ({ ...s, finalType: e.target.value }))}
                  >
                    <option value="">Nenhum</option>
                    <option value="won">Ganho</option>
                    <option value="lost">Perdido</option>
                  </select>
                </div>
              )}
              <div className="settings-form-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowStageModal(false)}
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? 'Salvando...' : (editingStage ? 'Salvar Alterações' : 'Criar Estágio')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Scoring Panel ---
function ScoringPanel({ toast }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [saving, setSaving] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [form, setForm] = useState({
    name: '', field: '', operator: 'not_empty', value: '', points: 0, isActive: true, order: 0
  });

  useEffect(() => {
    loadRules();
  }, []);

  async function loadRules() {
    try {
      setLoading(true);
      const data = await getRules();
      setRules(data.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao carregar regras de scoring.'));
    } finally {
      setLoading(false);
    }
  }

  function openModal(rule = null) {
    if (rule) {
      setEditingRule(rule);
      setForm({
        name: rule.name,
        field: rule.field,
        operator: rule.operator,
        value: rule.value || '',
        points: rule.points,
        isActive: rule.isActive,
        order: rule.order || 0
      });
    } else {
      setEditingRule(null);
      setForm({ name: '', field: '', operator: 'not_empty', value: '', points: 0, isActive: true, order: 0 });
    }
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.field.trim()) {
      toast.error('Nome e campo são obrigatórios.');
      return;
    }
    try {
      setSaving(true);
      if (editingRule) {
        await updateScoringRule(editingRule.id, form);
        toast.success('Regra atualizada.');
      } else {
        await createRule(form);
        toast.success('Regra criada.');
      }
      setShowModal(false);
      await loadRules();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao salvar regra.'));
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(ruleId) {
    toast.undoable('Regra de scoring será removida.', async () => {
      try {
        await deleteRule(ruleId);
        toast.success('Regra removida.');
        await loadRules();
      } catch (err) {
        toast.error(getErrorMessage(err, 'Erro ao remover regra.'));
      }
    });
  }

  async function handleRecalculate() {
    if (!window.confirm('Recalcular score de todos os leads? Isso pode levar alguns segundos.')) return;
    try {
      setRecalculating(true);
      const result = await recalculateAll();
      toast.success(`Scores recalculados: ${result.data?.updated || 0} leads atualizados.`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao recalcular scores.'));
    } finally {
      setRecalculating(false);
    }
  }

  async function handleToggleActive(rule) {
    try {
      await updateScoringRule(rule.id, { isActive: !rule.isActive });
      toast.success(rule.isActive ? 'Regra desativada.' : 'Regra ativada.');
      await loadRules();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao atualizar regra.'));
    }
  }

  if (loading) return <PageLoader text="Carregando regras de scoring..." />;

  const operatorLabels = { exists: 'Existe', equals: 'Igual a', contains: 'Contém', not_empty: 'Não vazio' };

  return (
    <div>
      <div className="settings-users-header">
        <h3 style={{ margin: 0 }}>Regras de Scoring</h3>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="secondary-button"
            onClick={handleRecalculate}
            disabled={recalculating}
          >
            {recalculating ? 'Recalculando...' : 'Recalcular Todos'}
          </button>
          <button className="primary-button" onClick={() => openModal()}>
            Nova Regra
          </button>
        </div>
      </div>

      <div className="table-card" style={{ marginTop: 16 }}>
        <table className="crm-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Campo</th>
              <th>Operador</th>
              <th>Valor</th>
              <th>Pontos</th>
              <th>Ativo</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {rules.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center' }}>Nenhuma regra cadastrada.</td>
              </tr>
            ) : (
              rules.map((rule) => (
                <tr key={rule.id}>
                  <td><strong>{rule.name}</strong></td>
                  <td>{rule.field}</td>
                  <td>{operatorLabels[rule.operator] || rule.operator}</td>
                  <td>{rule.value || '-'}</td>
                  <td>
                    <span style={{ color: rule.points >= 0 ? 'var(--accent-green)' : 'var(--accent-red)', fontWeight: 600 }}>
                      {rule.points > 0 ? '+' : ''}{rule.points}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`user-status-toggle ${rule.isActive ? 'deactivate' : 'activate'}`}
                      onClick={() => handleToggleActive(rule)}
                    >
                      {rule.isActive ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button className="secondary-button" onClick={() => openModal(rule)}>Editar</button>
                      <button className="secondary-button" onClick={() => handleDelete(rule.id)}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>{editingRule ? 'Editar Regra' : 'Nova Regra'}</h2>
            <form className="settings-form" onSubmit={handleSave} style={{ maxWidth: '100%' }}>
              <div className="settings-form-group">
                <label>Nome *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="Ex: Tem e-mail"
                />
              </div>
              <div className="settings-form-group">
                <label>Campo *</label>
                <select
                  value={form.field}
                  onChange={(e) => setForm((p) => ({ ...p, field: e.target.value }))}
                >
                  <option value="">Selecione...</option>
                  <option value="email">E-mail</option>
                  <option value="phone">Telefone</option>
                  <option value="company">Empresa</option>
                  <option value="source">Fonte</option>
                  <option value="name">Nome</option>
                </select>
              </div>
              <div className="settings-form-group">
                <label>Operador</label>
                <select
                  value={form.operator}
                  onChange={(e) => setForm((p) => ({ ...p, operator: e.target.value }))}
                >
                  <option value="not_empty">Não vazio</option>
                  <option value="exists">Existe</option>
                  <option value="equals">Igual a</option>
                  <option value="contains">Contém</option>
                </select>
              </div>
              {(form.operator === 'equals' || form.operator === 'contains') && (
                <div className="settings-form-group">
                  <label>Valor</label>
                  <input
                    type="text"
                    value={form.value}
                    onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
                    placeholder="Valor para comparar"
                  />
                </div>
              )}
              <div className="settings-form-group">
                <label>Pontos</label>
                <input
                  type="number"
                  value={form.points}
                  onChange={(e) => setForm((p) => ({ ...p, points: parseInt(e.target.value, 10) || 0 }))}
                />
              </div>
              <div className="settings-form-group">
                <label>Ordem</label>
                <input
                  type="number"
                  min="0"
                  value={form.order}
                  onChange={(e) => setForm((p) => ({ ...p, order: parseInt(e.target.value, 10) || 0 }))}
                />
              </div>
              <div className="settings-form-actions">
                <button type="button" className="secondary-button" onClick={() => setShowModal(false)} disabled={saving}>
                  Cancelar
                </button>
                <button type="submit" className="primary-button" disabled={saving}>
                  {saving ? 'Salvando...' : (editingRule ? 'Salvar Alterações' : 'Criar Regra')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// --- Distribution Panel ---
function DistributionPanel({ toast }) {
  const [config, setConfig] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [configData, usersData] = await Promise.all([
        getDistributionConfig(),
        getUsers({ limit: 100 })
      ]);
      setConfig(configData.data);
      setUsers((usersData.data || []).filter((u) => u.active));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao carregar configuração de distribuição.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleModeChange(newMode) {
    try {
      setSaving(true);
      const result = await updateDistributionConfig({ mode: newMode });
      setConfig(result.data);
      toast.success(`Modo alterado para ${newMode === 'round_robin' ? 'Round Robin' : 'Manual'}.`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao alterar modo.'));
    } finally {
      setSaving(false);
    }
  }

  async function handleTogglePool(userId) {
    const isInPool = config?.roundRobinState?.pool?.some((u) => u.id === userId);
    try {
      let result;
      if (isInPool) {
        result = await removeFromPool(userId);
      } else {
        result = await addToPool(userId);
      }
      setConfig(result.data);
      toast.success(isInPool ? 'Vendedor removido do pool.' : 'Vendedor adicionado ao pool.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao atualizar pool.'));
    }
  }

  if (loading) return <PageLoader text="Carregando configuração de distribuição..." />;

  const poolIds = (config?.roundRobinState?.pool || []).map((u) => u.id);
  const nextIndex = config?.roundRobinState?.lastAssignedIndex || 0;
  const activePool = (config?.roundRobinState?.pool || []).filter((u) => u.active);
  const nextUserId = activePool.length > 0 ? activePool[nextIndex % activePool.length]?.id : null;

  return (
    <div>
      <h3 style={{ margin: '0 0 16px 0' }}>Modo de Distribuição</h3>

      <div className="distribution-mode-toggle">
        <button
          className={`distribution-mode-btn ${config?.mode === 'manual' ? 'active' : ''}`}
          onClick={() => handleModeChange('manual')}
          disabled={saving}
        >
          Manual
        </button>
        <button
          className={`distribution-mode-btn ${config?.mode === 'round_robin' ? 'active' : ''}`}
          onClick={() => handleModeChange('round_robin')}
          disabled={saving}
        >
          Round Robin
        </button>
      </div>

      <p className="muted-text" style={{ margin: '12px 0 20px' }}>
        {config?.mode === 'manual'
          ? 'No modo manual, o criador do lead escolhe quem será o responsável.'
          : 'No modo Round Robin, leads são distribuídos automaticamente entre os vendedores do pool.'}
      </p>

      {config?.mode === 'round_robin' && (
        <div>
          <h3 style={{ margin: '0 0 12px 0' }}>Pool de Vendedores</h3>
          <p className="muted-text" style={{ marginBottom: 16 }}>
            Selecione os vendedores que receberão leads automaticamente.
          </p>

          <div className="distribution-pool-list">
            {users.map((user) => {
              const isInPool = poolIds.includes(user.id);
              const isNext = user.id === nextUserId;
              return (
                <div key={user.id} className={`distribution-pool-item ${isInPool ? 'in-pool' : ''}`}>
                  <div className="distribution-pool-info">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={isInPool}
                        onChange={() => handleTogglePool(user.id)}
                      />
                      <div>
                        <strong>{user.name}</strong>
                        <span style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)' }}>
                          {user.email} - {ROLE_LABELS[user.role] || user.role}
                        </span>
                      </div>
                    </label>
                  </div>
                  {isInPool && isNext && (
                    <span className="distribution-next-badge">Próximo</span>
                  )}
                </div>
              );
            })}
          </div>

          {activePool.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p className="muted-text">
                Ordem atual: {activePool.map((u, i) => (
                  <span key={u.id}>
                    {i > 0 && ' → '}
                    <strong style={{ color: u.id === nextUserId ? 'var(--accent-blue)' : 'var(--text-primary)' }}>
                      {u.name}
                    </strong>
                  </span>
                ))}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Cadence Panel ---
function CadencePanel({ toast }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    steps: 5,
    intervalDays: 1,
    activityType: 'call',
    onExpire: 'cold',
    isActive: true,
    triggerStatus: 'contacted'
  });

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      setLoading(true);
      const data = await getCadenceConfig();
      const cfg = data.data;
      if (cfg) {
        setConfig(cfg);
        setForm({
          steps: cfg.steps || 5,
          intervalDays: cfg.intervalDays || 1,
          activityType: cfg.activityType || 'call',
          onExpire: cfg.onExpire || 'cold',
          isActive: cfg.isActive !== undefined ? cfg.isActive : true,
          triggerStatus: cfg.triggerStatus || 'contacted'
        });
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao carregar configuração de cadência.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      const result = await updateCadenceConfig(form);
      setConfig(result.data);
      toast.success('Configuração de cadência atualizada.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao salvar configuração.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader text="Carregando configuração de cadência..." />;

  const statusOptions = [
    { value: 'new', label: 'Novo' },
    { value: 'contacted', label: 'Contactado' },
    { value: 'qualified', label: 'Qualificado' },
    { value: 'proposal', label: 'Proposta' },
    { value: 'negotiation', label: 'Negociação' }
  ];

  return (
    <div>
      <h3 style={{ margin: '0 0 16px 0' }}>Configuração de Cadência</h3>
      <p className="muted-text" style={{ marginBottom: 20 }}>
        Define as regras automáticas de follow-up para leads.
      </p>

      <form className="settings-form" onSubmit={handleSubmit} style={{ maxWidth: 480 }}>
        <div className="settings-form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
            />
            Cadência ativa
          </label>
        </div>

        <div className="settings-form-group">
          <label>Número de steps</label>
          <input
            type="number"
            min="1"
            max="20"
            value={form.steps}
            onChange={(e) => setForm((p) => ({ ...p, steps: parseInt(e.target.value, 10) || 1 }))}
          />
          <small>Quantidade de tentativas de contato (1-20)</small>
        </div>

        <div className="settings-form-group">
          <label>Intervalo entre steps (dias)</label>
          <input
            type="number"
            min="1"
            max="30"
            value={form.intervalDays}
            onChange={(e) => setForm((p) => ({ ...p, intervalDays: parseInt(e.target.value, 10) || 1 }))}
          />
          <small>Dias entre cada tentativa (1-30)</small>
        </div>

        <div className="settings-form-group">
          <label>Tipo de atividade</label>
          <select
            value={form.activityType}
            onChange={(e) => setForm((p) => ({ ...p, activityType: e.target.value }))}
          >
            <option value="call">Ligação</option>
            <option value="email">E-mail</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="meeting">Reunião</option>
            <option value="task">Tarefa</option>
          </select>
        </div>

        <div className="settings-form-group">
          <label>Ação ao expirar</label>
          <select
            value={form.onExpire}
            onChange={(e) => setForm((p) => ({ ...p, onExpire: e.target.value }))}
          >
            <option value="cold">Marcar como frio</option>
            <option value="lost">Mover para perdido</option>
            <option value="both">Ambos</option>
          </select>
          <small>O que acontece quando todas as tentativas se esgotam</small>
        </div>

        <div className="settings-form-group">
          <label>Status que ativa cadência</label>
          <select
            value={form.triggerStatus}
            onChange={(e) => setForm((p) => ({ ...p, triggerStatus: e.target.value }))}
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="settings-form-actions">
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Configuração'}
          </button>
        </div>
      </form>
    </div>
  );
}

// --- AI Responder Panel ---
function AiResponderPanel({ toast }) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    isActive: true,
    systemPrompt: '',
    maxMessages: 10,
    responseDelay: 3000,
    qualifyThreshold: 3,
    workingHoursOnly: false,
    workingHoursStart: '08:00',
    workingHoursEnd: '18:00'
  });

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      setLoading(true);
      const data = await getAiResponderConfig();
      const cfg = data.data;
      if (cfg) {
        setConfig(cfg);
        setForm({
          isActive: cfg.isActive !== undefined ? cfg.isActive : true,
          systemPrompt: cfg.systemPrompt || '',
          maxMessages: cfg.maxMessages || 10,
          responseDelay: cfg.responseDelay || 3000,
          qualifyThreshold: cfg.qualifyThreshold || 3,
          workingHoursOnly: cfg.workingHoursOnly || false,
          workingHoursStart: cfg.workingHoursStart || '08:00',
          workingHoursEnd: cfg.workingHoursEnd || '18:00'
        });
      }
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao carregar configuração do AI Atendente.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setSaving(true);
      const result = await updateAiResponderConfig(form);
      setConfig(result.data);
      toast.success('Configuração do AI Atendente atualizada.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao salvar configuração.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageLoader text="Carregando configuração do AI Atendente..." />;

  return (
    <div>
      <h3 style={{ margin: '0 0 16px 0' }}>AI Atendente WhatsApp</h3>
      <p className="muted-text" style={{ marginBottom: 20 }}>
        Atendente automático com IA que responde leads via WhatsApp 24/7, coleta informações e qualifica automaticamente.
      </p>

      <form className="settings-form ai-responder-config" onSubmit={handleSubmit} style={{ maxWidth: 560 }}>
        <div className="settings-form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
            />
            AI Atendente ativo
          </label>
          <small>Quando ativo, a AI responde automaticamente mensagens recebidas via WhatsApp</small>
        </div>

        <div className="settings-form-group">
          <label>Prompt do Sistema</label>
          <textarea
            value={form.systemPrompt}
            onChange={(e) => setForm((p) => ({ ...p, systemPrompt: e.target.value }))}
            rows={8}
            maxLength={2000}
            placeholder="Instruções para a AI sobre como atender os leads..."
            style={{ resize: 'vertical', minHeight: 120 }}
          />
          <small>{form.systemPrompt.length}/2000 caracteres</small>
        </div>

        <div className="settings-form-group">
          <label>Máximo de mensagens por conversa</label>
          <input
            type="number"
            min="1"
            max="50"
            value={form.maxMessages}
            onChange={(e) => setForm((p) => ({ ...p, maxMessages: parseInt(e.target.value, 10) || 1 }))}
          />
          <small>Após atingir o limite, a AI para de responder e notifica o vendedor (1-50)</small>
        </div>

        <div className="settings-form-group">
          <label>Delay de resposta (ms)</label>
          <input
            type="number"
            min="1000"
            max="10000"
            step="500"
            value={form.responseDelay}
            onChange={(e) => setForm((p) => ({ ...p, responseDelay: parseInt(e.target.value, 10) || 3000 }))}
          />
          <small>Tempo de espera antes de enviar a resposta, para parecer mais natural (1000-10000ms)</small>
        </div>

        <div className="settings-form-group">
          <label>Mensagens mínimas para qualificar</label>
          <input
            type="number"
            min="1"
            max="20"
            value={form.qualifyThreshold}
            onChange={(e) => setForm((p) => ({ ...p, qualifyThreshold: parseInt(e.target.value, 10) || 3 }))}
          />
          <small>Número mínimo de trocas antes da AI tentar qualificar o lead (1-20)</small>
        </div>

        <div className="settings-form-group">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={form.workingHoursOnly}
              onChange={(e) => setForm((p) => ({ ...p, workingHoursOnly: e.target.checked }))}
            />
            Apenas fora do horário comercial
          </label>
          <small>Se ativo, a AI só responde fora do horário comercial (dentro do horário, humanos atendem)</small>
        </div>

        {form.workingHoursOnly && (
          <div style={{ display: 'flex', gap: 16 }}>
            <div className="settings-form-group" style={{ flex: 1 }}>
              <label>Início do expediente</label>
              <input
                type="time"
                value={form.workingHoursStart}
                onChange={(e) => setForm((p) => ({ ...p, workingHoursStart: e.target.value }))}
              />
            </div>
            <div className="settings-form-group" style={{ flex: 1 }}>
              <label>Fim do expediente</label>
              <input
                type="time"
                value={form.workingHoursEnd}
                onChange={(e) => setForm((p) => ({ ...p, workingHoursEnd: e.target.value }))}
              />
            </div>
          </div>
        )}

        <div className="settings-form-actions">
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar Configuração'}
          </button>
        </div>
      </form>
    </div>
  );
}

// --- Preferences Panel ---
function PreferencesPanel() {
  const toast = useToast();
  const { isVapidSupported, isSubscribed, subscribeToPush } = usePushNotification();
  const [pushEnabled, setPushEnabled] = useState(
    () => localStorage.getItem('crm_push_enabled') === 'true'
  );
  const [permissionStatus, setPermissionStatus] = useState(() => {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission;
  });
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(true);
  const [googleAction, setGoogleAction] = useState(false);

  useEffect(() => {
    loadGoogleStatus();

    function handleMessage(event) {
      if (event.data?.type === 'google-connected') {
        setGoogleConnected(true);
        toast.success('Google Calendar conectado com sucesso!');
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  async function loadGoogleStatus() {
    try {
      const data = await getGoogleStatus();
      setGoogleConnected(data.data?.connected || false);
    } catch {
      setGoogleConnected(false);
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleConnectGoogle() {
    try {
      setGoogleAction(true);
      const data = await getGoogleAuthUrl();
      const url = data.data?.url;
      if (url) {
        window.open(url, 'google-auth', 'width=500,height=600,scrollbars=yes');
      }
    } catch (err) {
      toast.error('Erro ao obter URL de autenticação do Google.');
    } finally {
      setGoogleAction(false);
    }
  }

  async function handleDisconnectGoogle() {
    try {
      setGoogleAction(true);
      await disconnectGoogle();
      setGoogleConnected(false);
      toast.success('Google Calendar desconectado.');
    } catch (err) {
      toast.error('Erro ao desconectar Google Calendar.');
    } finally {
      setGoogleAction(false);
    }
  }

  async function handleTogglePush() {
    if (permissionStatus === 'unsupported') {
      toast.error('Seu navegador não suporta notificações push.');
      return;
    }

    if (!pushEnabled) {
      if (permissionStatus !== 'granted') {
        const result = await Notification.requestPermission();
        setPermissionStatus(result);
        if (result !== 'granted') {
          toast.error('Permissão de notificação negada pelo navegador.');
          return;
        }
      }
      localStorage.setItem('crm_push_enabled', 'true');
      setPushEnabled(true);
      toast.success('Notificações push ativadas.');
    } else {
      localStorage.setItem('crm_push_enabled', 'false');
      setPushEnabled(false);
      toast.info('Notificações push desativadas.');
    }
  }

  const statusLabel = {
    granted: 'Concedida',
    denied: 'Negada',
    default: 'Não solicitada',
    unsupported: 'Não suportado'
  };

  return (
    <div className="settings-form" style={{ maxWidth: 480 }}>
      <h3 style={{ margin: '0 0 16px 0' }}>Preferências do Sistema</h3>

      <div className="settings-form-group">
        <label style={{ fontWeight: 600, marginBottom: 4 }}>Notificações Push do Navegador</label>
        <p className="muted-text" style={{ fontSize: 13, marginBottom: 12 }}>
          Receba notificações mesmo quando o CRM não estiver em foco.
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className={pushEnabled ? 'secondary-button' : 'primary-button'}
            onClick={handleTogglePush}
          >
            {pushEnabled ? 'Desativar Push' : 'Ativar Push'}
          </button>
          <span className="muted-text" style={{ fontSize: 13 }}>
            Permissão: {statusLabel[permissionStatus] || permissionStatus}
          </span>
        </div>
      </div>

      {isVapidSupported && (
        <div className="settings-form-group" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border-color, #333)' }}>
          <label style={{ fontWeight: 600, marginBottom: 4 }}>Push nativo (background)</label>
          <p className="muted-text" style={{ fontSize: 13, marginBottom: 12 }}>
            Receba notificações mesmo com o CRM fechado
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isSubscribed ? (
              <span style={{ color: 'var(--accent-green, #22c55e)', fontWeight: 600, fontSize: 14 }}>Ativo</span>
            ) : (
              <button className="secondary-button" onClick={subscribeToPush}>
                Ativar push nativo
              </button>
            )}
          </div>
        </div>
      )}

      <div className="settings-form-group" style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--border-color, #333)' }}>
        <label style={{ fontWeight: 600, marginBottom: 4 }}>Google Calendar</label>
        <p className="muted-text" style={{ fontSize: 13, marginBottom: 12 }}>
          Conecte sua conta Google para agendar atividades diretamente no Google Calendar com lembretes automáticos.
        </p>
        {googleLoading ? (
          <span className="muted-text" style={{ fontSize: 13 }}>Verificando conexão...</span>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {googleConnected ? (
              <>
                <span style={{ color: 'var(--accent-green, #22c55e)', fontWeight: 600, fontSize: 14 }}>
                  Conectado
                </span>
                <button
                  className="secondary-button"
                  onClick={handleDisconnectGoogle}
                  disabled={googleAction}
                >
                  {googleAction ? 'Desconectando...' : 'Desconectar'}
                </button>
              </>
            ) : (
              <>
                <button
                  className="primary-button"
                  onClick={handleConnectGoogle}
                  disabled={googleAction}
                >
                  {googleAction ? 'Abrindo...' : 'Conectar Google Calendar'}
                </button>
                <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>
                  Desconectado
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SettingsPage;
