import { useEffect, useState } from 'react';
import { getAllHistory } from '../../services/history.service';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/http';

const entityTypeLabels = {
  lead: 'Lead',
  contact: 'Contato',
  deal: 'Negócio'
};

const filterOptions = [
  { value: '', label: 'Todos' },
  { value: 'lead', label: 'Leads' },
  { value: 'contact', label: 'Contatos' },
  { value: 'deal', label: 'Negócios' }
];

function HistoryPage() {
  const toast = useToast();

  const [entries, setEntries] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadHistory();
  }, [filter, page]);

  async function loadHistory() {
    try {
      setLoading(true);
      const params = { page, limit: 30 };
      if (filter) params.entityType = filter;

      const result = await getAllHistory(params);
      setEntries(result.data);
      setMeta(result.meta);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao carregar histórico.'));
    } finally {
      setLoading(false);
    }
  }

  function handleFilterChange(value) {
    setFilter(value);
    setPage(1);
  }

  return (
    <div>
      <div className="page-title-row">
        <div>
          <h1>Histórico</h1>
          <p className="page-subtitle">Registro das suas ações no sistema</p>
        </div>

        <select
          value={filter}
          onChange={(e) => handleFilterChange(e.target.value)}
          style={{ minWidth: 160 }}
        >
          {filterOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p>Carregando histórico...</p>
      ) : entries.length === 0 ? (
        <div className="card">
          <p className="muted-text" style={{ textAlign: 'center', padding: 20 }}>
            Nenhum registro de histórico encontrado.
          </p>
        </div>
      ) : (
        <div className="card">
          <div className="history-timeline">
            {entries.map((entry) => (
              <div key={entry._id} className="history-entry">
                <div className="history-entry-dot" />
                <div className="history-entry-content">
                  <p className="history-entry-description">
                    <span className={`history-entity-badge stage-badge stage-${entry.entityType}`}>
                      {entityTypeLabels[entry.entityType] || entry.entityType}
                    </span>
                    {' '}{entry.description}
                  </p>
                  <div className="history-entry-meta">
                    <span className="history-entry-date">
                      {new Date(entry.createdAt).toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="settings-pagination" style={{ marginTop: 16 }}>
          {Array.from({ length: meta.totalPages }, (_, i) => (
            <button
              key={i + 1}
              className={`pagination-btn ${page === i + 1 ? 'active' : ''}`}
              onClick={() => setPage(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default HistoryPage;
