import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getContacts } from '../../services/contact.service';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/http';
import PageLoader from '../../components/common/PageLoader';
import EmptyState from '../../components/common/EmptyState';

function ContactsPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadContacts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadContacts(currentSearch = search) {
    try {
      setLoading(true);
      setError('');

      const params = currentSearch ? { search: currentSearch } : {};
      const data = await getContacts(params);
      setResponse(data);
    } catch (err) {
      console.error('Erro ao carregar contatos:', err);
      setError('Não foi possível carregar os contatos.');
      toast.error(getErrorMessage(err, 'Não foi possível carregar os contatos.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    await loadContacts(search);
  }

  const contacts = useMemo(() => {
    return response?.data || [];
  }, [response]);

  const meta = response?.meta || null;

  if (loading) {
    return <PageLoader text="Carregando contatos..." />;
  }

  return (
    <div>
      <div className="page-title-row">
        <div>
          <h1>Contatos</h1>
          <p className="page-subtitle">
            Visualize e acompanhe sua base de contatos e clientes
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="secondary-button" onClick={() => loadContacts()}>
            Atualizar
          </button>

          <button className="primary-button" onClick={() => navigate('/contacts/new')}>
            Novo Contato
          </button>
        </div>
      </div>

      <form className="toolbar-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Buscar por nome, email, telefone ou empresa"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <button className="primary-button" type="submit">
          Buscar
        </button>
      </form>

      {meta ? (
        <div className="list-summary">
          <span>Total: {meta.total}</span>
          <span>Página: {meta.page}</span>
          <span>Limite: {meta.limit}</span>
        </div>
      ) : null}

      {error ? (
        <div className="card" style={{ marginBottom: 16 }}>
          <p className="error-text">{error}</p>
        </div>
      ) : null}

      {contacts.length === 0 ? (
        <EmptyState
          title="Nenhum contato encontrado"
          description="Quando houver contatos cadastrados, eles aparecerão aqui."
        />
      ) : (
        <div className="table-card">
          <table className="crm-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Empresa</th>
                <th>E-mail</th>
                <th>Telefone</th>
                <th>Tags</th>
              </tr>
            </thead>

            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id}>
                  <td>
                    <Link to={`/contacts/${contact.id}`}>
                      <strong>{contact.name}</strong>
                    </Link>
                  </td>

                  <td>{contact.company || '-'}</td>

                  <td>{contact.email || '-'}</td>

                  <td>{contact.phone || '-'}</td>

                  <td>
                    <div className="tags-row">
                      {(contact.tags || []).length ? (
                        contact.tags.map((tag) => (
                          <span key={`${contact.id}-${tag}`} className="tag-chip">
                            {tag}
                          </span>
                        ))
                      ) : (
                        <span>-</span>
                      )}
                    </div>
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

export default ContactsPage;