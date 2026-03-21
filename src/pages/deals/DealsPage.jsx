import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getKanban, updateDealStage, deleteDeal, closeDealWon, closeDealLost } from '../../services/deal.service';
import DealDetailsModal from '../../components/deals/DealDetailsModal';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../../hooks/useToast';

const stageLabels = {
  lead: 'Lead',
  contacted: 'Contacted',
  proposal: 'Proposal',
  negotiation: 'Negotiation',
  won: 'Won',
  lost: 'Lost'
};

const stageOrder = ['lead', 'contacted', 'proposal', 'negotiation', 'won', 'lost'];

function DealsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [kanban, setKanban] = useState({
    lead: [],
    contacted: [],
    proposal: [],
    negotiation: [],
    won: [],
    lost: []
  });
  const [loading, setLoading] = useState(true);
  const [movingId, setMovingId] = useState(null);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadKanban();
  }, []);

  async function loadKanban() {
    try {
      setLoading(true);
      setError('');

      const data = await getKanban();

      setKanban({
        lead: data.lead || [],
        contacted: data.contacted || [],
        proposal: data.proposal || [],
        negotiation: data.negotiation || [],
        won: data.won || [],
        lost: data.lost || []
      });
    } catch (err) {
      console.error('Erro ao carregar kanban:', err);
      setError('Não foi possível carregar o pipeline.');
    } finally {
      setLoading(false);
    }
  }

  async function handleDragEnd(result) {
    const { source, destination, draggableId } = result;

    if (!destination) {
      return;
    }

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceColumn = Array.from(kanban[source.droppableId]);
    const destinationColumn =
      source.droppableId === destination.droppableId
        ? sourceColumn
        : Array.from(kanban[destination.droppableId]);

    const [movedItem] = sourceColumn.splice(source.index, 1);

    if (!movedItem) {
      return;
    }

    const updatedItem = {
      ...movedItem,
      stage: destination.droppableId
    };

    destinationColumn.splice(destination.index, 0, updatedItem);

    const previousState = kanban;

    const optimisticState =
      source.droppableId === destination.droppableId
        ? {
            ...kanban,
            [source.droppableId]: destinationColumn
          }
        : {
            ...kanban,
            [source.droppableId]: sourceColumn,
            [destination.droppableId]: destinationColumn
          };

    setKanban(optimisticState);
    setMovingId(draggableId);

    try {
      await updateDealStage(draggableId, destination.droppableId);

      if (selectedDeal && selectedDeal.id === draggableId) {
        setSelectedDeal((prev) =>
          prev
            ? {
                ...prev,
                stage: destination.droppableId
              }
            : prev
        );
      }
    } catch (err) {
      console.error('Erro ao mover negócio:', err);
      setKanban(previousState);
      alert(err?.response?.data?.message || 'Erro ao mover negócio.');
    } finally {
      setMovingId(null);
    }
  }

  function getColumnTotal(items) {
    return items.reduce((acc, item) => acc + (item.value || 0), 0);
  }

  function handleCardClick(event, deal) {
    if (event.defaultPrevented) {
      return;
    }

    setSelectedDeal(deal);
  }

  function handleDeleteDeal(deal) {
    const dealId = deal.id ?? deal._id;
    const stage = deal.stage;

    setKanban((prev) => ({
      ...prev,
      [stage]: prev[stage].filter((d) => (d.id ?? d._id) !== dealId)
    }));

    if (selectedDeal && (selectedDeal.id ?? selectedDeal._id) === dealId) {
      setSelectedDeal(null);
    }

    const onUndo = () =>
      setKanban((prev) => ({
        ...prev,
        [stage]: [...(prev[stage] || []), deal]
      }));

    toast.undoable('Negócio removido.', () => deleteDeal(dealId), onUndo);
  }

  function handleCloseDealWon(deal) {
    const dealId = deal.id ?? deal._id;
    const originalStage = deal.stage;

    setKanban((prev) => {
      const without = { ...prev, [originalStage]: prev[originalStage].filter((d) => (d.id ?? d._id) !== dealId) };
      return { ...without, won: [...(without.won || []), { ...deal, stage: 'won' }] };
    });

    if (selectedDeal && (selectedDeal.id ?? selectedDeal._id) === dealId) {
      setSelectedDeal((prev) => prev ? { ...prev, stage: 'won' } : prev);
    }

    const onUndo = () =>
      setKanban((prev) => {
        const without = { ...prev, won: prev.won.filter((d) => (d.id ?? d._id) !== dealId) };
        return { ...without, [originalStage]: [...(without[originalStage] || []), deal] };
      });

    toast.undoable('Negócio marcado como ganho.', () => closeDealWon(dealId), onUndo);
  }

  function handleCloseDealLost(deal, reason = '') {
    const dealId = deal.id ?? deal._id;
    const originalStage = deal.stage;

    setKanban((prev) => {
      const without = { ...prev, [originalStage]: prev[originalStage].filter((d) => (d.id ?? d._id) !== dealId) };
      return { ...without, lost: [...(without.lost || []), { ...deal, stage: 'lost' }] };
    });

    if (selectedDeal && (selectedDeal.id ?? selectedDeal._id) === dealId) {
      setSelectedDeal((prev) => prev ? { ...prev, stage: 'lost' } : prev);
    }

    const onUndo = () =>
      setKanban((prev) => {
        const without = { ...prev, lost: prev.lost.filter((d) => (d.id ?? d._id) !== dealId) };
        return { ...without, [originalStage]: [...(without[originalStage] || []), deal] };
      });

    toast.undoable('Negócio marcado como perdido.', () => closeDealLost(dealId, reason), onUndo);
  }

  if (loading) {
    return (
      <div>
        <h1>Pipeline de Negócios</h1>
        <p>Carregando kanban...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="page-title-row">
        <div>
          <h1>Pipeline de Negócios</h1>
          <p className="page-subtitle">Kanban comercial estilo Monday</p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="secondary-button" onClick={loadKanban}>
            Atualizar
          </button>

          <button className="primary-button" onClick={() => navigate('/deals/new')}>
            Novo Negócio
          </button>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <p style={{ color: '#b91c1c', margin: 0 }}>{error}</p>
        </div>
      ) : null}

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="kanban-board">
          {stageOrder.map((stage) => {
            const items = kanban[stage] || [];
            const totalValue = getColumnTotal(items);

            return (
              <div className="kanban-column-wrapper" key={stage}>
                <div className="kanban-column-header">
                  <div>
                    <h3>{stageLabels[stage]}</h3>
                    <span>{items.length} negócio(s)</span>
                  </div>

                  <strong>R$ {totalValue.toLocaleString('pt-BR')}</strong>
                </div>

                <Droppable droppableId={stage}>
                  {(provided, snapshot) => (
                    <div
                      className={`kanban-column ${
                        snapshot.isDraggingOver ? 'drag-over' : ''
                      }`}
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                    >
                      {items.map((deal, index) => (
                        <Draggable
                          key={deal.id}
                          draggableId={deal.id}
                          index={index}
                        >
                          {(providedDraggable, snapshotDraggable) => (
                            <div
                              ref={providedDraggable.innerRef}
                              {...providedDraggable.draggableProps}
                              {...providedDraggable.dragHandleProps}
                              className={`deal-card deal-card-compact ${
                                snapshotDraggable.isDragging ? 'dragging' : ''
                              } ${
                                movingId === deal.id ? 'deal-card-updating' : ''
                              }`}
                              onClick={(event) => handleCardClick(event, deal)}
                            >
                              <div className="deal-card-top-compact">
                                <h4>{deal.title}</h4>
                                <span className="deal-value-compact">
                                  R$ {(deal.value || 0).toLocaleString('pt-BR')}
                                </span>
                              </div>

                              <div className="deal-card-info-row">
                                {deal.contact ? (
                                  <span className="deal-card-entity">{deal.contact.name}</span>
                                ) : deal.lead ? (
                                  <span className="deal-card-entity">{deal.lead.name}</span>
                                ) : null}

                                {deal.expectedCloseDate ? (
                                  <span className="deal-card-date">
                                    {new Date(deal.expectedCloseDate).toLocaleDateString('pt-BR')}
                                  </span>
                                ) : null}

                                {deal.lead?.score ? (
                                  <span className="deal-card-score">{deal.lead.score}</span>
                                ) : null}
                              </div>

                              <div className="deal-card-actions" onClick={(e) => e.preventDefault()}>
                                {stage !== 'won' ? (
                                  <button
                                    type="button"
                                    className="deal-card-action-btn deal-card-action-won"
                                    title="Marcar como ganho"
                                    onClick={(e) => { e.stopPropagation(); handleCloseDealWon(deal); }}
                                  >
                                    ✓
                                  </button>
                                ) : null}
                                {stage !== 'lost' ? (
                                  <button
                                    type="button"
                                    className="deal-card-action-btn deal-card-action-lost"
                                    title="Marcar como perdido"
                                    onClick={(e) => { e.stopPropagation(); handleCloseDealLost(deal); }}
                                  >
                                    ✗
                                  </button>
                                ) : null}
                                <button
                                  type="button"
                                  className="deal-card-action-btn deal-card-action-delete"
                                  title="Remover negócio"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteDeal(deal); }}
                                >
                                  🗑
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}

                      {provided.placeholder}

                      {items.length === 0 ? (
                        <div className="empty-column">
                          Arraste um negócio para cá
                        </div>
                      ) : null}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {selectedDeal ? (
        <DealDetailsModal
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onUpdated={async () => {
            await loadKanban();
          }}
          onDeleteDeal={handleDeleteDeal}
          onCloseDealWon={handleCloseDealWon}
          onCloseDealLost={handleCloseDealLost}
        />
      ) : null}
    </div>
  );
}

export default DealsPage;