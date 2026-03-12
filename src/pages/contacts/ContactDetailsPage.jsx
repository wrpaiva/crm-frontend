import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getContactById } from '../../services/contact.service';

function ContactDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [contact, setContact] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadContact();
  }, [id]);

  async function loadContact() {
    try {
      setLoading(true);
      setError('');

      const data = await getContactById(id);
      setContact(data);
    } catch (err) {
      console.error('Erro ao carregar contato:', err);
      setError('Não foi possível carregar o contato.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <p>Carregando contato...</p>;
  }

  if (error) {
    return (
      <div className="card">
        <p className="error-text">{error}</p>
        <button className="secondary-button" onClick={() => navigate('/contacts')}>
          Voltar
        </button>
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="card">
        <p>Contato não encontrado.</p>
        <button className="secondary-button" onClick={() => navigate('/contacts')}>
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="page-title-row">
        <div>
          <h1>{contact.name}</h1>
          <p className="page-subtitle">Detalhes do contato</p>
        </div>

        <button className="secondary-button" onClick={() => navigate('/contacts')}>
          Voltar
        </button>
      </div>

      <div className="dashboard-block-grid">
        <div className="card dashboard-panel">
          <h2>Informações principais</h2>

          <div className="summary-list">
            <SummaryRow label="Nome" value={contact.name} />
            <SummaryRow label="Empresa" value={contact.company || '-'} />
            <SummaryRow label="E-mail" value={contact.email || '-'} />
            <SummaryRow label="Telefone" value={contact.phone || '-'} />
            <SummaryRow
              label="Criado em"
              value={
                contact.createdAt
                  ? new Date(contact.createdAt).toLocaleString('pt-BR')
                  : '-'
              }
            />
          </div>
        </div>

        <div className="card dashboard-panel">
          <h2>Tags</h2>

          <div className="tags-row">
            {(contact.tags || []).length ? (
              contact.tags.map((tag) => (
                <span key={`${contact.id}-${tag}`} className="tag-chip">
                  {tag}
                </span>
              ))
            ) : (
              <p className="muted-text">Sem tags cadastradas.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="summary-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export default ContactDetailsPage;