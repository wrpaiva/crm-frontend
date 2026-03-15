import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getContactById, updateContact } from '../../services/contact.service';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/http';

function EditContactPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    tags: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadContact() {
      try {
        const data = await getContactById(id);
        setForm({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          company: data.company || '',
          tags: Array.isArray(data.tags) ? data.tags.join(', ') : ''
        });
      } catch (err) {
        toast.error(getErrorMessage(err, 'Erro ao carregar contato.'));
        navigate(`/contacts/${id}`);
      } finally {
        setLoading(false);
      }
    }

    loadContact();
  }, [id]);

  const canSubmit = useMemo(() => {
    return form.name.trim() && (form.email.trim() || form.phone.trim());
  }, [form]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: '',
      contact: ''
    }));
  }

  function validateForm() {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = 'Informe o nome do contato.';
    }

    if (!form.email.trim() && !form.phone.trim()) {
      nextErrors.contact = 'Informe ao menos e-mail ou telefone.';
    }

    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      nextErrors.email = 'Informe um e-mail válido.';
    }

    setErrors(nextErrors);

    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        company: form.company.trim() || undefined,
        tags: form.tags.trim()
          ? form.tags
              .split(',')
              .map((tag) => tag.trim())
              .filter(Boolean)
          : []
      };

      await updateContact(id, payload);

      toast.success('Contato atualizado com sucesso.');
      navigate(`/contacts/${id}`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao atualizar contato.'));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    navigate(`/contacts/${id}`);
  }

  if (loading) {
    return <p>Carregando contato...</p>;
  }

  return (
    <div>
      <div className="page-title-row">
        <div>
          <h1>Editar Contato</h1>
          <p className="page-subtitle">
            Atualize as informações do contato
          </p>
        </div>

        <button className="secondary-button" onClick={handleCancel} type="button">
          Voltar
        </button>
      </div>

      <div className="form-page-container">
        <form className="crm-form-card" onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label>Nome *</label>
              <input
                name="name"
                type="text"
                placeholder="Nome do contato"
                value={form.name}
                onChange={handleChange}
              />
              {errors.name ? <small className="field-error">{errors.name}</small> : null}
            </div>

            <div className="form-field">
              <label>Empresa</label>
              <input
                name="company"
                type="text"
                placeholder="Empresa"
                value={form.company}
                onChange={handleChange}
              />
            </div>

            <div className="form-field">
              <label>E-mail</label>
              <input
                name="email"
                type="email"
                placeholder="email@empresa.com"
                value={form.email}
                onChange={handleChange}
              />
              {errors.email ? <small className="field-error">{errors.email}</small> : null}
            </div>

            <div className="form-field">
              <label>Telefone</label>
              <input
                name="phone"
                type="text"
                placeholder="(11) 99999-9999"
                value={form.phone}
                onChange={handleChange}
              />
            </div>

            <div className="form-field form-field-full">
              <label>Tags</label>
              <input
                name="tags"
                type="text"
                placeholder="vip, cliente, renovacao"
                value={form.tags}
                onChange={handleChange}
              />
              <small>Separe múltiplas tags por vírgula.</small>
            </div>
          </div>

          {errors.contact ? (
            <div className="form-alert-error">{errors.contact}</div>
          ) : null}

          <div className="form-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancelar
            </button>

            <button
              type="submit"
              className="primary-button"
              disabled={!canSubmit || saving}
            >
              {saving ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EditContactPage;
