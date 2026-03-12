import { useEffect, useState } from 'react';
import { updateDealStage } from '../../services/deal.service';

const stageLabels = {
  lead: 'Lead',
  contacted: 'Contacted',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost'
};

const stages = ['lead', 'contacted', 'proposal', 'negotiation', 'won', 'lost'];

function DealDetailsModal({ deal, onClose, onUpdated }) {
  const [stage, setStage] = useState(deal.stage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setStage(deal.stage);
    setError('');
  }, [deal]);

  useEffect(() => {
    function handleEsc(event) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    document.addEventListener('keydown', handleEsc);

    return () => {
      document.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  async function handleStageChange(newStage) {
    if (newStage === stage) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      await updateDealStage(deal.id, newStage);
      setStage(newStage);

      if (onUpdated) {
        await onUpdated();
      }
    } catch (err) {
      console.error('Erro ao atualizar estágio do negócio:', err);
      setError(err?.response?.data?.message || 'Erro ao atualizar estágio.');
    } finally {
      setLoading(false);
    }
  }

  function handleOverlayClick(event) {
    if (event.target.classList.contains('modal-overlay')) {
      onClose();
    }
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-container">
        <div className="modal-header">
          <div>
            <h2>{deal.title}</h2>
            <p className="modal-subtitle">Detalhes do negócio</p>
          </div>

          <button className="modal-close-button" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        <div className="modal-body">
          {error ? <p className="error-text">{error}</p> : null}

          <div className="deal-field">
            <label>Valor</label>
            <strong>R$ {(deal.value || 0).toLocaleString('pt-BR')}</strong>
          </div>

          <div className="deal-field">
            <label>Estágio atual</label>
            <div className="deal-stage-row">
              <span className={`stage-badge stage-${stage}`}>
                {stageLabels[stage]}
              </span>

              <select
                value={stage}
                disabled={loading}
                onChange={(e) => handleStageChange(e.target.value)}
              >
                {stages.map((item) => (
                  <option key={item} value={item}>
                    {stageLabels[item]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {deal.contact ? (
            <div className="deal-field">
              <label>Contato</label>
              <strong>{deal.contact.name}</strong>
              {deal.contact.email ? <span>{deal.contact.email}</span> : null}
              {deal.contact.phone ? <span>{deal.contact.phone}</span> : null}
              {deal.contact.company ? <span>{deal.contact.company}</span> : null}
            </div>
          ) : null}

          {deal.lead ? (
            <div className="deal-field">
              <label>Lead</label>
              <strong>{deal.lead.name}</strong>
              {deal.lead.email ? <span>{deal.lead.email}</span> : null}
              {deal.lead.phone ? <span>{deal.lead.phone}</span> : null}
              {deal.lead.company ? <span>{deal.lead.company}</span> : null}
              {deal.lead.source ? (
                <span>Origem: {deal.lead.source}</span>
              ) : null}
            </div>
          ) : null}

          {deal.expectedCloseDate ? (
            <div className="deal-field">
              <label>Previsão de fechamento</label>
              <strong>
                {new Date(deal.expectedCloseDate).toLocaleDateString('pt-BR')}
              </strong>
            </div>
          ) : null}

          <div className="deal-field">
            <label>Criado em</label>
            <strong>
              {deal.createdAt
                ? new Date(deal.createdAt).toLocaleString('pt-BR')
                : '-'}
            </strong>
          </div>

          <div className="deal-field">
            <label>Atualizado em</label>
            <strong>
              {deal.updatedAt
                ? new Date(deal.updatedAt).toLocaleString('pt-BR')
                : '-'}
            </strong>
          </div>

          {deal.notes?.length ? (
            <div className="deal-notes-block">
              <label>Notas</label>

              {deal.notes.map((note, index) => (
                <div key={`${deal.id}-note-${index}`} className="deal-note">
                  {note}
                </div>
              ))}
            </div>
          ) : (
            <div className="deal-notes-block">
              <label>Notas</label>
              <div className="deal-note empty-note">Sem notas registradas.</div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="secondary-button"
            onClick={onClose}
            disabled={loading}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

export default DealDetailsModal;