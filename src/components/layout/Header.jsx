import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../hooks/useToast';
import { Search, Bell, ChevronDown } from 'lucide-react';

function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  function handleLogout() {
    logout();
    toast.info('Sessão encerrada.');
    navigate('/login');
  }

  const initials = user?.name
    ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'US';

  return (
    <header className="header">
      <div className="header-search">
        <Search size={18} className="header-search-icon" />
        <input type="text" placeholder="Buscar aqui..." />
      </div>

      <div className="header-actions">
        <button className="header-notification">
          <Bell size={18} />
          <span className="header-notification-badge"></span>
        </button>

        <button className="header-user" onClick={handleLogout}>
          <div className="header-avatar">
            {initials}
          </div>
          <ChevronDown size={16} className="header-user-chevron" />
        </button>
      </div>
    </header>
  );
}

export default Header;