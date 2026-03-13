import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header.jsx';

function AppLayout() {
  const [sidebarExpanded, setSidebarExpanded] = useState(true);

  useEffect(() => {
    const handleToggle = (e) => {
      setSidebarExpanded(e.detail.expanded);
    };

    window.addEventListener('sidebar-toggle', handleToggle);
    return () => window.removeEventListener('sidebar-toggle', handleToggle);
  }, []);

  return (
    <div className={`app-shell ${sidebarExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
      <Sidebar />
      <div className="app-content">
        <Header />
        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default AppLayout;