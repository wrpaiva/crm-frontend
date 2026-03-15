import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { convertLead, enrichLead, getLeadById, updateLeadStatus } from '../../services/lead.service';
import {
  getLeadEnrollment,
  enrollLead,
  cancelEnrollment,
  pauseEnrollment,
  resumeEnrollment
} from '../../services/cadence.service';
import HistoryTimeline from '../../components/common/HistoryTimeline';
import FavoriteButton from '../../components/common/FavoriteButton';
import ScoreBadge from '../../components/common/ScoreBadge';

const statusLabels = {
  new: 'Novo',
  contacted: 'Contactado',
  qualified: 'Qualificado',
  proposal: 'Proposta',
  negotiation: 'Negociação',
  won: 'Ganho',
  lost: 'Perdido'
};

const statusOptions = [
  'new',
  'contacted',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost'
];

function LeadDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lead, setLead] = useState(null);
  const [loading, setLoading] = useState(true);
  const [changingStatus, setChangingStatus] = useState(false);
  const [converting, setConverting] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [enrollment, setEnrollment] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [cadenceAction, setCadenceAction] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadLead();
  }, [id]);

  async function loadLead() {
    try {
      setLoading(true);
      setError('');

      const data = await getLeadById(id);
      setLead(data);

      // Load cadence enrollment (non-blocking)
      try {
        const enrollmentData = await getLeadEnrollment(id);
        setEnrollment(enrollmentData.data || null);
      } catch {
        setEnrollment(null);
      }
    } catch (err) {
      console.error('Erro ao carregar lead:', err);
      setError('Não foi possível carregar o lead.');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(status) {
    try {
      setChangingStatus(true);
      await updateLeadStatus(id, status);
      await loadLead();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      alert(err?.response?.data?.message || 'Erro ao atualizar status.');
    } finally {
      setChangingStatus(false);
    }
  }

  async function handleConvert() {
    try {
      setConverting(true);

      const result = await convertLead(id, {
        title: `Negócio - ${lead?.name || 'Lead'}`,
        value: 0,
        stage: 'lead'
      });

      alert('Lead convertido com sucesso.');
      navigate(`/deals/kanban`);
      return result;
    } catch (err) {
      console.error('Erro ao converter lead:', err);
      alert(err?.response?.data?.message || 'Erro ao converter lead.');
    } finally {
      setConverting(false);
    }
  }

  async function handleEnrich() {
    try {
      setEnriching(true);
      await enrichLead(id);
      await loadLead();
    } catch (err) {
      console.error('Erro ao enriquecer lead:', err);
      alert(err?.response?.data?.message || 'Erro ao enriquecer lead.');
    } finally {
      setEnriching(false);
    }
  }

  async function handleEnrollCadence() {
    try {
      setEnrolling(true);
      await enrollLead(id);
      await loadLead();
    } catch (err) {
      console.error('Erro ao iniciar cadência:', err);
      alert(err?.response?.data?.message || 'Erro ao iniciar cadência.');
    } finally {
      setEnrolling(false);
    }
  }

  async function handleCadenceAction(action) {
    try {
      setCadenceAction(true);
      if (action === 'pause') await pauseEnrollment(id);
      else if (action === 'resume') await resumeEnrollment(id);
      else if (action === 'cancel') {
        if (!window.confirm('Cancelar a cadência deste lead?')) {
          setCadenceAction(false);
          return;
        }
        await cancelEnrollment(id);
      }
      await loadLead();
    } catch (err) {
      console.error('Erro na ação de cadência:', err);
      alert(err?.response?.data?.message || 'Erro ao executar ação de cadência.');
    } finally {
      setCadenceAction(false);
    }
  }

  function formatCnpjDisplay(cnpj) {
    if (!cnpj) return '-';
    const d = cnpj.replace(/\D/g, '');
    if (d.length !== 14) return cnpj;
    return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  }

  function formatCpfDisplay(cpf) {
    if (!cpf) return '-';
    const d = cpf.replace(/\D/g, '');
    if (d.length !== 11) return cpf;
    return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }

  if (loading) {
    return <p>Carregando lead...</p>;
  }

  if (error) {
    return (
      <div className="card">
        <p className="error-text">{error}</p>
        <button className="secondary-button" onClick={() => navigate('/leads')}>
          Voltar
        </button>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="card">
        <p>Lead não encontrado.</p>
        <button className="secondary-button" onClick={() => navigate('/leads')}>
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-title-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h1>{lead.name}</h1>
            <ScoreBadge score={lead.score} label={lead.scoreLabel} size="large" />
            <FavoriteButton entityType="lead" entityId={id} />
          </div>
          <p className="page-subtitle">Detalhes do lead</p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="secondary-button" onClick={() => navigate('/leads')}>
            Voltar
          </button>

          <button
            className="primary-button"
            onClick={() => navigate(`/leads/${id}/edit`)}
          >
            Editar
          </button>

          <button
            className="primary-button"
            onClick={handleEnrich}
            disabled={enriching || (!lead.cnpj && !lead.cpf)}
            style={{ background: 'var(--accent-purple)' }}
          >
            {enriching ? 'Enriquecendo...' : 'Enriquecer'}
          </button>

          {(!enrollment || enrollment.status === 'completed' || enrollment.status === 'expired' || enrollment.status === 'cancelled') && (
            <button
              className="primary-button"
              onClick={handleEnrollCadence}
              disabled={enrolling}
              style={{ background: 'var(--accent-yellow, #f5a623)', color: '#000' }}
            >
              {enrolling ? 'Iniciando...' : 'Iniciar Cadência'}
            </button>
          )}
          {enrollment?.status === 'active' && (
            <>
              <button
                className="primary-button"
                onClick={() => handleCadenceAction('pause')}
                disabled={cadenceAction}
                style={{ background: 'var(--accent-yellow, #f5a623)', color: '#000' }}
              >
                Pausar Cadência
              </button>
              <button
                className="secondary-button"
                onClick={() => handleCadenceAction('cancel')}
                disabled={cadenceAction}
              >
                Cancelar Cadência
              </button>
            </>
          )}
          {enrollment?.status === 'paused' && (
            <>
              <button
                className="primary-button"
                onClick={() => handleCadenceAction('resume')}
                disabled={cadenceAction}
                style={{ background: 'var(--accent-yellow, #f5a623)', color: '#000' }}
              >
                Retomar Cadência
              </button>
              <button
                className="secondary-button"
                onClick={() => handleCadenceAction('cancel')}
                disabled={cadenceAction}
              >
                Cancelar Cadência
              </button>
            </>
          )}

          <button
            className="success-button"
            onClick={handleConvert}
            disabled={converting || lead.status === 'won' || lead.status === 'lost'}
          >
            {converting ? 'Convertendo...' : 'Converter'}
          </button>
        </div>
      </div>

      <div className="dashboard-block-grid">
        <div className="card dashboard-panel">
          <h2>Informações principais</h2>

          <div className="summary-list">
            <SummaryRow label="Nome" value={lead.name} />
            <SummaryRow label="Empresa" value={lead.company || '-'} />
            <SummaryRow label="E-mail" value={lead.email || '-'} />
            <SummaryRow label="Telefone" value={lead.phone || '-'} />
            <SummaryRow label="CNPJ" value={formatCnpjDisplay(lead.cnpj)} />
            <SummaryRow label="CPF" value={formatCpfDisplay(lead.cpf)} />
            <SummaryRow label="Origem" value={lead.source || '-'} />
            <SummaryRow
              label="Criado em"
              value={
                lead.createdAt ? new Date(lead.createdAt).toLocaleString('pt-BR') : '-'
              }
            />
          </div>
        </div>

        <div className="card dashboard-panel">
          <h2>Status</h2>

          <div className="deal-field">
            <label>Status atual</label>
            <span className={`stage-badge stage-${lead.status}`}>
              {statusLabels[lead.status] || lead.status}
            </span>
          </div>

          <div className="deal-field" style={{ marginTop: 16 }}>
            <label>Alterar status</label>
            <select
              value={lead.status}
              disabled={changingStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {statusLabels[status]}
                </option>
              ))}
            </select>
          </div>

          <div className="deal-notes-block" style={{ marginTop: 20 }}>
            <label>Notas</label>
            {(lead.notes || []).length ? (
              lead.notes.map((note, index) => (
                <div key={`${lead.id}-note-${index}`} className="deal-note">
                  {note}
                </div>
              ))
            ) : (
              <div className="deal-note empty-note">Sem notas registradas.</div>
            )}
          </div>
        </div>
      </div>

      <div className="card enrichment-section" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2>Dados Enriquecidos</h2>
          {lead.enrichedAt && (
            <span className="enrichment-status">
              Enriquecido em {new Date(lead.enrichedAt).toLocaleString('pt-BR')}
            </span>
          )}
        </div>

        {lead.enrichmentData ? (
          <div className="enrichment-grid">
            {lead.enrichmentData.razaoSocial && (
              <SummaryRow label="Razão Social" value={lead.enrichmentData.razaoSocial} />
            )}
            {lead.enrichmentData.nomeFantasia && (
              <SummaryRow label="Nome Fantasia" value={lead.enrichmentData.nomeFantasia} />
            )}
            {lead.enrichmentData.situacao && (
              <SummaryRow label="Situação Cadastral" value={lead.enrichmentData.situacao} />
            )}
            {lead.enrichmentData.porte && (
              <SummaryRow label="Porte" value={lead.enrichmentData.porte} />
            )}
            {lead.enrichmentData.naturezaJuridica && (
              <SummaryRow label="Natureza Jurídica" value={lead.enrichmentData.naturezaJuridica} />
            )}
            {lead.enrichmentData.atividadePrincipal && (
              <SummaryRow label="Atividade Principal" value={lead.enrichmentData.atividadePrincipal} />
            )}
            {lead.enrichmentData.dataAbertura && (
              <SummaryRow label="Data de Abertura" value={lead.enrichmentData.dataAbertura} />
            )}
            {lead.enrichmentData.endereco && (lead.enrichmentData.endereco.logradouro || lead.enrichmentData.endereco.cidade) && (
              <SummaryRow
                label="Endereço"
                value={[
                  lead.enrichmentData.endereco.logradouro,
                  lead.enrichmentData.endereco.numero,
                  lead.enrichmentData.endereco.complemento,
                  lead.enrichmentData.endereco.bairro,
                  lead.enrichmentData.endereco.cidade && lead.enrichmentData.endereco.uf
                    ? `${lead.enrichmentData.endereco.cidade}/${lead.enrichmentData.endereco.uf}`
                    : lead.enrichmentData.endereco.cidade,
                  lead.enrichmentData.endereco.cep
                ].filter(Boolean).join(', ')}
              />
            )}
            {lead.cpf && lead.enrichmentData.cpfValido !== undefined && (
              <SummaryRow
                label="CPF"
                value={lead.enrichmentData.cpfValido ? 'Válido' : 'Inválido'}
              />
            )}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>Nenhum dado de enriquecimento disponível.</p>
        )}
      </div>

      <div className="card cadence-section" style={{ marginTop: 20 }}>
        <h2>Cadência</h2>
        {enrollment ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <span className={`cadence-status-${enrollment.status}`}>
                {enrollment.status === 'active' && 'Ativa'}
                {enrollment.status === 'paused' && 'Pausada'}
                {enrollment.status === 'expired' && 'Expirada'}
                {enrollment.status === 'completed' && 'Concluída'}
                {enrollment.status === 'cancelled' && 'Cancelada'}
              </span>
              <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
                Step {enrollment.currentStep} de {enrollment.totalSteps}
              </span>
            </div>

            <div className="cadence-progress-bar">
              <div
                className="cadence-progress-fill"
                style={{ width: `${(enrollment.currentStep / enrollment.totalSteps) * 100}%` }}
              />
            </div>

            {enrollment.nextDueDate && (enrollment.status === 'active' || enrollment.status === 'paused') && (
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 12 }}>
                Próximo step: {new Date(enrollment.nextDueDate).toLocaleString('pt-BR')}
              </p>
            )}

            {enrollment.completedSteps && enrollment.completedSteps.length > 0 && (
              <div className="cadence-steps-list" style={{ marginTop: 16 }}>
                {enrollment.completedSteps.map((step, idx) => (
                  <div key={idx} className="cadence-step">
                    <span className="cadence-step-indicator" />
                    <span>Step {step.step}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {step.completedAt ? new Date(step.completedAt).toLocaleString('pt-BR') : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)' }}>Lead não está em cadência.</p>
        )}
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <h2>Histórico</h2>
        <HistoryTimeline entityType="lead" entityId={id} />
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

export default LeadDetailsPage;