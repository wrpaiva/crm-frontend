import { useEffect, useState } from 'react';
import { getHistory } from '../../services/history.service';

function HistoryTimeline({ entityType, entityId }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError('');
        const data = await getHistory(entityType, entityId);
        setEntries(data);
      } catch {
        setError('Não foi possível carregar o histórico.');
      } finally {
        setLoading(false);
      }
    }

    if (entityType && entityId) {
      load();
    }
  }, [entityType, entityId]);

  if (loading) {
    return <p className="muted-text">Carregando histórico...</p>;
  }

  if (error) {
    return <p className="error-text">{error}</p>;
  }

  if (entries.length === 0) {
    return <p className="muted-text">Nenhum registro de histórico.</p>;
  }

  return (
    <div className="history-timeline">
      {entries.map((entry) => (
        <div key={entry._id} className="history-entry">
          <div className="history-entry-dot" />
          <div className="history-entry-content">
            <p className="history-entry-description">{entry.description}</p>
            <div className="history-entry-meta">
              {entry.userId?.name && (
                <span className="history-entry-user">{entry.userId.name}</span>
              )}
              <span className="history-entry-date">
                {new Date(entry.createdAt).toLocaleString('pt-BR')}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default HistoryTimeline;
