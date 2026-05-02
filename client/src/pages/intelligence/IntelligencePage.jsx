import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { Brain, Download, Users, Map, BookOpen, BarChart2, Shield } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDistanceToNow } from 'date-fns';

export default function IntelligencePage() {
  const { data: overview, isLoading } = useQuery({ queryKey: ['intelligence'], queryFn: () => api.get('/intelligence/overview') });
  const { data: auditData } = useQuery({ queryKey: ['audit-logs'], queryFn: () => api.get('/intelligence/audit-logs?limit=20') });
  const { data: userActivity } = useQuery({ queryKey: ['user-activity'], queryFn: () => api.get('/intelligence/user-activity') });
  const { data: territorial } = useQuery({ queryKey: ['territorial-insights'], queryFn: () => api.get('/intelligence/territorial-insights') });

  const exportData = (type) => window.open(`/api/intelligence/export?type=${type}`, '_blank');

  if (isLoading) return <LoadingSpinner centered />;

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Brain size={20} className="text-purple-400" />
            <h1 className="text-xl font-bold text-gray-100">Strategic Intelligence</h1>
            <span className="badge-red flex items-center gap-1"><Shield size={10} /> Restricted</span>
          </div>
          <p className="text-sm text-gray-500">System-wide data overview and analytics</p>
        </div>
        <div className="flex gap-2">
          {['users', 'activity', 'surveys'].map((t) => (
            <button key={t} onClick={() => exportData(t)} className="btn-secondary text-xs py-1.5 px-3">
              <Download size={12} /> Export {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Total Users', value: overview?.users?.total, sub: `${overview?.users?.active} active this week`, color: 'text-orbis-400', bg: 'bg-orbis-600/20' },
          { icon: Map, label: 'Active Areas', value: overview?.areas?.total, color: 'text-emerald-400', bg: 'bg-emerald-600/20' },
          { icon: BookOpen, label: 'Expedientes', value: overview?.expedientes?.total, color: 'text-purple-400', bg: 'bg-purple-600/20' },
          { icon: BarChart2, label: 'Survey Responses (7d)', value: overview?.surveys?.recentResponses, color: 'text-amber-400', bg: 'bg-amber-600/20' },
        ].map(({ icon: Icon, label, value, sub, color, bg }) => (
          <div key={label} className="card">
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <div className="text-2xl font-bold text-gray-100">{value ?? '—'}</div>
            <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            {sub && <div className="text-xs text-gray-600 mt-0.5">{sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-200 mb-4">Top Areas by Activity</h2>
          {overview?.areas?.topAreas?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={overview.areas.topAreas.slice(0, 8)} layout="vertical">
                <XAxis type="number" tick={{ fill: '#6B7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#9CA3AF', fontSize: 11 }} axisLine={false} tickLine={false} width={120} />
                <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', color: '#F3F4F6', borderRadius: 8 }} />
                <Bar dataKey="_count.expedientes" name="Expedientes" fill="#4C6EF5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <p className="text-sm text-gray-500">No data</p>}
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-200 mb-4">Territorial Engagement</h2>
          <div className="space-y-3">
            {territorial?.slice(0, 8).map((t) => (
              <div key={t.id}>
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                  <span>{t.name}</span>
                  <span>{t.engagementScore} pts</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orbis-600 to-orbis-400 rounded-full"
                    style={{ width: `${Math.min(100, (t.engagementScore / (territorial[0]?.engagementScore || 1)) * 100)}%` }} />
                </div>
              </div>
            )) || <p className="text-sm text-gray-500">No territories yet</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-semibold text-gray-200 mb-4">User Activity</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {userActivity?.map((u) => (
              <div key={u.id} className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0">
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-300 flex-shrink-0">
                  {u.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-300 truncate">{u.name}</p>
                  <p className="text-xs text-gray-500">
                    {u._count.activityLogs} actions · {u.lastActivity ? formatDistanceToNow(new Date(u.lastActivity), { addSuffix: true }) : 'Never'}
                  </p>
                </div>
                <StatusBadge status={u.role} />
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="font-semibold text-gray-200 mb-4">Audit Log</h2>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {auditData?.logs?.map((log) => (
              <div key={log.id} className="flex items-start gap-3 py-2 border-b border-gray-800 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-orbis-400">{log.action}</span>
                    <span className="text-xs text-gray-500">{log.resource}</span>
                  </div>
                  <p className="text-xs text-gray-500">{log.user?.name || 'System'}</p>
                </div>
                <span className="text-xs text-gray-600 flex-shrink-0">
                  {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
