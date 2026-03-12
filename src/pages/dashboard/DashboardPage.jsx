import { useEffect, useMemo, useState } from 'react';
import {
  getActivitiesDashboard,
  getExecutiveDashboard,
  getPipelineDashboard
} from '../../services/dashboard.service';

const stageLabels = {
  lead: 'Lead',
  contacted: 'Contacted',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost'
};

function DashboardPage() {
  const [executive, setExecutive] = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [activities, setActivities] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    try {
      setLoading(true);
      setError('');

      const [executiveData, pipelineData, activitiesData] = await Promise.all([
        getExecutiveDashboard(),
        getPipelineDashboard(),
        getActivitiesDashboard()
      ]);

      setExecutive(executiveData);
      setPipeline(pipelineData);
      setActivities(activitiesData);
    } catch (err) {
      console.error('Erro ao carregar dashboard:', err);
      setError('Não foi possível carregar o dashboard.');
    } finally {
      setLoading(false);
    }
  }

  const kpis = useMemo(() => {
    const executiveKpis = executive?.kpis || {};

    return [
      {
        title: 'Leads',
        value: executiveKpis.totalLeads || 0
      },
      {
        title: 'Contatos',
        value: executiveKpis.totalContacts || 0
      },
      {
        title: 'Negócios',
        value: executiveKpis.totalDeals || 0
      },
      {
        title: 'Pipeline',
        value: formatCurrency(executiveKpis.pipelineValue || 0)
      },
      {
        title: 'Ganhos',
        value: formatCurrency(executiveKpis.wonValue || 0)
      },
      {
        title: 'Perdidos',
        value: formatCurrency(executiveKpis.lostValue || 0)
      },
      {
        title: 'Ticket Médio',
        value: formatCurrency(executiveKpis.averageTicket || 0)
      },
      {
        title: 'Conversão',
        value: `${executiveKpis.conversionRate || 0}%`
      }
    ];
  }, [executive]);

  const pipelineStages = useMemo(() => {
    return pipeline?.stages || [];
  }, [pipeline]);

  const activitiesSummary = activities?.summary || {};
  const pendingList =
    activities?.pendingList || activities?.pending || activities?.data || [];
  const overdueList = activities?.overdueList || [];
  const risks = activities?.risks || {};

  if (loading) {
    return (
      <div>
        <div className="page-title-row">
          <div>
            <h1>Dashboard</h1>
            <p className="page-subtitle">Visão geral do CRM</p>
          </div>
        </div>

        <p>Carregando dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-title-row">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">
            Visão executiva de vendas, pipeline e execução comercial
          </p>
        </div>

        <button className="primary-button" onClick={loadDashboard}>
          Atualizar
        </button>
      </div>

      {error ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <p className="error-text">{error}</p>
        </div>
      ) : null}

      <section className="metrics-grid">
        {kpis.map((item) => (
          <MetricCard key={item.title} title={item.title} value={item.value} />
        ))}
      </section>

      <section className="dashboard-block-grid">
        <div className="card dashboard-panel">
          <div className="panel-header">
            <h2>Pipeline por estágio</h2>
            <span>{pipeline?.totalDeals || 0} negócio(s)</span>
          </div>

          <div className="pipeline-stages-list">
            {pipelineStages.length === 0 ? (
              <p className="muted-text">Nenhum dado de pipeline disponível.</p>
            ) : (
              pipelineStages.map((stage) => (
                <div key={stage.stage} className="pipeline-stage-row">
                  <div className="pipeline-stage-left">
                    <span className={`stage-badge stage-${stage.stage}`}>
                      {stageLabels[stage.stage] || stage.stage}
                    </span>
                    <small>{stage.count} negócio(s)</small>
                  </div>

                  <div className="pipeline-stage-right">
                    <strong>{formatCurrency(stage.totalValue || 0)}</strong>
                    <small>Ticket: {formatCurrency(stage.averageTicket || 0)}</small>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card dashboard-panel">
          <div className="panel-header">
            <h2>Resumo de atividades</h2>
            <span>Execução operacional</span>
          </div>

          <div className="mini-metrics-grid">
            <MiniMetric
              title="Pendentes"
              value={activitiesSummary.pendingCount || 0}
            />
            <MiniMetric
              title="Atrasadas"
              value={activitiesSummary.overdueCount || 0}
            />
            <MiniMetric
              title="Concluídas hoje"
              value={activitiesSummary.completedToday || 0}
            />
            <MiniMetric
              title="Concluídas no período"
              value={activitiesSummary.completedInPeriod || 0}
            />
          </div>

          <div className="dashboard-subsection">
            <h3>Próximas pendências</h3>

            {pendingList.length === 0 ? (
              <p className="muted-text">Nenhuma pendência encontrada.</p>
            ) : (
              <div className="compact-list">
                {pendingList.slice(0, 5).map((activity) => (
                  <div key={activity.id || activity._id} className="compact-list-item">
                    <div>
                      <strong>{activity.description}</strong>
                      <small>{activity.type}</small>
                    </div>

                    <span>
                      {activity.dueDate
                        ? new Date(activity.dueDate).toLocaleDateString('pt-BR')
                        : 'Sem data'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="dashboard-block-grid">
        <div className="card dashboard-panel">
          <div className="panel-header">
            <h2>Itens em risco</h2>
            <span>Atenção comercial</span>
          </div>

          <div className="mini-metrics-grid">
            <MiniMetric
              title="Deals sem atividade"
              value={(risks.dealsWithoutRecentActivity || []).length}
            />
            <MiniMetric
              title="Leads sem atividade"
              value={(risks.leadsWithoutActivity || []).length}
            />
            <MiniMetric
              title="Atividades atrasadas"
              value={overdueList.length}
            />
          </div>

          <div className="dashboard-subsection">
            <h3>Atividades atrasadas</h3>

            {overdueList.length === 0 ? (
              <p className="muted-text">Nenhuma atividade atrasada.</p>
            ) : (
              <div className="compact-list">
                {overdueList.slice(0, 5).map((activity) => (
                  <div
                    key={activity.id || activity._id}
                    className="compact-list-item compact-danger"
                  >
                    <div>
                      <strong>{activity.description}</strong>
                      <small>{activity.type}</small>
                    </div>

                    <span>
                      {activity.dueDate
                        ? new Date(activity.dueDate).toLocaleDateString('pt-BR')
                        : 'Sem data'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card dashboard-panel">
          <div className="panel-header">
            <h2>Resumo rápido</h2>
            <span>Indicadores principais</span>
          </div>

          <div className="summary-list">
            <SummaryRow
              label="Pipeline Total"
              value={formatCurrency(executive?.kpis?.pipelineValue || 0)}
            />
            <SummaryRow
              label="Receita Ganha"
              value={formatCurrency(executive?.kpis?.wonValue || 0)}
            />
            <SummaryRow
              label="Receita Perdida"
              value={formatCurrency(executive?.kpis?.lostValue || 0)}
            />
            <SummaryRow
              label="Conversão"
              value={`${executive?.kpis?.conversionRate || 0}%`}
            />
            <SummaryRow
              label="Atividades Pendentes"
              value={activitiesSummary.pendingCount || 0}
            />
            <SummaryRow
              label="Atividades Atrasadas"
              value={activitiesSummary.overdueCount || 0}
            />
          </div>
        </div>
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

function MiniMetric({ title, value }) {
  return (
    <div className="mini-metric-card">
      <span>{title}</span>
      <strong>{value}</strong>
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

function formatCurrency(value) {
  return `R$ ${Number(value || 0).toLocaleString('pt-BR')}`;
}

export default DashboardPage;