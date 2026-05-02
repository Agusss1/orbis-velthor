import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { disconnectSocket } from '../services/socket';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('orbis_token');
    if (token) {
      api.get('/auth/me')
        .then(setUser)
        .catch(() => localStorage.removeItem('orbis_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email, password) => {
    const { token, user: u } = await api.post('/auth/login', { email, password });
    localStorage.setItem('orbis_token', token);
    setUser(u);
    return u;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('orbis_token');
    disconnectSocket();
    setUser(null);
  }, []);

  const hasRole = useCallback((roles) => {
    if (!user) return false;
    const r = Array.isArray(roles) ? roles : [roles];
    return r.includes(user.role);
  }, [user]);

  const HIERARCHY = { OWNER: 6, SUPER_ADMIN: 5, POLITICAL_COORDINATOR: 4, AREA_MANAGER: 3, LEGISLATOR: 2, BASIC_USER: 1 };
  const hasMinRole = useCallback((minRole) => {
    if (!user) return false;
    return (HIERARCHY[user.role] || 0) >= (HIERARCHY[minRole] || 0);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasRole, hasMinRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
