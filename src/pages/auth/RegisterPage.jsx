import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { registerRequest } from '../../services/auth.service';
import { useToast } from '../../hooks/useToast';

function RegisterPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!form.name.trim()) {
      setError('Informe o nome.');
      return;
    }
    if (!form.email.trim()) {
      setError('Informe o e-mail.');
      return;
    }
    if (!form.password || form.password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    try {
      setSaving(true);
      await registerRequest({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password
      });
      toast.success('Conta criada com sucesso. Faça login para continuar.');
      navigate('/login');
    } catch (err) {
      const message = err?.response?.data?.message || 'Erro ao criar conta.';
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-form" onSubmit={handleSubmit}>
        <h1>Criar Conta</h1>
        <p className="register-subtitle">Preencha os dados para se cadastrar</p>

        <input
          type="text"
          name="name"
          placeholder="Nome completo"
          value={form.name}
          onChange={handleChange}
        />

        <input
          type="email"
          name="email"
          placeholder="E-mail"
          value={form.email}
          onChange={handleChange}
        />

        <input
          type="password"
          name="password"
          placeholder="Senha (mín. 6 caracteres)"
          value={form.password}
          onChange={handleChange}
        />

        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirmar senha"
          value={form.confirmPassword}
          onChange={handleChange}
        />

        {error ? <p className="error-text">{error}</p> : null}

        <button type="submit" disabled={saving}>
          {saving ? 'Criando...' : 'Criar Conta'}
        </button>

        <p className="register-link">
          Já tem uma conta?{' '}
          <a href="/login">Entrar</a>
        </p>
      </form>
    </div>
  );
}

export default RegisterPage;
