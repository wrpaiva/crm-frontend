import { useEffect, useMemo, useState } from 'react';
import {
  completeActivity,
  deleteActivity,
  getPendingActivities
} from '../../services/activity.service';
import { useToast } from '../../hooks/useToast';
import { useUndoableDelete } from '../../hooks/useUndoableDelete';
import { useUndoableAction } from '../../hooks/useUndoableAction';
import Pagination from '../../components/common/Pagination';

const typeLabels = {
  call: 'Ligação',
  meeting: 'Reunião',
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  task: 'Tarefa',
  note: 'Nota'
};

function ActivitiesPage() {
  const toast = useToast();

  const [response, setResponse] = useState(null);
  const [activityItems, setActivityItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    loadActivities();
  }, [page]);

  async function loadActivities() {
    try {
      setLoading(true);
      setError('');

      const data = await getPendingActivities({ page, limit: 10 });
      setResponse(data);
    } catch (err) {
      console.error('Erro ao carregar atividades:', err);
      setError('Não foi possível carregar as atividades.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const data = response?.data || response?.items || response?.activities || [];
    const now = new Date();
    setActivityItems(
      data.map((a) => ({ ...a, isOverdue: a.dueDate ? new Date(a.dueDate) < now : false }))
    );
  }, [response]);

  const { removeWithUndo } = useUndoableDelete(setActivityItems, deleteActivity, 'Atividade removida.');
  const { executeWithUndo } = useUndoableAction(setActivityItems, completeActivity, 'Atividade concluída.');

  function handleComplete(activity) {
    executeWithUndo(
      activity,
      (a) => ({ ...a, status: 'completed', completedAt: new Date().toISOString() })
    );
  }

  const meta = response?.meta || null;

  const filteredActivities = useMemo(() => {
    if (filter === 'overdue') {
      return activityItems.filter((item) => item.isOverdue);
    }

    if (filter === 'today') {
      return activityItems.filter((item) => {
        if (!item.dueDate) {
          return false;
        }

        const due = new Date(item.dueDate);
        const now = new Date();

        return (
          due.getDate() === now.getDate() &&
          due.getMonth() === now.getMonth() &&
          due.getFullYear() === now.getFullYear()
        );
      });
    }

    if (filter === 'week') {
      const now = new Date();
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);

      return activityItems.filter((item) => {
        if (!item.dueDate) {
          return false;
        }

        const due = new Date(item.dueDate);
        return due >= now && due <= nextWeek;
      });
    }

    return activityItems;
  }, [activityItems, filter]);

  const summary = useMemo(() => {
    const now = new Date();

    const overdue = activityItems.filter((item) => item.isOverdue).length;

    const today = activityItems.filter((item) => {
      if (!item.dueDate) {
        return false;
      }

      const due = new Date(item.dueDate);

      return (
        due.getDate() === now.getDate() &&
        due.getMonth() === now.getMonth() &&
        due.getFullYear() === now.getFullYear()
      );
    }).length;

    const week = activityItems.filter((item) => {
      if (!item.dueDate) {
        return false;
      }

      const due = new Date(item.dueDate);
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);

      return due >= now && due <= nextWeek;
    }).length;

    return {
      total: activityItems.length,
      overdue,
      today,
      week
    };
  }, [activityItems]);

  if (loading) {
    return (
      <div>
        <h1>Atividades</h1>
        <p>Carregando atividades...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-title-row">
        <div>
          <h1>Atividades</h1>
          <p className="page-subtitle">
            Organize follow-ups, tarefas e compromissos comerciais
          </p>
        </div>

        <button className="primary-button" onClick={loadActivities}>
          Atualizar
        </button>
      </div>

      {error ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ color: '#b91c1c', margin: 0 }}>{error}</p>
        </div>
      ) : null}

      <section className="metrics-grid">
        <MetricCard title="Pendentes" value={summary.total} />
        <MetricCard title="Atrasadas" value={summary.overdue} />
        <MetricCard title="Hoje" value={summary.today} />
        <MetricCard title="Próx. 7 dias" value={summary.week} />
      </section>

      <section className="activities-toolbar">
        <button
          className={`filter-button ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          Todas
        </button>

        <button
          className={`filter-button ${filter === 'overdue' ? 'active' : ''}`}
          onClick={() => setFilter('overdue')}
        >
          Atrasadas
        </button>

        <button
          className={`filter-button ${filter === 'today' ? 'active' : ''}`}
          onClick={() => setFilter('today')}
        >
          Hoje
        </button>

        <button
          className={`filter-button ${filter === 'week' ? 'active' : ''}`}
          onClick={() => setFilter('week')}
        >
          Semana
        </button>
      </section>

      <section className="activities-list">
        {filteredActivities.length === 0 ? (
          <div className="card">
            <p style={{ margin: 0 }}>Nenhuma atividade encontrada.</p>
          </div>
        ) : (
          filteredActivities.map((activity) => (
            <div
              key={activity.id}
              className={`activity-card ${activity.isOverdue ? 'activity-overdue' : ''}`}
            >
              <div className="activity-card-main">
                <div className="activity-card-top">
                  <div>
                    <h3>{activity.description}</h3>
                    <p className="activity-type">
                      {typeLabels[activity.type] || activity.type}
                    </p>
                  </div>

                  <span
                    className={`activity-badge ${
                      activity.isOverdue ? 'badge-danger' : 'badge-neutral'
                    }`}
                  >
                    {activity.isOverdue ? 'Atrasada' : 'Pendente'}
                  </span>
                </div>

                <div className="activity-meta-grid">
                  <MetaItem
                    label="Vencimento"
                    value={
                      activity.dueDate
                        ? new Date(activity.dueDate).toLocaleString('pt-BR')
                        : 'Sem data'
                    }
                  />

                  <MetaItem
                    label="Relacionado"
                    value={`${activity.relatedType} / ${activity.relatedId}`}
                  />

                  <MetaItem
                    label="Criado por"
                    value={activity.createdBy?.name || '-'}
                  />

                  <MetaItem
                    label="Responsável"
                    value={activity.assignedTo?.name || '-'}
                  />
                </div>
              </div>

              <div className="activity-card-actions">
                <button
                  className="success-button"
                  disabled={activity.status === 'completed'}
                  onClick={() => handleComplete(activity)}
                >
                  {activity.status === 'completed' ? 'Concluída' : 'Concluir'}
                </button>

                <button
                  className="secondary-button"
                  style={{ color: 'var(--accent-red, #ef4444)' }}
                  onClick={() => removeWithUndo(activity.id ?? activity._id, activityItems)}
                >
                  Remover
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <Pagination meta={meta} onPageChange={setPage} />
    </div>
  );
}

function MetricCard({ title, value }) {
  return (
    <div className="metric-card">
      <h3>{title}</h3>
      <p>{value}</p>
    </div>
  );
}

function MetaItem({ label, value }) {
  return (
    <div className="activity-meta-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default ActivitiesPage;