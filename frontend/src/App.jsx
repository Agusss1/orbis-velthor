import { Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Areas from './pages/Areas';
import AreaDetail from './pages/AreaDetail';
import Documents from './pages/Documents';
import Legislative from './pages/Legislative';
import ExpedienteDetail from './pages/ExpedienteDetail';
import Chat from './pages/Chat';
import Surveys from './pages/Surveys';
import SurveyPublic from './pages/SurveyPublic';
import MapView from './pages/MapView';
import Intelligence from './pages/Intelligence';
import Users from './pages/Users';

function PrivateRoute({ children, roles }) {
  const { isAuthenticated, hasRole } = useAuthStore();
  if (!isAuthenticated()) return <Navigate to="/login" replace />;
  if (roles && !hasRole(...roles)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated() ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/s/:token" element={<SurveyPublic />} />

      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="areas" element={<Areas />} />
        <Route path="areas/:id" element={<AreaDetail />} />
        <Route path="documents" element={<Documents />} />
        <Route path="legislative" element={<Legislative />} />
        <Route path="legislative/:id" element={<ExpedienteDetail />} />
        <Route path="chat" element={<Chat />} />
        <Route path="surveys" element={<Surveys />} />
        <Route path="map" element={<MapView />} />
        <Route path="intelligence" element={
          <PrivateRoute roles={['owner', 'super_admin']}>
            <Intelligence />
          </PrivateRoute>
        } />
        <Route path="users" element={
          <PrivateRoute roles={['owner', 'super_admin', 'political_coordinator']}>
            <Users />
          </PrivateRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
