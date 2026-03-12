import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getContacts } from '../../services/contact.service';
import { createDeal } from '../../services/deal.service';
import { getLeads } from '../../services/lead.service';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/http';
import PageLoader from '../../components/common/PageLoader';

const stageOptions = [
  { value: 'lead', label: 'Lead' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'negotiation', label: 'Negotiation' }
];

const initialForm = {
  title: '',
  value: '',
  stage: 'lead',
  contactId: '',
  leadId: '',
  expectedCloseDate: '',
  note: ''
};

function NewDealPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState(initialForm);
  const [contacts, setContacts] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    loadOptions();
  }, []);

  async function loadOptions() {
    try {
      setLoadingOptions(true);

      const [contactsResponse, leadsResponse] = await Promise.all([
        getContacts(),
        getLeads()
      ]);

      setContacts(contactsResponse?.data || []);
      setLeads(leadsResponse?.data || []);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao carregar contatos e leads.'));
    } finally {
      setLoadingOptions(false);
    }
  }

  const canSubmit = useMemo(() => {
    return (
      form.title.trim() &&
      (form.contactId || form.leadId)
    );
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
      relation: ''
    }));
  }

  function validateForm() {
    const nextErrors = {};

    if (!form.title.trim()) {
      nextErrors.title = 'Informe o título do negócio.';
    }

    if (!form.contactId && !form.leadId) {
      nextErrors.relation = 'Selecione um contato ou um lead.';
    }

    if (form.value && Number(form.value) < 0) {
      nextErrors.value = 'O valor não pode ser negativo.';
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
        title: form.title.trim(),
        value: form.value ? Number(form.value) : 0,
        stage: form.stage,
        contactId: form.contactId || null,
        leadId: form.leadId || null,
        expectedCloseDate: form.expectedCloseDate || null,
        notes: form.note.trim() ? [form.note.trim()] : []
      };

      const createdDeal = await createDeal(payload);

      toast.success('Negócio criado com sucesso.');
      navigate(`/deals/kanban`);
      return createdDeal;
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao criar negócio.'));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    navigate('/deals/kanban');
  }

  if (loadingOptions) {
    return <PageLoader text="Carregando contatos e leads..." />;
  }

  return (
    <div>
      <div className="page-title-row">
        <div>
          <h1>Novo Negócio</h1>
          <p className="page-subtitle">
            Crie uma oportunidade comercial e envie para o pipeline
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
              <label>Título *</label>
              <input
                name="title"
                type="text"
                placeholder="Ex.: Plano Enterprise - Cliente X"
                value={form.title}
                onChange={handleChange}
              />
              {errors.title ? <small className="field-error">{errors.title}</small> : null}
            </div>

            <div className="form-field">
              <label>Valor</label>
              <input
                name="value"
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={form.value}
                onChange={handleChange}
              />
              {errors.value ? <small className="field-error">{errors.value}</small> : null}
            </div>

            <div className="form-field">
              <label>Estágio inicial</label>
              <select name="stage" value={form.stage} onChange={handleChange}>
                {stageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Previsão de fechamento</label>
              <input
                name="expectedCloseDate"
                type="date"
                value={form.expectedCloseDate}
                onChange={handleChange}
              />
            </div>

            <div className="form-field">
              <label>Contato</label>
              <select
                name="contactId"
                value={form.contactId}
                onChange={handleChange}
              >
                <option value="">Selecione um contato</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.name} {contact.company ? `- ${contact.company}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field">
              <label>Lead</label>
              <select
                name="leadId"
                value={form.leadId}
                onChange={handleChange}
              >
                <option value="">Selecione um lead</option>
                {leads.map((lead) => (
                  <option key={lead.id} value={lead.id}>
                    {lead.name} {lead.company ? `- ${lead.company}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-field form-field-full">
              <label>Nota inicial</label>
              <textarea
                name="note"
                rows="5"
                placeholder="Observações iniciais sobre essa oportunidade"
                value={form.note}
                onChange={handleChange}
              />
            </div>
          </div>

          {errors.relation ? (
            <div className="form-alert-error">{errors.relation}</div>
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
              {saving ? 'Salvando...' : 'Salvar Negócio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewDealPage;