import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createGoal } from '../../services/goal.service';
import { useToast } from '../../hooks/useToast';
import { getErrorMessage } from '../../utils/http';

const initialForm = {
  title: '',
  type: 'monthly',
  category: 'revenue',
  baseValue: '',
  minimumPercent: '80',
  desiredPercent: '100',
  superPercent: '120',
  startDate: '',
  endDate: '',
  notes: ''
};

function NewMetaPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const canSubmit = useMemo(() => {
    return (
      form.title.trim() &&
      form.baseValue &&
      Number(form.baseValue) > 0 &&
      form.startDate &&
      form.endDate &&
      form.endDate > form.startDate
    );
  }, [form]);

  const preview = useMemo(() => {
    const base = Number(form.baseValue) || 0;
    const min = Number(form.minimumPercent) || 0;
    const des = Number(form.desiredPercent) || 0;
    const sup = Number(form.superPercent) || 0;

    return {
      minimum: (base * min / 100).toLocaleString('pt-BR'),
      desired: (base * des / 100).toLocaleString('pt-BR'),
      super: (base * sup / 100).toLocaleString('pt-BR')
    };
  }, [form.baseValue, form.minimumPercent, form.desiredPercent, form.superPercent]);

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

    if (!form.title.trim()) {
      nextErrors.title = 'Informe o título da meta.';
    }

    if (!form.baseValue || Number(form.baseValue) <= 0) {
      nextErrors.baseValue = 'Informe um valor base positivo.';
    }

    if (!form.startDate) {
      nextErrors.startDate = 'Informe a data de início.';
    }

    if (!form.endDate) {
      nextErrors.endDate = 'Informe a data final.';
    }

    if (form.startDate && form.endDate && form.endDate <= form.startDate) {
      nextErrors.endDate = 'A data final deve ser posterior à data de início.';
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
        type: form.type,
        category: form.category,
        baseValue: Number(form.baseValue),
        minimumPercent: Number(form.minimumPercent),
        desiredPercent: Number(form.desiredPercent),
        superPercent: Number(form.superPercent),
        startDate: form.startDate,
        endDate: form.endDate,
        notes: form.notes.trim() || undefined
      };

      const createdGoal = await createGoal(payload);

      toast.success('Meta criada com sucesso.');
      navigate(`/metas/${createdGoal.id}`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Erro ao criar meta.'));
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    navigate('/metas');
  }

  return (
    <div>
      <div className="page-title-row">
        <div>
          <h1>Nova Meta</h1>
          <p className="page-subtitle">
            Cadastre uma nova meta para acompanhamento comercial
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
                placeholder="Ex: Faturamento Março"
                value={form.title}
                onChange={handleChange}
              />
              {errors.title ? <small className="field-error">{errors.title}</small> : null}
            </div>

            <div className="form-field">
              <label>Tipo *</label>
              <select name="type" value={form.type} onChange={handleChange}>
                <option value="monthly">Mensal</option>
                <option value="quarterly">Trimestral</option>
              </select>
            </div>

            <div className="form-field">
              <label>Categoria *</label>
              <select name="category" value={form.category} onChange={handleChange}>
                <option value="revenue">Faturamento</option>
                <option value="deals">Negócios</option>
                <option value="leads">Leads</option>
                <option value="conversion">Conversão</option>
              </select>
            </div>

            <div className="form-field">
              <label>Valor Base *</label>
              <input
                name="baseValue"
                type="number"
                placeholder="Ex: 100000"
                value={form.baseValue}
                onChange={handleChange}
                min="0"
                step="any"
              />
              {errors.baseValue ? <small className="field-error">{errors.baseValue}</small> : null}
            </div>

            <div className="form-field">
              <label>% Mínimo</label>
              <input
                name="minimumPercent"
                type="number"
                placeholder="80"
                value={form.minimumPercent}
                onChange={handleChange}
                min="1"
              />
            </div>

            <div className="form-field">
              <label>% Desejado</label>
              <input
                name="desiredPercent"
                type="number"
                placeholder="100"
                value={form.desiredPercent}
                onChange={handleChange}
                min="1"
              />
            </div>

            <div className="form-field">
              <label>% Supermeta</label>
              <input
                name="superPercent"
                type="number"
                placeholder="120"
                value={form.superPercent}
                onChange={handleChange}
                min="1"
              />
            </div>

            <div className="form-field">
              <label>Data Início *</label>
              <input
                name="startDate"
                type="date"
                value={form.startDate}
                onChange={handleChange}
              />
              {errors.startDate ? <small className="field-error">{errors.startDate}</small> : null}
            </div>

            <div className="form-field">
              <label>Data Fim *</label>
              <input
                name="endDate"
                type="date"
                value={form.endDate}
                onChange={handleChange}
              />
              {errors.endDate ? <small className="field-error">{errors.endDate}</small> : null}
            </div>

            <div className="form-field form-field-full">
              <label>Observações</label>
              <textarea
                name="notes"
                placeholder="Anotações sobre a meta..."
                value={form.notes}
                onChange={handleChange}
                rows={3}
              />
            </div>
          </div>

          {form.baseValue && Number(form.baseValue) > 0 ? (
            <div className="goal-preview-card">
              <h3>Preview dos Valores</h3>
              <div className="goal-preview-grid">
                <div className="goal-preview-item">
                  <span className="goal-preview-label">Mínimo ({form.minimumPercent}%)</span>
                  <span className="goal-preview-value level-minimum-text">{preview.minimum}</span>
                </div>
                <div className="goal-preview-item">
                  <span className="goal-preview-label">Desejado ({form.desiredPercent}%)</span>
                  <span className="goal-preview-value level-desired-text">{preview.desired}</span>
                </div>
                <div className="goal-preview-item">
                  <span className="goal-preview-label">Supermeta ({form.superPercent}%)</span>
                  <span className="goal-preview-value level-super-text">{preview.super}</span>
                </div>
              </div>
            </div>
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
              {saving ? 'Salvando...' : 'Salvar Meta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewMetaPage;
