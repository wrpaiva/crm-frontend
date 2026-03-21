import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { ResponsiveGridLayout as RGL, useContainerWidth } from 'react-grid-layout';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  GripVertical,
  RotateCcw,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  Clock,
  Users,
  CalendarCheck,
  UserX,
  Inbox,
  FileWarning,
  ShieldAlert,
  Timer,
  BadgeAlert
} from 'lucide-react';
import {
  getExecutiveDashboard,
  getActivitiesDashboard,
  getSellersPerformance,
  getRisks,
  getTimeline,
  getPipelineDashboard
} from '../../services/dashboard.service';
import { exportDashboardToPDF, exportDashboardToExcel } from '../../services/export.service';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const STORAGE_KEY = 'operational-dashboard-layouts';

const DEFAULT_LAYOUTS = {
  lg: [
    { i: 'metrics', x: 0, y: 0, w: 12, h: 2, minH: 2 },
    { i: 'timeline', x: 0, y: 2, w: 8, h: 4, minH: 3 },
    { i: 'risks', x: 8, y: 2, w: 4, h: 4, minH: 3 },
    { i: 'forgotten', x: 0, y: 6, w: 6, h: 4, minH: 3 },
    { i: 'performance', x: 6, y: 6, w: 6, h: 4, minH: 3 }
  ],
  md: [
    { i: 'metrics', x: 0, y: 0, w: 10, h: 2, minH: 2 },
    { i: 'timeline', x: 0, y: 2, w: 6, h: 4, minH: 3 },
    { i: 'risks', x: 6, y: 2, w: 4, h: 4, minH: 3 },
    { i: 'forgotten', x: 0, y: 6, w: 5, h: 4, minH: 3 },
    { i: 'performance', x: 5, y: 6, w: 5, h: 4, minH: 3 }
  ],
  sm: [
    { i: 'metrics', x: 0, y: 0, w: 6, h: 3, minH: 2 },
    { i: 'timeline', x: 0, y: 3, w: 6, h: 4, minH: 3 },
    { i: 'risks', x: 0, y: 7, w: 6, h: 4, minH: 3 },
    { i: 'forgotten', x: 0, y: 11, w: 6, h: 4, minH: 3 },
    { i: 'performance', x: 0, y: 15, w: 6, h: 4, minH: 3 }
  ]
};

function getSavedLayouts() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function formatCurrency(value) {
  return `R$ ${Number(value || 0).toLocaleString('pt-BR')}`;
}

