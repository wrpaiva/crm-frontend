import { useEffect, useMemo, useState } from 'react';
import {
  completeActivity,
  getPendingActivities
} from '../../services/activity.service';

const typeLabels = {
  call: 'Ligação',
  meeting: 'Reunião',
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  task: 'Tarefa',
  note: 'Nota'
};

function ActivitiesPage() {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState(null);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    loadActivities();
  }, []);

  async function loadActivities() {
    try {
      setLoading(true);
      setError('');

      const data = await getPendingActivities();
      setResponse(data);
    } catch (err) {
      console.error('Erro ao carregar atividades:', err);
      setError('Não foi possível carregar as atividades.');
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete(activityId) {
    try {
      setCompletingId(activityId);
      await completeActivity(activityId);
      await loadActivities();
    } catch (err) {
      console.error('Erro ao concluir atividade:', err);
      alert(err?.response?.data?.message || 'Erro ao concluir atividade.');
    } finally {
      setCompletingId(null);
    }
  }

  const activities = useMemo(() => {
    const data = response?.data || response?.items || response?.activities || [];
    const now = new Date();

    return data.map((activity) => {
      const dueDate = activity.dueDate ? new Date(activity.dueDate) : null;
      const isOverdue = dueDate ? dueDate < now : false;

      return {
        ...activity,
        isOverdue
      };
    });
  }, [response]);

  const filteredActivities = useMemo(() => {
    if (filter === 'overdue') {
      return activities.filter((item) => item.isOverdue);
    }

    if (filter === 'today') {
      return activities.filter((item) => {
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

      return activities.filter((item) => {
        if (!item.dueDate) {
          return false;
        }

        const due = new Date(item.dueDate);
        return due >= now && due <= nextWeek;
      });
    }

    return activities;
  }, [activities, filter]);

  const summary = useMemo(() => {
    const now = new Date();

    const overdue = activities.filter((item) => item.isOverdue).length;

    const today = activities.filter((item) => {
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

    const week = activities.filter((item) => {
      if (!item.dueDate) {
        return false;
      }

      const due = new Date(item.dueDate);
      const nextWeek = new Date();
      nextWeek.setDate(now.getDate() + 7);

      return due >= now && due <= nextWeek;
    }).length;

    return {
      total: activities.length,
      overdue,
      today,
      week
    };
  }, [activities]);

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
                  disabled={completingId === activity.id}
                  onClick={() => handleComplete(activity.id)}
                >
                  {completingId === activity.id ? 'Concluindo...' : 'Concluir'}
                </button>
              </div>
            </div>
          ))
        )}
      </section>
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