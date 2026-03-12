import { NavLink } from 'react-router-dom';

function Sidebar() {
  return (
    <aside className="sidebar">
      <h2>CRM Pro</h2>

      <nav className="sidebar-nav">
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Dashboard
        </NavLink>

        <NavLink to="/leads" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Leads
        </NavLink>

        <NavLink to="/contacts" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Contatos
        </NavLink>

        <NavLink to="/deals/kanban" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Kanban
        </NavLink>

        <NavLink to="/activities" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          Atividades
        </NavLink>
      </nav>
    </aside>
  );
}

export default Sidebar;