import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFavorites, removeFavorite } from '../../services/favorite.service';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/http';

const entityTypeLabels = {
  lead: 'Lead',
  contact: 'Contato',
  deal: 'Negócio'
};

const entityRoutes = {
  lead: '/leads',
  contact: '/contacts',
  deal: '/deals'
};

function FavoritesPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFavorites();
  }, []);

  async function loadFavorites() {
    try {
      setLoading(true);
      const data = await getFavorites();
      setFavorites(data);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao carregar favoritos.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(favoriteId) {
    try {
      await removeFavorite(favoriteId);
      toast.success('Favorito removido.');
      setFavorites((prev) => prev.filter((f) => f._id !== favoriteId));
    } catch (err) {
      toast.error(getErrorMessage(err, 'Erro ao remover favorito.'));
    }
  }

  function handleNavigate(fav) {
    const base = entityRoutes[fav.entityType];
    if (base) {
      navigate(`${base}/${fav.entityId}`);
    }
  }

  if (loading) {
    return <p>Carregando favoritos...</p>;
  }

  return (
    <div>
      <div className="page-title-row">
        <div>
          <h1>Favoritos</h1>
          <p className="page-subtitle">Seus itens marcados como favorito</p>
        </div>
      </div>

      {favorites.length === 0 ? (
        <div className="card">
          <p className="muted-text" style={{ textAlign: 'center', padding: 20 }}>
            Nenhum favorito adicionado ainda. Marque leads, contatos ou negócios como favoritos
            para acessá-los rapidamente.
          </p>
        </div>
      ) : (
        <div className="table-card">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Nome</th>
                <th>Adicionado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {favorites.map((fav) => (
                <tr key={fav._id}>
                  <td>
                    <span className={`stage-badge stage-${fav.entityType}`}>
                      {entityTypeLabels[fav.entityType] || fav.entityType}
                    </span>
                  </td>
                  <td>
                    <button
                      className="link-button"
                      onClick={() => handleNavigate(fav)}
                    >
                      <strong>{fav.entityName}</strong>
                    </button>
                  </td>
                  <td>{new Date(fav.createdAt).toLocaleString('pt-BR')}</td>
                  <td>
                    <button
                      className="secondary-button"
                      onClick={() => handleRemove(fav._id)}
                    >
                      Remover
                    </button>
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

export default FavoritesPage;
