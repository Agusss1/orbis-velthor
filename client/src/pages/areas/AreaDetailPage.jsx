import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { ArrowLeft, Users, BookOpen, FileText, BarChart2, Map } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function AreaDetailPage() {
  const { id } = useParams();
  const { data: area, isLoading } = useQuery({ queryKey: ['area', id], queryFn: () => api.get(`/areas/${id}`) });

  if (isLoading) return <LoadingSpinner centered />;
  if (!area) return <div className="text-gray-400">Area not found</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-4">
        <Link to="/areas" className="btn-ghost p-2"><ArrowLeft size={18} /></Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: area.color + '22' }}>
            <Map size={20} style={{ color: area.color }} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-100">{area.name}</h1>
            <p className="text-sm text-gray-500">{area.description || 'No description'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Users, count: area._count?.users, label: 'Users', color: 'text-orbis-400' },
          { icon: BookOpen, count: area._count?.expedientes, label: 'Expedientes', color: 'text-purple-400' },
          { icon: FileText, count: area._count?.documents, label: 'Documents', color: 'text-amber-400' },
          { icon: BarChart2, count: area._count?.surveys, label: 'Surveys', color: 'text-emerald-400' },
        ].map(({ icon: Icon, count, label, color }) => (
          <div key={label} className="card text-center">
            <Icon size={20} className={`${color} mx-auto mb-2`} />
            <div className="text-2xl font-bold text-gray-100">{count || 0}</div>
            <div className="text-xs text-gray-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-200 mb-4 flex items-center gap-2"><Users size={16} /> Members</h2>
          <div className="space-y-2">
            {area.users?.length ? area.users.map(({ user: u }) => (
              <div key={u.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-300">{u.name[0]}</div>
                <div>
                  <p className="text-sm text-gray-300">{u.name}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                <StatusBadge status={u.role} />
              </div>
            )) : <p className="text-sm text-gray-500">No members assigned</p>}
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-200 mb-4 flex items-center gap-2"><BookOpen size={16} /> Recent Expedientes</h2>
          <div className="space-y-3">
            {area.expedientes?.length ? area.expedientes.map((e) => (
              <Link key={e.id} to={`/legislative/${e.id}`} className="flex items-center justify-between hover:bg-gray-800 rounded-lg p-2 -mx-2 transition-colors">
                <div>
                  <p className="text-sm text-gray-300">{e.title}</p>
                  <p className="text-xs text-gray-500">{formatDistanceToNow(new Date(e.updatedAt), { addSuffix: true })}</p>
                </div>
                <StatusBadge status={e.status} />
              </Link>
            )) : <p className="text-sm text-gray-500">No expedientes yet</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
