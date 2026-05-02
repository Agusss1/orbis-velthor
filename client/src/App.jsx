import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/auth/LoginPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import AreasPage from './pages/areas/AreasPage';
import AreaDetailPage from './pages/areas/AreaDetailPage';
import DocumentsPage from './pages/documents/DocumentsPage';
import LegislativePage from './pages/legislative/LegislativePage';
import ExpedienteDetailPage from './pages/legislative/ExpedienteDetailPage';
import ChatPage from './pages/chat/ChatPage';
import SurveysPage from './pages/surveys/SurveysPage';
import SurveyDetailPage from './pages/surveys/SurveyDetailPage';
import PublicSurveyPage from './pages/surveys/PublicSurveyPage';
import TerritoriesPage from './pages/territories/TerritoriesPage';
import IntelligencePage from './pages/intelligence/IntelligencePage';
import CoordinatorsPage from './pages/coordinators/CoordinatorsPage';
import UsersPage from './pages/users/UsersPage';

const ProtectedRoute = ({ children, minRole }) => {
  const { user, loading, hasMinRole } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin w-8 h-8 border-2 border-orbis-500 border-t-transparent rounded-full" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (minRole && !hasMinRole(minRole)) return <Navigate to="/" replace />;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
      <Route path="/survey/:token" element={<PublicSurveyPage />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="areas" element={<AreasPage />} />
        <Route path="areas/:id" element={<AreaDetailPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="legislative" element={<LegislativePage />} />
        <Route path="legislative/:id" element={<ExpedienteDetailPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="surveys" element={<SurveysPage />} />
        <Route path="surveys/:id" element={<SurveyDetailPage />} />
        <Route path="territories" element={<TerritoriesPage />} />
        <Route path="intelligence" element={<ProtectedRoute minRole="SUPER_ADMIN"><IntelligencePage /></ProtectedRoute>} />
        <Route path="coordinators" element={<ProtectedRoute minRole="POLITICAL_COORDINATOR"><CoordinatorsPage /></ProtectedRoute>} />
        <Route path="users" element={<ProtectedRoute minRole="AREA_MANAGER"><UsersPage /></ProtectedRoute>} />
      </Route>
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
