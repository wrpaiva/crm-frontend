import { Navigate, Route, Routes } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import DashboardPage from '../pages/dashboard/DashboardPage';
import LeadsPage from '../pages/leads/LeadsPage';
import LeadDetailsPage from '../pages/leads/LeadDetailsPage';
import ContactsPage from '../pages/contacts/ContactsPage';
import ContactDetailsPage from '../pages/contacts/ContactDetailsPage';
import DealsPage from '../pages/deals/DealsPage';
import KanbanPage from '../pages/deals/KanbanPage';
import ActivitiesPage from '../pages/activities/ActivitiesPage';
import MetasPage from '../pages/metas/MetasPage';
import NewMetaPage from '../pages/metas/NewMetaPage';
import MetaDetailsPage from '../pages/metas/MetaDetailsPage';
import NotFoundPage from '../pages/NotFoundPage';
import ProtectedRoute from '../components/common/ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';
import NewLeadPage from '../pages/leads/NewLeadPage';
import EditLeadPage from '../pages/leads/EditLeadPage';
import NewContactPage from '../pages/contacts/NewContactPage';
import EditContactPage from '../pages/contacts/EditContactPage';
import NewDealPage from '../pages/deals/NewDealPage';
import ChatPage from '../pages/chat/ChatPage';
import WhatsAppPage from '../pages/whatsapp/WhatsAppPage';
import SettingsPage from '../pages/settings/SettingsPage';
import FavoritesPage from '../pages/favorites/FavoritesPage';
import HistoryPage from '../pages/history/HistoryPage';

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

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
        <Route path="leads/:id/edit" element={<EditLeadPage />} />

        <Route path="contacts" element={<ContactsPage />} />
        <Route path="contacts/:id" element={<ContactDetailsPage />} />
        <Route path="contacts/:id/edit" element={<EditContactPage />} />
        <Route path="contacts/new" element={<NewContactPage />} />

        <Route path="deals" element={<DealsPage />} />
        <Route path="deals/new" element={<NewDealPage />} />
        <Route path="deals/kanban" element={<KanbanPage />} />

        <Route path="activities" element={<ActivitiesPage />} />

        <Route path="metas" element={<MetasPage />} />
        <Route path="metas/new" element={<NewMetaPage />} />
        <Route path="metas/:id" element={<MetaDetailsPage />} />

        <Route path="chat" element={<ChatPage />} />
        <Route path="whatsapp" element={<WhatsAppPage />} />
        <Route path="favorites" element={<FavoritesPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="settings" element={<SettingsPage />} />

        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRoutes;