import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  convertLead,
  getLeads,
  updateLeadStatus
} from '../../services/lead.service';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/http';
import PageLoader from '../../components/common/PageLoader';
import EmptyState from '../../components/common/EmptyState';

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

function LeadsPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [changingId, setChangingId] = useState(null);
  const [convertingId, setConvertingId] = useState(null);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    source: ''
  });

  useEffect(() => {
    loadLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadLeads(customFilters = filters) {
    try {
      setLoading(true);
      setError('');

      const params = {
        ...(customFilters.search ? { search: customFilters.search } : {}),
        ...(customFilters.status ? { status: customFilters.status } : {}),
        ...(customFilters.source ? { source: customFilters.source } : {})
      };

      const data = await getLeads(params);
      setResponse(data);
    } catch (err) {
      console.error('Erro ao carregar leads:', err);
      setError('Não foi possível carregar os leads.');
      toast.error(getErrorMessage(err, 'Não foi possível carregar os leads.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleFilterSubmit(event) {
    event.preventDefault();
    await loadLeads(filters);
  }

  async function handleStatusChange(leadId, status) {
    try {
      setChangingId(leadId);
      await updateLeadStatus(leadId, status);
      toast.success('Status do lead atualizado com sucesso.');
      await loadLeads();
    } catch (err) {
      console.error('Erro ao atualizar status do lead:', err);
      toast.error(getErrorMessage(err, 'Erro ao atualizar status do lead.'));
    } finally {
      setChangingId(null);
    }
  }

  async function handleConvert(leadId) {
    try {
      setConvertingId(leadId);

      await convertLead(leadId, {
        title: 'Negócio gerado pelo frontend',
        value: 0,
        stage: 'lead'
      });

      toast.success('Lead convertido com sucesso.');
      await loadLeads();
    } catch (err) {
      console.error('Erro ao converter lead:', err);
      toast.error(getErrorMessage(err, 'Erro ao converter lead.'));
    } finally {
      setConvertingId(null);
    }
  }

  const leads = useMemo(() => {
    return response?.data || [];
  }, [response]);

  const meta = response?.meta || null;

  if (loading) {
    return <PageLoader text="Carregando leads..." />;
  }

  return (
    <div>
      <div className="page-title-row">
        <div>
          <h1>Leads</h1>
          <p className="page-subtitle">
            Gerencie oportunidades desde o primeiro contato até a conversão
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="secondary-button" onClick={() => loadLeads()}>
            Atualizar
          </button>

          <button className="primary-button" onClick={() => navigate('/leads/new')}>
            Novo Lead
          </button>
        </div>
      </div>

      <form className="toolbar-form" onSubmit={handleFilterSubmit}>
        <input
          type="text"
          placeholder="Buscar por nome, email, telefone ou empresa"
          value={filters.search}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, search: e.target.value }))
          }
        />

        <select
          value={filters.status}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, status: e.target.value }))
          }
        >
          <option value="">Todos os status</option>
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {statusLabels[status]}
            </option>
          ))}
        </select>

        <select
          value={filters.source}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, source: e.target.value }))
          }
        >
          <option value="">Todas as origens</option>
          <option value="site">Site</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="instagram">Instagram</option>
          <option value="facebook">Facebook</option>
          <option value="indicacao">Indicação</option>
          <option value="manual">Manual</option>
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

      {leads.length === 0 ? (
        <EmptyState
          title="Nenhum lead encontrado"
          description="Quando houver leads cadastrados, eles aparecerão aqui."
        />
      ) : (
        <div className="table-card">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Empresa</th>
                <th>Origem</th>
                <th>Status</th>
                <th>Contato</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td>
                    <Link to={`/leads/${lead.id}`}>
                      <strong>{lead.name}</strong>
                    </Link>
                  </td>

                  <td>{lead.company || '-'}</td>

                  <td>{lead.source || '-'}</td>

                  <td>
                    <span className={`stage-badge stage-${lead.status}`}>
                      {statusLabels[lead.status] || lead.status}
                    </span>
                  </td>

                  <td>
                    <div className="table-stack">
                      <span>{lead.email || '-'}</span>
                      <span>{lead.phone || '-'}</span>
                    </div>
                  </td>

                  <td>
                    <div className="table-actions">
                      <select
                        value={lead.status}
                        disabled={changingId === lead.id}
                        onChange={(e) =>
                          handleStatusChange(lead.id, e.target.value)
                        }
                      >
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>
                            {statusLabels[status]}
                          </option>
                        ))}
                      </select>

                      <button
                        className="success-button"
                        disabled={
                          convertingId === lead.id ||
                          lead.status === 'won' ||
                          lead.status === 'lost'
                        }
                        onClick={() => handleConvert(lead.id)}
                      >
                        {convertingId === lead.id ? 'Convertendo...' : 'Converter'}
                      </button>
                    </div>
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

export default LeadsPage;