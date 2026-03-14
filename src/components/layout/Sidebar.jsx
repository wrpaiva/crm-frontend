import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Kanban,
  CalendarCheck,
  Home,
  BarChart3,
  ShoppingCart,
  Package,
  FileText,
  Bot,
  Settings,
  Target,
  Star,
  Clock,
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

const iconMenuItems = [
  { icon: Home, path: '/dashboard', label: 'Dashboard' },
  { icon: BarChart3, path: '/deals/kanban', label: 'Kanban' },
  { icon: ShoppingCart, path: '/deals', label: 'Negócios' },
  { icon: Package, path: '/leads', label: 'Leads' },
  { icon: FileText, path: '/activities', label: 'Atividades' },
  { icon: Target, path: '/metas', label: 'Metas' },
  { icon: UserCircle, path: '/contacts', label: 'Contatos' },
  { icon: Bot, path: '/chat', label: 'IA Consultiva' },
];

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { icon: Users, label: 'Leads', path: '/leads' },
  { icon: UserCircle, label: 'Contatos', path: '/contacts' },
  { icon: Kanban, label: 'Kanban', path: '/deals/kanban' },
  { icon: CalendarCheck, label: 'Atividades', path: '/activities' },
  { icon: Target, label: 'Metas', path: '/metas' },
];

const secondaryItems = [
  { icon: Bot, label: 'IA Consultiva', path: '/chat' },
  { icon: Settings, label: 'Configurações', path: '#' },
  { icon: Star, label: 'Favoritos', path: '#' },
  { icon: Clock, label: 'Histórico', path: '#' },
];

function Sidebar() {
  const location = useLocation();
  const [isExpanded, setIsExpanded] = useState(true);
  
  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded);
    // Dispara evento customizado para o layout ajustar
    window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { expanded: !isExpanded } }));
  };

  return (
    <aside className={`sidebar-container ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Coluna de ícones */}
      <div className="sidebar-icons">
        <button className="sidebar-toggle" onClick={toggleSidebar}>
          {isExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>
        
        <div className="sidebar-icons-list">
          {iconMenuItems.map(({ icon: Icon, path, label }) => (
            <NavLink
              key={path}
              to={path}
              className={`sidebar-icon-item ${isActive(path) ? 'active' : ''}`}
              title={label}
            >
              <Icon size={20} />
            </NavLink>
          ))}
        </div>
      </div>

      {/* Menu expandido */}
      <div className="sidebar-menu">
        <div className="sidebar-logo">
          <div className="sidebar-logo-dots">
            <span className="sidebar-logo-dot red"></span>
            <span className="sidebar-logo-dot yellow"></span>
            <span className="sidebar-logo-dot green"></span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map(({ icon: Icon, label, path }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
            >
              <Icon size={18} />
              <span className="nav-label">{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-divider"></div>

        <nav className="sidebar-nav">
          {secondaryItems.map(({ icon: Icon, label, path }) =>
            path === '#' ? (
              <a key={label} href={path} className="nav-link">
                <Icon size={18} />
                <span className="nav-label">{label}</span>
              </a>
            ) : (
              <NavLink
                key={label}
                to={path}
                className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
              >
                <Icon size={18} />
                <span className="nav-label">{label}</span>
              </NavLink>
            )
          )}
        </nav>

        <div className="sidebar-divider"></div>

        <nav className="sidebar-nav">
          <a href="#" className="nav-link">
            <LogOut size={18} />
            <span className="nav-label">Sair</span>
          </a>
        </nav>
      </div>
    </aside>
  );
}

export default Sidebar;