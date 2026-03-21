import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateDealStage } from '../../services/deal.service';
import { getConversationsByLead } from '../../services/whatsapp.service';
import { getActivitiesByRelated } from '../../services/activity.service';
import { getHistory } from '../../services/history.service';

const stageLabels = {
  lead: 'Lead',
  contacted: 'Contacted',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost'
};

const stages = ['lead', 'contacted', 'proposal', 'negotiation', 'won', 'lost'];

function DealDetailsModal({ deal, onClose, onUpdated, onDeleteDeal, onCloseDealWon, onCloseDealLost }) {
  const navigate = useNavigate();
  const [stage, setStage] = useState(deal.stage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('info');

  // Conversations tab state
  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(false);

  // History tab state
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [activities, setActivities] = useState([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  useEffect(() => {
    setStage(deal.stage);
    setError('');
    setActiveTab('info');
    setConversations([]);
    setHistory([]);
    setActivities([]);
  }, [deal]);

  useEffect(() => {
    function handleEsc(event) {
      if (event.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Lazy load conversations
  const loadConversations = useCallback(async () => {
    if (!deal.lead?.id) return;
    try {
      setLoadingConversations(true);
      const result = await getConversationsByLead(deal.lead.id);
      setConversations(result.data || []);
    } catch (err) {
      console.error('Erro ao carregar conversas:', err);
    } finally {
      setLoadingConversations(false);
    }
  }, [deal.lead?.id]);

  // Lazy load history + activities
  const loadHistory = useCallback(async () => {
    try {
      setLoadingHistory(true);
      const result = await getHistory('deal', deal.id);
      setHistory(result.data || []);
    } catch (err) {
      console.error('Erro ao carregar histórico:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [deal.id]);

  const loadActivities = useCallback(async () => {
    try {
      setLoadingActivities(true);
      const result = await getActivitiesByRelated('deal', deal.id);
      setActivities(result.data || []);
    } catch (err) {
      console.error('Erro ao carregar atividades:', err);
    } finally {
      setLoadingActivities(false);
    }
  }, [deal.id]);

  useEffect(() => {
    if (activeTab === 'conversations' && conversations.length === 0 && !loadingConversations) {
      loadConversations();
    }
    if (activeTab === 'history' && history.length === 0 && activities.length === 0 && !loadingHistory && !loadingActivities) {
      loadHistory();
      loadActivities();
    }
  }, [activeTab, conversations.length, history.length, activities.length, loadingConversations, loadingHistory, loadingActivities, loadConversations, loadHistory, loadActivities]);

  async function handleStageChange(newStage) {
    if (newStage === stage) return;
    try {
      setLoading(true);
      setError('');
      await updateDealStage(deal.id, newStage);
      setStage(newStage);
      if (onUpdated) await onUpdated();
    } catch (err) {
      console.error('Erro ao atualizar estágio:', err);
      setError(err?.response?.data?.message || 'Erro ao atualizar estágio.');
    } finally {
      setLoading(false);
    }
  }

  function handleOverlayClick(event) {
    if (event.target.classList.contains('modal-overlay')) onClose();
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('pt-BR');
  }

  function formatShortDate(dateStr) {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('pt-BR');
  }

  // Combine history + activities for timeline
  function getTimeline() {
    const items = [];

    history.forEach((h) => {
      items.push({
        type: 'history',
        date: h.createdAt || h.date,
        description: h.description || `${h.field || 'Campo'}: ${h.oldValue || '-'} → ${h.newValue || '-'}`,
        user: h.user?.name || h.createdBy?.name || '-'
      });
    });

    activities.forEach((a) => {
      items.push({
        type: 'activity',
        date: a.createdAt,
        description: a.description || `${a.type}: ${a.title || ''}`,
        user: a.createdBy?.name || a.assignedTo?.name || '-',
        completed: a.completed
      });
    });

    items.sort((a, b) => new Date(b.date) - new Date(a.date));
    return items;
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-container deal-modal-expanded">
        <div className="modal-header">
          <div>
            <h2>{deal.title}</h2>
            <p className="modal-subtitle">Detalhes do negócio</p>
          </div>
          <button className="modal-close-button" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="deal-tabs">
          <button
            className={`deal-tab ${activeTab === 'info' ? 'active' : ''}`}
            onClick={() => setActiveTab('info')}
            type="button"
          >
            Informações
          </button>
          <button
            className={`deal-tab ${activeTab === 'conversations' ? 'active' : ''}`}
            onClick={() => setActiveTab('conversations')}
            type="button"
          >
            Conversas
          </button>
          <button
            className={`deal-tab ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
            type="button"
          >
            Histórico
          </button>
        </div>

        <div className="modal-body deal-modal-body">
          {error ? <p className="error-text">{error}</p> : null}

          {/* Tab: Informações */}
          {activeTab === 'info' ? (
            <div className="deal-tab-content">
              <div className="deal-field">
                <label>Valor</label>
                <strong className="deal-detail-value">
                  R$ {(deal.value || 0).toLocaleString('pt-BR')}
                </strong>
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
                  {deal.contact.email ? <span className="deal-field-sub">{deal.contact.email}</span> : null}
                  {deal.contact.phone ? <span className="deal-field-sub">{deal.contact.phone}</span> : null}
                </div>
              ) : null}

              {deal.lead ? (
                <div className="deal-field">
                  <label>Lead</label>
                  <strong
                    className="deal-link"
                    onClick={() => navigate(`/leads/${deal.lead.id}`)}
                  >
                    {deal.lead.name}
                  </strong>
                  {deal.lead.email ? <span className="deal-field-sub">{deal.lead.email}</span> : null}
                  {deal.lead.phone ? <span className="deal-field-sub">{deal.lead.phone}</span> : null}
                  {deal.lead.source ? <span className="deal-field-sub">Origem: {deal.lead.source}</span> : null}
                </div>
              ) : null}

              {deal.expectedCloseDate ? (
                <div className="deal-field">
                  <label>Previsão de fechamento</label>
                  <strong>{formatShortDate(deal.expectedCloseDate)}</strong>
                </div>
              ) : null}

              <div className="deal-info-row">
                <div className="deal-field">
                  <label>Criado em</label>
                  <strong>{formatDate(deal.createdAt)}</strong>
                </div>
                <div className="deal-field">
                  <label>Atualizado em</label>
                  <strong>{formatDate(deal.updatedAt)}</strong>
                </div>
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
          ) : null}

          {/* Tab: Conversas */}
          {activeTab === 'conversations' ? (
            <div className="deal-tab-content">
              {!deal.lead ? (
                <div className="deal-empty-state">
                  Este negócio não possui um lead vinculado. Vincule um lead para ver as conversas WhatsApp.
                </div>
              ) : loadingConversations ? (
                <p className="deal-loading">Carregando conversas...</p>
              ) : conversations.length === 0 ? (
                <div className="deal-empty-state">
                  Nenhuma conversa WhatsApp encontrada para o lead {deal.lead.name}.
                </div>
              ) : (
                <div className="deal-conversations-list">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      className="deal-conversation-item"
                      onClick={() => navigate('/whatsapp')}
                    >
                      <div className="deal-conv-top">
                        <strong>{conv.contactName || conv.phoneNumber}</strong>
                        {conv.phoneNumber ? (
                          <span className="deal-conv-phone">{conv.phoneNumber}</span>
                        ) : null}
                      </div>
                      {conv.lastMessagePreview ? (
                        <p className="deal-conv-preview">{conv.lastMessagePreview}</p>
                      ) : null}
                      <span className="deal-conv-date">
                        {conv.lastMessageAt ? formatDate(conv.lastMessageAt) : '-'}
                      </span>
                      {conv.unreadCount > 0 ? (
                        <span className="deal-conv-unread">{conv.unreadCount}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {/* Tab: Histórico */}
          {activeTab === 'history' ? (
            <div className="deal-tab-content">
              {loadingHistory || loadingActivities ? (
                <p className="deal-loading">Carregando histórico...</p>
              ) : (() => {
                const timeline = getTimeline();
                if (timeline.length === 0) {
                  return (
                    <div className="deal-empty-state">
                      Nenhum registro de histórico ou atividade encontrado.
                    </div>
                  );
                }
                return (
                  <div className="deal-timeline">
                    {timeline.map((item, idx) => (
                      <div key={idx} className={`deal-timeline-item ${item.type}`}>
                        <div className="deal-timeline-dot" />
                        <div className="deal-timeline-content">
                          <p className="deal-timeline-desc">{item.description}</p>
                          <div className="deal-timeline-meta">
                            <span>{item.user}</span>
                            <span>{formatDate(item.date)}</span>
                            {item.type === 'activity' && item.completed ? (
                              <span className="deal-timeline-badge completed">Concluída</span>
                            ) : null}
                            {item.type === 'activity' && !item.completed ? (
                              <span className="deal-timeline-badge pending">Pendente</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          ) : null}
        </div>

        <div className="modal-footer">
          {onCloseDealWon && deal.stage !== 'won' ? (
            <button
              type="button"
              className="primary-button"
              onClick={() => { onCloseDealWon(deal); onClose(); }}
              disabled={loading}
            >
              Marcar como Ganho
            </button>
          ) : null}
          {onCloseDealLost && deal.stage !== 'lost' ? (
            <button
              type="button"
              className="danger-button"
              onClick={() => { onCloseDealLost(deal); onClose(); }}
              disabled={loading}
            >
              Marcar como Perdido
            </button>
          ) : null}
          {onDeleteDeal ? (
            <button
              type="button"
              className="danger-button"
              onClick={() => { onDeleteDeal(deal); onClose(); }}
              disabled={loading}
            >
              Remover
            </button>
          ) : null}
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