function OperationalDashboardPage() {
  const [executive, setExecutive] = useState(null);
  const [activities, setActivities] = useState(null);
  const [sellers, setSellers] = useState(null);
  const [risks, setRisks] = useState(null);
  const [timeline, setTimeline] = useState(null);
  const [pipeline, setPipeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [layouts, setLayouts] = useState(() => getSavedLayouts() || DEFAULT_LAYOUTS);
  const { width, containerRef } = useContainerWidth();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      setError('');
      const [execData, actData, sellData, riskData, timeData, pipeData] = await Promise.all([
        getExecutiveDashboard(),
        getActivitiesDashboard(),
        getSellersPerformance(),
        getRisks(),
        getTimeline({ groupBy: 'day' }),
        getPipelineDashboard()
      ]);
      setExecutive(execData);
      setActivities(actData);
      setSellers(sellData);
      setRisks(riskData);
      setTimeline(timeData);
      setPipeline(pipeData);
    } catch (err) {
      console.error('Erro ao carregar dashboard operacional:', err);
      setError('Não foi possível carregar o dashboard operacional.');
    } finally {
      setLoading(false);
    }
  }

  const handleLayoutChange = useCallback((_layout, allLayouts) => {
    setLayouts(allLayouts);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(allLayouts));
  }, []);

  function resetLayout() {
    setLayouts(DEFAULT_LAYOUTS);
    localStorage.removeItem(STORAGE_KEY);
  }

  async function handleExportPDF() {
    await exportDashboardToPDF('operational-dashboard-content');
  }

  function handleExportExcel() {
    exportDashboardToExcel({
      executive,
      pipeline,
      activities,
      sellers,
      risks
    });
  }

  // Computed metrics
  const operationalMetrics = useMemo(() => {
    const byType = activities?.byType || [];
    const meetingType = byType.find(t => t.type === 'meeting') || {};
    const meetingRate = meetingType.total > 0
      ? Math.round((meetingType.completed / meetingType.total) * 100)
      : 0;

    const timelineSeries = timeline?.series?.leadsCreated || [];
    const leadsCreated30d = timelineSeries.reduce((sum, item) => sum + (item.total || 0), 0);

    const riskSummary = risks?.summary || {};

    return [
      {
        title: 'Taxa de Reuniões',
        value: `${meetingRate}%`,
        description: `${meetingType.completed || 0}/${meetingType.total || 0} concluídas`,
        icon: CalendarCheck,
        color: 'green'
      },
      {
        title: 'Leads Criados 30d',
        value: leadsCreated30d,
        description: 'Últimos 30 dias',
        icon: Users,
        color: 'blue'
      },
      {
        title: 'Leads Esquecidos',
        value: riskSummary.leadsWithoutActivity || 0,
        description: 'Sem atividade registrada',
        icon: UserX,
        color: 'red'
      },
      {
        title: 'Atividades Atrasadas',
        value: activities?.summary?.overdueCount || 0,
        description: 'Requerem ação imediata',
        icon: Clock,
        color: 'yellow'
      }
    ];
  }, [activities, timeline, risks]);

  // Timeline chart data
  const timelineChartData = useMemo(() => {
    const series = timeline?.series || {};
    const leadsCreated = series.leadsCreated || [];
    const activitiesCompleted = series.activitiesCompleted || [];

    return leadsCreated.map((item, index) => ({
      period: item.period ? new Date(item.period).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '',
      leads: item.total || 0,
      atividades: activitiesCompleted[index]?.total || 0
    }));
  }, [timeline]);

  // Risk badges
  const riskBadges = useMemo(() => {
    const summary = risks?.summary || {};
    return [
      { label: 'Leads sem Atividade', value: summary.leadsWithoutActivity || 0, icon: UserX, color: 'red' },
      { label: 'Novos sem Contato', value: summary.newLeadsWithoutContact || 0, icon: Inbox, color: 'yellow' },
      { label: 'Deals Parados', value: summary.dealsWithoutRecentActivity || 0, icon: FileWarning, color: 'pink' },
      { label: 'Propostas Paradas', value: summary.staleProposals || 0, icon: ShieldAlert, color: 'purple' },
      { label: 'Negociações Travadas', value: summary.stuckNegotiations || 0, icon: Timer, color: 'cyan' },
      { label: 'Atrasadas Alto Valor', value: summary.overdueHighValueActivities || 0, icon: BadgeAlert, color: 'red' }
    ];
  }, [risks]);

  // Forgotten leads
  const forgottenLeads = useMemo(() => {
    return risks?.criticalItems?.leadsWithoutActivity || [];
  }, [risks]);

  // Sellers performance
  const sellersData = useMemo(() => {
    return (sellers?.sellers || []).map(s => ({
      name: s.seller?.name?.split(' ')[0] || 'N/A',
      leads: s.metrics?.totalLeads || 0,
      deals: s.metrics?.wonDeals || 0,
      revenue: s.metrics?.revenue || 0,
      conversion: s.metrics?.conversionRate || 0
    }));
  }, [sellers]);

  if (loading) {
    return (
      <div>
        <div className="page-title-row">
          <div>
            <h1>Dashboard Operacional</h1>
            <p className="page-subtitle">Carregando...</p>
          </div>
        </div>
        <div className="page-loader">
          <div className="page-loader-spinner"></div>
          <span>Carregando dashboard operacional...</span>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-title-row">
        <div>
          <h1>Dashboard</h1>
          <p className="page-subtitle">Visão Operacional</p>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="secondary-button" onClick={resetLayout} title="Resetar Layout">
            <RotateCcw size={16} />
            Resetar Layout
          </button>
          <button className="secondary-button" onClick={handleExportExcel} title="Exportar Excel">
            <FileSpreadsheet size={16} />
            Excel
          </button>
          <button className="primary-button" onClick={handleExportPDF} title="Exportar PDF">
            <FileText size={16} />
            PDF
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="dashboard-nav-tabs">
        <Link to="/dashboard" className="dashboard-nav-tab">
          Executivo
        </Link>
        <span className="dashboard-nav-tab active">
          Operacional
        </span>
      </nav>

      {error && (
        <div className="card" style={{ marginBottom: 16 }}>
          <p className="error-text">{error}</p>
        </div>
      )}

      <div id="operational-dashboard-content" ref={containerRef}>
        {width > 0 && (
        <RGL
          className="operational-grid-layout"
          layouts={layouts}
          width={width}
          breakpoints={{ lg: 1200, md: 996, sm: 768 }}
          cols={{ lg: 12, md: 10, sm: 6 }}
          rowHeight={80}
          onLayoutChange={handleLayoutChange}
          draggableHandle=".widget-drag-handle"
          isResizable={true}
          compactType="vertical"
        >
          {/* Widget: Métricas Operacionais */}
          <div key="metrics" className="widget-card">
            <div className="widget-header">
              <GripVertical size={16} className="widget-drag-handle" />
              <h3>Métricas Operacionais</h3>
            </div>
            <div className="widget-content">
              <div className="operational-metrics-grid">
                {operationalMetrics.map((m) => (
                  <div key={m.title} className={`operational-metric-card ${m.color}`}>
                    <div className="operational-metric-icon">
                      <m.icon size={20} />
                    </div>
                    <div className="operational-metric-info">
                      <span className="operational-metric-label">{m.title}</span>
                      <strong className="operational-metric-value">{m.value}</strong>
                      <small className="operational-metric-desc">{m.description}</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Widget: Timeline de Atividades */}
          <div key="timeline" className="widget-card">
            <div className="widget-header">
              <GripVertical size={16} className="widget-drag-handle" />
              <h3>Timeline de Atividades</h3>
            </div>
            <div className="widget-content" style={{ height: 'calc(100% - 48px)' }}>
              {timelineChartData.length === 0 ? (
                <p className="muted-text" style={{ padding: 20 }}>Sem dados de timeline disponíveis.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineChartData}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorAtividades" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)' }} labelStyle={{ color: 'var(--text-primary)' }} />
                    <Area type="monotone" dataKey="leads" name="Leads Criados" stroke="#3b82f6" strokeWidth={2} fill="url(#colorLeads)" dot={false} />
                    <Area type="monotone" dataKey="atividades" name="Atividades" stroke="#10b981" strokeWidth={2} fill="url(#colorAtividades)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Widget: Alertas de Risco */}
          <div key="risks" className="widget-card">
            <div className="widget-header">
              <GripVertical size={16} className="widget-drag-handle" />
              <h3>Alertas de Risco</h3>
              <AlertTriangle size={16} style={{ color: 'var(--accent-yellow)', marginLeft: 'auto' }} />
            </div>
            <div className="widget-content">
              <div className="risk-grid">
                {riskBadges.map((badge) => (
                  <div key={badge.label} className={`risk-badge-card ${badge.color}`}>
                    <badge.icon size={18} />
                    <strong>{badge.value}</strong>
                    <span>{badge.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Widget: Leads Esquecidos */}
          <div key="forgotten" className="widget-card">
            <div className="widget-header">
              <GripVertical size={16} className="widget-drag-handle" />
              <h3>Leads Esquecidos</h3>
              <span className="widget-badge">{forgottenLeads.length}</span>
            </div>
            <div className="widget-content" style={{ overflow: 'auto' }}>
              {forgottenLeads.length === 0 ? (
                <p className="muted-text" style={{ padding: 20 }}>Nenhum lead esquecido.</p>
              ) : (
                <table className="forgotten-leads-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>Fonte</th>
                      <th>Status</th>
                      <th>Dias</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forgottenLeads.slice(0, 10).map((lead) => (
                      <tr key={lead.id || lead._id}>
                        <td>
                          <Link to={`/leads/${lead.id || lead._id}`}>{lead.name}</Link>
                        </td>
                        <td>{lead.source || '-'}</td>
                        <td>
                          <span className={`stage-badge stage-${lead.status}`}>{lead.status}</span>
                        </td>
                        <td>{lead.daysOpen || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Widget: Performance Vendedores */}
          <div key="performance" className="widget-card">
            <div className="widget-header">
              <GripVertical size={16} className="widget-drag-handle" />
              <h3>Performance Vendedores</h3>
            </div>
            <div className="widget-content" style={{ height: 'calc(100% - 48px)' }}>
              {sellersData.length === 0 ? (
                <p className="muted-text" style={{ padding: 20 }}>Sem dados de vendedores disponíveis.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sellersData} barCategoryGap="20%">
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 8, color: 'var(--text-primary)' }}
                      labelStyle={{ color: 'var(--text-primary)' }}
                      formatter={(value, name) => {
                        if (name === 'revenue') return [formatCurrency(value), 'Receita'];
                        if (name === 'deals') return [value, 'Deals Ganhos'];
                        if (name === 'leads') return [value, 'Leads'];
                        return [value, name];
                      }}
                    />
                    <Bar dataKey="leads" name="leads" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="deals" name="deals" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </RGL>
        )}
      </div>
    </div>
  );
}

export default OperationalDashboardPage;
