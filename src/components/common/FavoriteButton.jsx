import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { checkFavorite, addFavorite, removeFavorite } from '../../services/favorite.service';

function FavoriteButton({ entityType, entityId }) {
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const result = await checkFavorite(entityType, entityId);
        setIsFavorite(result.isFavorite);
        setFavoriteId(result.favoriteId);
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    }

    if (entityType && entityId) {
      load();
    }
  }, [entityType, entityId]);

  async function handleToggle() {
    try {
      if (isFavorite && favoriteId) {
        await removeFavorite(favoriteId);
        setIsFavorite(false);
        setFavoriteId(null);
      } else {
        const result = await addFavorite(entityType, entityId);
        setIsFavorite(true);
        setFavoriteId(result._id);
      }
    } catch {
      // silently fail
    }
  }

  if (loading) return null;

  return (
    <button
      className="icon-button"
      onClick={handleToggle}
      title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      type="button"
    >
      <Star
        size={18}
        fill={isFavorite ? '#f59e0b' : 'none'}
        color={isFavorite ? '#f59e0b' : 'currentColor'}
      />
    </button>
  );
}

export default FavoriteButton;
