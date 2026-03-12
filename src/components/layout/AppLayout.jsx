import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header.jsx';

function AppLayout() {
  return (
    <div className="app-shell">
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