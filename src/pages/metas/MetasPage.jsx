import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getGoals, getGoalsSummary } from '../../services/goal.service';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/http';
import PageLoader from '../../components/common/PageLoader';
import EmptyState from '../../components/common/EmptyState';

const typeLabels = { monthly: 'Mensal', quarterly: 'Trimestral' };
const categoryLabels = {
  revenue: 'Faturamento',
  deals: 'Negócios',
  leads: 'Leads',
  conversion: 'Conversão'
};
const levelLabels = {
  below: 'Abaixo',
  minimum: 'Mínimo',
  desired: 'Desejado',
  super: 'Supermeta'
};

function MetasPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [response, setResponse] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterCategory, setFilterCategory] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData(type = filterType, category = filterCategory) {
    try {
      setLoading(true);
      setError('');

      const params = {};
      if (type) params.type = type;
      if (category) params.category = category;

      const [goalsData, summaryData] = await Promise.all([
        getGoals(params),
        getGoalsSummary()
      ]);

      setResponse(goalsData);
      setSummary(summaryData);
    } catch (err) {
      console.error('Erro ao carregar metas:', err);
      setError('Não foi possível carregar as metas.');
      toast.error(getErrorMessage(err, 'Não foi possível carregar as metas.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleFilter(event) {
    event.preventDefault();
    await loadData(filterType, filterCategory);
  }

  const goals = useMemo(() => {
    return response?.data || [];
  }, [response]);

  const meta = response?.meta || null;

  if (loading) {
    return <PageLoader text="Carregando metas..." />;
  }

  return (
    <div>
      <div className="page-title-row">
        <div>
          <h1>Metas</h1>
          <p className="page-subtitle">
            Acompanhe suas metas comerciais e progresso
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="secondary-button" onClick={() => loadData()}>
            Atualizar
          </button>
          <button className="primary-button" onClick={() => navigate('/metas/new')}>
            Nova Meta
          </button>
        </div>
      </div>

      {summary ? (
        <div className="goals-summary-cards">
          <div className="metric-card">
            <span className="metric-value">{summary.total}</span>
            <span className="metric-label">Total de Metas</span>
          </div>
          <div className="metric-card">
            <span className="metric-value level-super-text">{summary.atSuper}</span>
            <span className="metric-label">Supermeta</span>
          </div>
          <div className="metric-card">
            <span className="metric-value level-desired-text">{summary.atDesired}</span>
            <span className="metric-label">Desejado</span>
          </div>
          <div className="metric-card">
            <span className="metric-value level-minimum-text">{summary.atMinimum}</span>
            <span className="metric-label">Mínimo</span>
          </div>
          <div className="metric-card">
            <span className="metric-value level-below-text">{summary.belowMinimum}</span>
            <span className="metric-label">Abaixo</span>
          </div>
        </div>
      ) : null}

      <form className="toolbar-form" onSubmit={handleFilter}>
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
          <option value="">Todos os tipos</option>
          <option value="monthly">Mensal</option>
          <option value="quarterly">Trimestral</option>
        </select>

        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
          <option value="">Todas as categorias</option>
          <option value="revenue">Faturamento</option>
          <option value="deals">Negócios</option>
          <option value="leads">Leads</option>
          <option value="conversion">Conversão</option>
        </select>

        <button className="primary-button" type="submit">
          Filtrar
        </button>
      </form>

      {meta ? (
        <div className="list-summary">
          <span>Total: {meta.total}</span>
          <span>Página: {meta.page}</span>
          <span>Limite: {meta.limit}</span>
        </div>
      ) : null}

      {error ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <p className="error-text">{error}</p>
        </div>
      ) : null}

      {goals.length === 0 ? (
        <EmptyState
          title="Nenhuma meta encontrada"
          description="Quando houver metas cadastradas, elas aparecerão aqui."
        />
      ) : (
        <div className="table-card">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Título</th>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Período</th>
                <th>Progresso</th>
                <th>Nível</th>
              </tr>
            </thead>

            <tbody>
              {goals.map((goal) => (
                <tr key={goal.id}>
                  <td>
                    <Link to={`/metas/${goal.id}`}>
                      <strong>{goal.title}</strong>
                    </Link>
                  </td>
                  <td>{typeLabels[goal.type] || goal.type}</td>
                  <td>{categoryLabels[goal.category] || goal.category}</td>
                  <td>
                    {new Date(goal.startDate).toLocaleDateString('pt-BR')} -{' '}
                    {new Date(goal.endDate).toLocaleDateString('pt-BR')}
                  </td>
                  <td>
                    <div className="goal-progress-bar-container">
                      <div
                        className={`goal-progress-bar level-${goal.level}`}
                        style={{ width: `${Math.min(goal.progressPercent, 100)}%` }}
                      />
                    </div>
                    <span className="goal-progress-text">
                      {goal.progressPercent.toFixed(1)}%
                    </span>
                  </td>
                  <td>
                    <span className={`goal-level-badge level-${goal.level}`}>
                      {levelLabels[goal.level] || goal.level}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default MetasPage;
