import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import LeadsPage from '../pages/leads/LeadsPage';
import LeadDetailsPage from '../pages/leads/LeadDetailsPage';
import ContactsPage from '../pages/contacts/ContactsPage';
import ContactDetailsPage from '../pages/contacts/ContactDetailsPage';
import DealsPage from '../pages/deals/DealsPage';
import KanbanPage from '../pages/deals/KanbanPage';
import ActivitiesPage from '../pages/activities/ActivitiesPage';
import NotFoundPage from '../pages/NotFoundPage';
import ProtectedRoute from '../components/common/ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';
import NewLeadPage from '../pages/leads/NewLeadPage';
import NewContactPage from '../pages/contacts/NewContactPage';
import NewDealPage from '../pages/deals/NewDealPage';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />

        <Route path="dashboard" element={<DashboardPage />} />

        <Route path="leads" element={<LeadsPage />} />
        <Route path="leads/new" element={<NewLeadPage />} />
        <Route path="leads/:id" element={<LeadDetailsPage />} />

        <Route path="contacts" element={<ContactsPage />} />
        <Route path="contacts/:id" element={<ContactDetailsPage />} />
        <Route path="contacts/new" element={<NewContactPage />} />

        <Route path="deals" element={<DealsPage />} />
        <Route path="deals/new" element={<NewDealPage />} />
        <Route path="deals/kanban" element={<KanbanPage />} />

        <Route path="activities" element={<ActivitiesPage />} />
        
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;