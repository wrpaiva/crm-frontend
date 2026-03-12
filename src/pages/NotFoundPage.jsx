import { useNavigate } from 'react-router-dom';

function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="not-found-page">
      <div className="not-found-card">
        <span className="not-found-code">404</span>
        <h1>Página não encontrada</h1>
        <p>
          A rota que você tentou acessar não existe ou foi movida.
        </p>

        <div className="not-found-actions">
          <button className="primary-button" onClick={() => navigate('/dashboard')}>
            Ir para Dashboard
          </button>

          <button className="secondary-button" onClick={() => navigate(-1)}>
            Voltar
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;