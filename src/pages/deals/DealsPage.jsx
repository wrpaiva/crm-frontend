import { useEffect, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { getKanban, updateDealStage } from '../../services/deal.service';
import DealDetailsModal from '../../components/deals/DealDetailsModal';
import { useNavigate } from 'react-router-dom';

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
                              className={`deal-card ${
                                snapshotDraggable.isDragging ? 'dragging' : ''
                              } ${
                                movingId === deal.id ? 'deal-card-updating' : ''
                              }`}
                              onClick={(event) => handleCardClick(event, deal)}
                            >
                              <div className="deal-card-top">
                                <h4>{deal.title}</h4>

                                <span className={`stage-badge stage-${deal.stage}`}>
                                  {stageLabels[deal.stage]}
                                </span>
                              </div>

                              <p className="deal-value">
                                R$ {(deal.value || 0).toLocaleString('pt-BR')}
                              </p>

                              {deal.contact ? (
                                <div className="deal-meta">
                                  <span>Contato</span>
                                  <strong>{deal.contact.name}</strong>
                                </div>
                              ) : null}

                              {deal.lead ? (
                                <div className="deal-meta">
                                  <span>Lead</span>
                                  <strong>{deal.lead.name}</strong>
                                </div>
                              ) : null}

                              {deal.expectedCloseDate ? (
                                <div className="deal-meta">
                                  <span>Previsão</span>
                                  <strong>
                                    {new Date(deal.expectedCloseDate).toLocaleDateString(
                                      'pt-BR'
                                    )}
                                  </strong>
                                </div>
                              ) : null}

                              {deal.notes?.length ? (
                                <div className="deal-notes">{deal.notes[0]}</div>
                              ) : null}
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
        />
      ) : null}
    </div>
  );
}

export default DealsPage;