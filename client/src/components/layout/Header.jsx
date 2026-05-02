import { Menu, Bell, LogOut, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm flex-shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="md:hidden text-gray-400 hover:text-gray-200">
          <Menu size={20} />
        </button>
        <div className="hidden md:flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-1.5 w-64">
          <Search size={14} className="text-gray-500" />
          <input
            type="text"
            placeholder="Search..."
            className="bg-transparent text-sm text-gray-300 placeholder-gray-500 focus:outline-none flex-1"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="relative p-2 text-gray-400 hover:text-gray-200 rounded-lg hover:bg-gray-800">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-orbis-500 rounded-full" />
        </button>
        <div className="flex items-center gap-2 pl-2 border-l border-gray-800">
          <div className="w-7 h-7 rounded-full bg-orbis-600/30 flex items-center justify-center text-xs font-medium text-orbis-400">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-gray-800 transition-colors"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
