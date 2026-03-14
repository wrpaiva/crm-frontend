import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getGoalById, updateProgress, deleteGoal } from '../../services/goal.service';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/http';

const typeLabels = { monthly: 'Mensal', quarterly: 'Trimestral' };
const categoryLabels = {
  revenue: 'Faturamento',
  deals: 'Negócios',
  leads: 'Leads',
  conversion: 'Conversão'
};
const levelLabels = {
  below: 'Abaixo do Mínimo',
  minimum: 'Mínimo Atingido',
  desired: 'Desejado Atingido',
  super: 'Supermeta Atingida'
};

function MetaDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [goal, setGoal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [progressValue, setProgressValue] = useState('');
  const [updatingProgress, setUpdatingProgress] = useState(false);

  useEffect(() => {
    loadGoal();
  }, [id]);

  async function loadGoal() {
    try {
      setLoading(true);
      setError('');

      const data = await getGoalById(id);
      setGoal(data);
      setProgressValue(String(data.currentValue));
    } catch (err) {
      console.error('Erro ao carregar meta:', err);
      setError('Não foi possível carregar a meta.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateProgress(event) {
    event.preventDefault();

    const value = Number(progressValue);
    if (isNaN(value) || value < 0) {
      toast.error('Informe um valor válido.');
      return;
    }

    try {
      setUpdatingProgress(true);
      const updated = await updateProgress(id, value);
      setGoal(updated);
      toast.success('Progresso atualizado com sucesso.');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao atualizar progresso.'));
    } finally {
      setUpdatingProgress(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm('Tem certeza que deseja excluir esta meta?')) {
      return;
    }

    try {
      await deleteGoal(id);
      toast.success('Meta removida com sucesso.');
      navigate('/metas');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao excluir meta.'));
    }
  }

  if (loading) {
    return <p>Carregando meta...</p>;
  }

  if (error) {
    return (
      <div className="card">
        <p className="error-text">{error}</p>
        <button className="secondary-button" onClick={() => navigate('/metas')}>
          Voltar
        </button>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="card">
        <p>Meta não encontrada.</p>
        <button className="secondary-button" onClick={() => navigate('/metas')}>
          Voltar
        </button>
      </div>
    );
  }

  const markerMinPos = goal.baseValue > 0
    ? Math.min((goal.minimumValue / goal.superValue) * 100, 100)
    : 0;
  const markerDesPos = goal.baseValue > 0
    ? Math.min((goal.desiredValue / goal.superValue) * 100, 100)
    : 0;
  const progressWidth = goal.superValue > 0
    ? Math.min((goal.currentValue / goal.superValue) * 100, 100)
    : 0;

  return (
    <div>
      <div className="page-title-row">
        <div>
          <h1>{goal.title}</h1>
          <p className="page-subtitle">Detalhes da meta</p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="secondary-button" onClick={handleDelete}>
            Excluir
          </button>
          <button className="secondary-button" onClick={() => navigate('/metas')}>
            Voltar
          </button>
        </div>
      </div>

      <div className="dashboard-block-grid">
        <div className="card dashboard-panel">
          <h2>Informações</h2>

          <div className="summary-list">
            <SummaryRow label="Título" value={goal.title} />
            <SummaryRow label="Tipo" value={typeLabels[goal.type] || goal.type} />
            <SummaryRow label="Categoria" value={categoryLabels[goal.category] || goal.category} />
            <SummaryRow
              label="Período"
              value={`${new Date(goal.startDate).toLocaleDateString('pt-BR')} - ${new Date(goal.endDate).toLocaleDateString('pt-BR')}`}
            />
            <SummaryRow label="Valor Base" value={goal.baseValue.toLocaleString('pt-BR')} />
            <SummaryRow label="Valor Mínimo" value={goal.minimumValue.toLocaleString('pt-BR')} />
            <SummaryRow label="Valor Desejado" value={goal.desiredValue.toLocaleString('pt-BR')} />
            <SummaryRow label="Supermeta" value={goal.superValue.toLocaleString('pt-BR')} />
            {goal.notes ? <SummaryRow label="Observações" value={goal.notes} /> : null}
            <SummaryRow
              label="Criado em"
              value={new Date(goal.createdAt).toLocaleString('pt-BR')}
            />
          </div>
        </div>

        <div className="card dashboard-panel">
          <h2>Progresso</h2>

          <div className="goal-detail-level">
            <span className={`goal-level-badge level-${goal.level}`}>
              {levelLabels[goal.level] || goal.level}
            </span>
          </div>

          <div className="goal-detail-progress">
            <div className="goal-progress-large-container">
              <div className="goal-progress-marker" style={{ left: `${markerMinPos}%` }}>
                <span className="goal-marker-label">Mín</span>
              </div>
              <div className="goal-progress-marker" style={{ left: `${markerDesPos}%` }}>
                <span className="goal-marker-label">Des</span>
              </div>
              <div className="goal-progress-marker" style={{ left: '100%' }}>
                <span className="goal-marker-label">Sup</span>
              </div>
              <div
                className={`goal-progress-bar level-${goal.level}`}
                style={{ width: `${progressWidth}%` }}
              />
            </div>

            <div className="goal-progress-info">
              <span>
                Atual: <strong>{goal.currentValue.toLocaleString('pt-BR')}</strong>
              </span>
              <span>
                Progresso: <strong>{goal.progressPercent.toFixed(1)}%</strong>
              </span>
            </div>
          </div>

          <form className="goal-progress-form" onSubmit={handleUpdateProgress}>
            <label>Atualizar valor atual</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="number"
                value={progressValue}
                onChange={(e) => setProgressValue(e.target.value)}
                min="0"
                step="any"
                placeholder="Novo valor atual"
              />
              <button
                type="submit"
                className="primary-button"
                disabled={updatingProgress}
              >
                {updatingProgress ? 'Salvando...' : 'Atualizar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="summary-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default MetaDetailsPage;
