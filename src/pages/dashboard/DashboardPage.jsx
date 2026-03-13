import { useEffect, useMemo, useState } from 'react';
import {
  getActivitiesDashboard,
  getExecutiveDashboard,
  getPipelineDashboard
} from '../../services/dashboard.service';
import {
  DollarSign,
  Users,
  ShoppingCart,
  TrendingUp,
  Package,
  Target,
  Award,
  Percent
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';

const stageLabels = {
  lead: 'Lead',
  contacted: 'Contacted',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost'
};

// Dados mockados para os gráficos
const visitorData = [
  { month: 'Jan', value: 120 },
  { month: 'Fev', value: 180 },
  { month: 'Mar', value: 150 },
  { month: 'Abr', value: 280 },
  { month: 'Mai', value: 220 },
  { month: 'Jun', value: 350 },
  { month: 'Jul', value: 520 },
  { month: 'Ago', value: 380 },
  { month: 'Set', value: 420 },
  { month: 'Out', value: 350 },
  { month: 'Nov', value: 400 },
  { month: 'Dez', value: 450 },
];

const customerData = [
  { month: 'Jan', lastMonth: 200, thisMonth: 280 },
  { month: 'Fev', lastMonth: 180, thisMonth: 320 },
  { month: 'Mar', lastMonth: 220, thisMonth: 280 },
  { month: 'Abr', lastMonth: 280, thisMonth: 350 },
  { month: 'Mai', lastMonth: 240, thisMonth: 380 },
  { month: 'Jun', lastMonth: 300, thisMonth: 420 },
];

const levelData = [
  { name: 'Volume', value: 75 },
  { name: 'Service', value: 45 },
];

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
        title: 'Total Vendas',
        value: formatCurrency(executiveKpis.pipelineValue || 0),
        change: '+10%',
        positive: true,
        icon: DollarSign,
        color: 'pink'
      },
      {
        title: 'Total Pedidos',
        value: executiveKpis.totalDeals || 0,
        change: '+8%',
        positive: true,
        icon: ShoppingCart,
        color: 'blue'
      },
      {
        title: 'Leads Ativos',
        value: executiveKpis.totalLeads || 0,
        change: '+2%',
        positive: true,
        icon: Package,
        color: 'cyan'
      },
      {
        title: 'Novos Contatos',
        value: executiveKpis.totalContacts || 0,
        change: '+3%',
        positive: true,
        icon: Users,
        color: 'green'
      }
    ];
  }, [executive]);

  const topProducts = useMemo(() => {
    const stages = pipeline?.stages || [];
    return stages.slice(0, 4).map((stage, index) => ({
      rank: String(index + 1).padStart(2, '0'),
      name: stageLabels[stage.stage] || stage.stage,
      popularity: Math.min(100, (stage.count || 0) * 15),
      sales: stage.count || 0,
      color: ['green', 'blue', 'cyan', 'pink'][index % 4]
    }));
  }, [pipeline]);

  const pipelineStages = useMemo(() => {
    return pipeline?.stages || [];
  }, [pipeline]);

  const activitiesSummary = activities?.summary || {};
  const pendingList = activities?.pendingList || activities?.pending || activities?.data || [];

  // Dados para o donut chart
  const earningsValue = executive?.kpis?.wonValue || 0;
  const conversionRate = executive?.kpis?.conversionRate || 80;
  const donutData = [
    { name: 'Completed', value: conversionRate },
    { name: 'Remaining', value: 100 - conversionRate },
  ];

  if (loading) {
    return (
      <div>
        <div className="page-title-row">
          <div>
            <h1>Dashboard</h1>
            <p className="page-subtitle">Sales Summary</p>
          </div>
        </div>
        <div className="page-loader">
          <div className="page-loader-spinner"></div>
          <span>Carregando dashboard...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-title-row">
        <div>
          <h1>Today's Sales</h1>
          <p className="page-subtitle">Sales Summary</p>
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

      {/* KPIs Grid */}
      <section className="metrics-grid">
        {kpis.map((item) => (
          <MetricCard key={item.title} {...item} />
        ))}
      </section>

      {/* Main Dashboard Grid */}
      <section className="dashboard-grid">
        {/* Top Products Table */}
        <div className="card">
          <div className="card-header">
            <div>
              <h2 className="card-title">Top Products</h2>
            </div>
          </div>

          <div className="products-table">
            <div className="products-table-header">
              <span>#</span>
              <span>Name</span>
              <span>Popularity</span>
              <span>Sales</span>
            </div>
            
            {topProducts.length === 0 ? (
              <p className="muted-text" style={{ padding: '20px 0' }}>Nenhum produto disponível.</p>
            ) : (
              topProducts.map((product) => (
                <div key={product.rank} className="products-table-row">
                  <span className="product-rank">{product.rank}</span>
                  <span className="product-name">{product.name}</span>
                  <div className="popularity-bar">
                    <div 
                      className={`popularity-fill ${product.color}`} 
                      style={{ width: `${product.popularity}%` }}
                    ></div>
                  </div>
                  <span className="sales-badge">{product.sales}%</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Level Chart */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Level</h2>
          </div>
          
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={levelData} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" hide />
                <Bar dataKey="value" radius={[0, 8, 8, 0]}>
                  {levelData.map((entry, index) => (
                    <Cell key={index} fill={index === 0 ? '#3b82f6' : '#06b6d4'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#3b82f6' }}></span>
              <span>Volume</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#06b6d4' }}></span>
              <span>Service</span>
            </div>
          </div>
        </div>
      </section>

      {/* Second Row */}
      <section className="dashboard-grid-3">
        {/* Earnings */}
        <div className="card earnings-card">
          <span className="earnings-label">Total Expense</span>
          <div className="earnings-value">{formatCurrency(earningsValue)}</div>
          <p className="earnings-change">Profit is 48% More than last Month</p>

          <div className="donut-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={donutData}
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={0}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  <Cell fill="#06b6d4" />
                  <Cell fill="#21252b" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="donut-center">{conversionRate}%</div>
          </div>
        </div>

        {/* Customer Fulfilment */}
        <div className="card" style={{ gridColumn: 'span 2' }}>
          <div className="card-header">
            <h2 className="card-title">Customer Fulfilment</h2>
          </div>

          <div className="chart-container" style={{ height: 180 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={customerData}>
                <defs>
                  <linearGradient id="colorThisMonth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ background: '#282c34', border: 'none', borderRadius: 8 }}
                  labelStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="lastMonth" stroke="#6b7280" strokeWidth={2} fill="none" dot={false} />
                <Area type="monotone" dataKey="thisMonth" stroke="#8b5cf6" strokeWidth={2} fill="url(#colorThisMonth)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-legend">
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#6b7280' }}></span>
              <span>Last Month</span>
              <span className="legend-value">R$ 4.087</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#8b5cf6' }}></span>
              <span>This Month</span>
              <span className="legend-value">R$ 5.506</span>
            </div>
          </div>
        </div>
      </section>

      {/* Visitor Insights */}
      <section className="dashboard-grid-2">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Visitor Insights</h2>
            <div className="legend-item">
              <span className="legend-dot" style={{ background: '#10b981' }}></span>
              <span>New Visitors</span>
            </div>
          </div>

          <div className="chart-container" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={visitorData}>
                <defs>
                  <linearGradient id="colorVisitor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ background: '#282c34', border: 'none', borderRadius: 8 }}
                  labelStyle={{ color: '#fff' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#10b981" 
                  strokeWidth={2} 
                  fill="url(#colorVisitor)" 
                  dot={{ fill: '#10b981', strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: '#10b981' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline Summary */}
        <div className="card dashboard-panel">
          <div className="panel-header">
            <h2>Pipeline por estágio</h2>
            <span>{pipeline?.totalDeals || 0} negócio(s)</span>
          </div>

          <div className="pipeline-stages-list">
            {pipelineStages.length === 0 ? (
              <p className="muted-text">Nenhum dado de pipeline disponível.</p>
            ) : (
              pipelineStages.slice(0, 5).map((stage) => (
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
      </section>

      {/* Activities Section */}
      <section className="dashboard-block-grid">
        <div className="card dashboard-panel">
          <div className="panel-header">
            <h2>Resumo de atividades</h2>
            <span>Execução operacional</span>
          </div>

          <div className="mini-metrics-grid">
            <MiniMetric title="Pendentes" value={activitiesSummary.pendingCount || 0} />
            <MiniMetric title="Atrasadas" value={activitiesSummary.overdueCount || 0} />
            <MiniMetric title="Concluídas hoje" value={activitiesSummary.completedToday || 0} />
            <MiniMetric title="Concluídas no período" value={activitiesSummary.completedInPeriod || 0} />
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

        <div className="card dashboard-panel">
          <div className="panel-header">
            <h2>Resumo rápido</h2>
            <span>Indicadores principais</span>
          </div>

          <div className="summary-list">
            <SummaryRow label="Pipeline Total" value={formatCurrency(executive?.kpis?.pipelineValue || 0)} />
            <SummaryRow label="Receita Ganha" value={formatCurrency(executive?.kpis?.wonValue || 0)} />
            <SummaryRow label="Receita Perdida" value={formatCurrency(executive?.kpis?.lostValue || 0)} />
            <SummaryRow label="Conversão" value={`${executive?.kpis?.conversionRate || 0}%`} />
            <SummaryRow label="Atividades Pendentes" value={activitiesSummary.pendingCount || 0} />
            <SummaryRow label="Atividades Atrasadas" value={activitiesSummary.overdueCount || 0} />
          </div>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ title, value, change, positive, icon: Icon, color }) {
  return (
    <div className="metric-card">
      <div className={`metric-icon ${color}`}>
        <Icon size={24} />
      </div>
      <div className="metric-content">
        <h3>{title}</h3>
        <p className="metric-value">{value}</p>
        <span className={`metric-change ${positive ? 'positive' : 'negative'}`}>
          {change} from yesterday
        </span>
      </div>
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
