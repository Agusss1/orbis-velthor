import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import StatCard from '../../components/ui/StatCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { Users, Map, BookOpen, FileText, BarChart2, Globe, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatDistanceToNow } from 'date-fns';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get('/dashboard') });
  const { data: alerts } = useQuery({ queryKey: ['dashboard-alerts'], queryFn: () => api.get('/dashboard/alerts') });

  if (isLoading) return <LoadingSpinner centered />;

  const statusColors = { DRAFT: '#6B7280', IN_PROGRESS: '#3B82F6', APPROVED: '#10B981', REJECTED: '#EF4444' };
  const chartData = data?.expedientesByStatus
    ? Object.entries(data.expedientesByStatus).map(([k, v]) => ({ name: k.replace('_', ' '), value: v, fill: statusColors[k] }))
    : [];

  const alertIcons = { warning: <AlertTriangle size={14} className="text-amber-400" />, success: <CheckCircle size={14} className="text-emerald-400" />, info: <Info size={14} className="text-orbis-400" /> };

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h1 className="text-xl font-bold text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-500">Welcome back, {user?.name}.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Active Users" value={data?.stats?.totalUsers} icon={Users} color="blue" />
        <StatCard title="Areas" value={data?.stats?.activeAreas} icon={Map} color="green" />
        <StatCard title="Expedientes" value={data?.stats?.totalExpedientes} icon={BookOpen} color="purple" />
        <StatCard title="Documents" value={data?.stats?.totalDocuments} icon={FileText} color="yellow" />
        <StatCard title="Surveys" value={data?.stats?.totalSurveys} icon={BarChart2} color="blue" />
        <StatCard title="Responses" value={data?.stats?.surveyResponses} icon={BarChart2} color="green" />
        <StatCard title="Map Pins" value={data?.stats?.totalMapPins} icon={Globe} color="yellow" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-200 mb-4">Expedientes by Status</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', borderRadius: 8, color: '#F3F4F6' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-gray-500 py-8 text-center">No data yet</p>
          )}
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-200 mb-4">Recent Expedientes</h2>
          <div className="space-y-3">
            {data?.recentExpedientes?.length ? data.recentExpedientes.map((e) => (
              <div key={e.id} className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 truncate">{e.title}</p>
                  <p className="text-xs text-gray-500">{e.area?.name || 'No area'} · {formatDistanceToNow(new Date(e.updatedAt), { addSuffix: true })}</p>
                </div>
                <StatusBadge status={e.status} />
              </div>
            )) : <p className="text-sm text-gray-500">No expedientes yet</p>}
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-200 mb-4">Alerts</h2>
          <div className="space-y-3">
            {alerts?.length ? alerts.map((a, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg bg-gray-800/60">
                <div className="mt-0.5">{alertIcons[a.type]}</div>
                <div>
                  <p className="text-sm font-medium text-gray-200">{a.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{a.message}</p>
                </div>
              </div>
            )) : (
              <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-900/10 rounded-lg p-3">
                <CheckCircle size={14} /> All systems normal
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-gray-200 mb-4">Recent Activity</h2>
        <div className="space-y-2">
          {data?.recentActivity?.length ? data.recentActivity.map((a) => (
            <div key={a.id} className="flex items-center gap-4 py-2 border-b border-gray-800 last:border-0">
              <div className="w-7 h-7 rounded-full bg-orbis-600/20 flex items-center justify-center text-xs text-orbis-400 font-medium flex-shrink-0">
                {a.user?.name?.[0] || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm text-gray-300">{a.user?.name || 'System'}</span>
                <span className="text-sm text-gray-500"> {a.action.toLowerCase()} </span>
                <span className="text-sm text-gray-400">{a.resource}</span>
              </div>
              <span className="text-xs text-gray-600 flex-shrink-0">
                {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
              </span>
            </div>
          )) : <p className="text-sm text-gray-500">No recent activity</p>}
        </div>
      </div>
    </div>
  );
}
