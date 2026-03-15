import { useEffect, useMemo, useState } from 'react';
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
import PageLoader from '../../components/common/PageLoader';

const TABS = [
  { key: 'profile', label: 'Perfil' },
  { key: 'security', label: 'Segurança' },
  { key: 'users', label: 'Usuários', adminOnly: true },
  { key: 'pipeline', label: 'Pipeline', adminOnly: true },
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

  async function handleDeletePipeline() {
    if (!selectedPipeline) return;
    if (!window.confirm(`Remover pipeline "${selectedPipeline.name}" e todos os seus estágios?`)) return;
    try {
      await removePipeline(selectedPipeline._id);
      toast.success('Pipeline removido.');
      setSelectedPipeline(null);
      setStages([]);
      await loadPipelines();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao remover pipeline.'));
    }
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

  async function handleDeleteStage(stageId) {
    if (!window.confirm('Remover este estágio?')) return;
    try {
      await removeStage(selectedPipeline._id, stageId);
      toast.success('Estágio removido.');
      await loadStages(selectedPipeline._id);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao remover estágio.'));
    }
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

// --- Preferences Panel ---
function PreferencesPanel() {
  return (
    <div className="settings-form">
      <div className="settings-preferences-placeholder">
        <h3>Preferências do Sistema</h3>
        <p>Em breve você poderá personalizar o tema, notificações e outras preferências.</p>
      </div>
    </div>
  );
}

export default SettingsPage;
