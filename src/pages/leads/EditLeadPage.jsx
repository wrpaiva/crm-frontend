import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getLeadById, updateLead } from '../../services/lead.service';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/http';

function EditLeadPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    source: 'manual',
    notes: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadLead() {
      try {
        const data = await getLeadById(id);
        setForm({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          company: data.company || '',
          source: data.source || 'manual',
          notes: Array.isArray(data.notes) ? data.notes.join('\n') : ''
        });
      } catch (err) {
        toast.error(getErrorMessage(err, 'Erro ao carregar lead.'));
        navigate(`/leads/${id}`);
      } finally {
        setLoading(false);
      }
    }

    loadLead();
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
      [name]: ''
    }));
  }

  function validateForm() {
    const nextErrors = {};

    if (!form.name.trim()) {
      nextErrors.name = 'Informe o nome do lead.';
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
        source: form.source,
        notes: form.notes.trim() ? form.notes.trim().split('\n').filter(Boolean) : []
      };

      await updateLead(id, payload);

      toast.success('Lead atualizado com sucesso.');
      navigate(`/leads/${id}`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao atualizar lead.'));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    navigate(`/leads/${id}`);
  }

  if (loading) {
    return <p>Carregando lead...</p>;
  }

  return (
    <div>
      <div className="page-title-row">
        <div>
          <h1>Editar Lead</h1>
          <p className="page-subtitle">
            Atualize as informações do lead
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
                placeholder="Nome do lead"
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

            <div className="form-field">
              <label>Origem</label>
              <select name="source" value={form.source} onChange={handleChange}>
                <option value="manual">Manual</option>
                <option value="site">Site</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="instagram">Instagram</option>
                <option value="facebook">Facebook</option>
                <option value="indicacao">Indicação</option>
              </select>
            </div>

            <div className="form-field form-field-full">
              <label>Notas</label>
              <textarea
                name="notes"
                rows="5"
                placeholder="Notas sobre o lead (uma por linha)"
                value={form.notes}
                onChange={handleChange}
              />
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

export default EditLeadPage;
