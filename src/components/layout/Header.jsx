import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  function handleLogout() {
    logout();
    toast.info('Sessão encerrada.');
    navigate('/login');
  }

  return (
    <header className="header">
      <div>
        <strong>{user?.name || 'Usuário'}</strong>
        <p className="header-subtitle">{user?.role || 'seller'}</p>
      </div>

      <button className="secondary-button" onClick={handleLogout}>
        Sair
      </button>
    </header>
  );
}

export default Header;