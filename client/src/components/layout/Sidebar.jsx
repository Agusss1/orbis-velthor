import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Map, Users, FileText, BookOpen,
  MessageSquare, BarChart2, Globe, Brain, UserCheck, X
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/areas', icon: Map, label: 'Areas' },
  { to: '/territories', icon: Globe, label: 'Territories & Map' },
  { to: '/legislative', icon: BookOpen, label: 'Legislative' },
  { to: '/documents', icon: FileText, label: 'Documents' },
  { to: '/chat', icon: MessageSquare, label: 'Communications' },
  { to: '/surveys', icon: BarChart2, label: 'Surveys' },
  { to: '/coordinators', icon: UserCheck, label: 'Coordinators', minRole: 'POLITICAL_COORDINATOR' },
  { to: '/users', icon: Users, label: 'Users', minRole: 'AREA_MANAGER' },
  { to: '/intelligence', icon: Brain, label: 'Intelligence', minRole: 'SUPER_ADMIN' },
];

export default function Sidebar({ open, onClose }) {
  const { user, hasMinRole } = useAuth();

  const roleColors = {
    OWNER: 'text-amber-400',
    SUPER_ADMIN: 'text-red-400',
    POLITICAL_COORDINATOR: 'text-orbis-400',
    AREA_MANAGER: 'text-emerald-400',
    LEGISLATOR: 'text-purple-400',
    BASIC_USER: 'text-gray-400',
  };

  const roleLabels = {
    OWNER: 'Owner',
    SUPER_ADMIN: 'Super Admin',
    POLITICAL_COORDINATOR: 'Coordinator',
    AREA_MANAGER: 'Area Manager',
    LEGISLATOR: 'Legislator',
    BASIC_USER: 'User',
  };

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={onClose} />}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-30 w-64 flex flex-col
        bg-gray-900 border-r border-gray-800
        transform transition-transform duration-200
        ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orbis-500 to-orbis-700 flex items-center justify-center">
              <span className="text-white font-bold text-sm">O</span>
            </div>
            <div>
              <span className="font-bold text-gray-100 text-base">Orbis</span>
              <div className="text-xs text-gray-500">Political Platform</div>
            </div>
          </div>
          <button onClick={onClose} className="md:hidden text-gray-500 hover:text-gray-300">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 py-4 px-2 overflow-y-auto space-y-0.5">
          {navItems.map(({ to, icon: Icon, label, end, minRole }) => {
            if (minRole && !hasMinRole(minRole)) return null;
            return (
              <NavLink
                key={to}
                to={to}
                end={end}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-orbis-600/20 text-orbis-400 font-medium'
                      : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-300">
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-200 truncate">{user?.name}</div>
              <div className={`text-xs ${roleColors[user?.role] || 'text-gray-400'}`}>
                {roleLabels[user?.role]}
              </div>
            </div>
          </div>
          <div className="mt-2 text-center text-xs text-gray-600">Velthor Technologies</div>
        </div>
      </aside>
    </>
  );
}
