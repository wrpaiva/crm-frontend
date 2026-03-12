import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { convertLead, getLeadById, updateLeadStatus } from '../../services/lead.service';

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
          <h1>{lead.name}</h1>
          <p className="page-subtitle">Detalhes do lead</p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="secondary-button" onClick={() => navigate('/leads')}>
            Voltar
          </button>

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