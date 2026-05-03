import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Map, FileText, ScrollText, MessageSquare,
  ClipboardList, Globe, Shield, Users, LogOut, ChevronRight,
  Layers
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { authApi } from '../../api';
import toast from 'react-hot-toast';

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', exact: true },
  { to: '/areas', icon: Layers, label: 'Areas' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/legislative', icon: ScrollText, label: 'Legislative' },
  { to: '/chat', icon: MessageSquare, label: 'Chat' },
  { to: '/surveys', icon: ClipboardList, label: 'Surveys' },
  { to: '/map', icon: Map, label: 'Map & Territories' },
];

const ADMIN_NAV = [
  { to: '/users', icon: Users, label: 'Users', roles: ['owner', 'super_admin', 'political_coordinator'] },
  { to: '/intelligence', icon: Shield, label: 'Intelligence', roles: ['owner', 'super_admin'] },
];

export default function Sidebar() {
  const { user, logout, hasRole, refreshToken } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await authApi.logout(refreshToken);
    } catch {}
    logout();
    navigate('/login');
    toast.success('Logged out');
  };

  const roleColors = {
    owner: 'bg-yellow-500/20 text-yellow-400',
    super_admin: 'bg-purple-500/20 text-purple-400',
    political_coordinator: 'bg-blue-500/20 text-blue-400',
    area_manager: 'bg-green-500/20 text-green-400',
    legislator: 'bg-cyan-500/20 text-cyan-400',
    basic_user: 'bg-gray-500/20 text-gray-400',
  };

  return (
    <aside className="flex flex-col w-64 h-full bg-gray-900 border-r border-gray-800">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-800">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
          <Globe className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-base font-bold text-white tracking-tight">Orbis</h1>
          <p className="text-[10px] text-gray-500 leading-none">Velthor Technologies</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-brand-600/20 text-brand-400 border border-brand-600/30'
                  : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
              }`
            }
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </NavLink>
        ))}

        {/* Admin section */}
        {ADMIN_NAV.some(item => hasRole(...item.roles)) && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider">Admin</p>
            </div>
            {ADMIN_NAV.filter(item => hasRole(...item.roles)).map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-600/20 text-brand-400 border border-brand-600/30'
                      : 'text-gray-400 hover:text-gray-100 hover:bg-gray-800'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </NavLink>
            ))}
          </>
        )}
      </nav>

      {/* User panel */}
      <div className="p-3 border-t border-gray-800">
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-brand-600/30 flex items-center justify-center text-brand-400 text-xs font-bold shrink-0">
            {user?.full_name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200 truncate">{user?.full_name}</p>
            <span className={`badge text-[10px] ${roleColors[user?.role] || roleColors.basic_user}`}>
              {user?.role?.replace('_', ' ')}
            </span>
          </div>
          <button onClick={handleLogout} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors rounded" title="Logout">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
