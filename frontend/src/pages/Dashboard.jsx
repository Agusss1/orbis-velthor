import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api';
import { PageSpinner } from '../components/ui/Spinner';
import Header from '../components/layout/Header';
import {
  Users, Layers, ScrollText, ClipboardList, MapPin,
  MessageSquare, AlertTriangle, TrendingUp, Activity, CheckCircle, Info, XCircle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';

function StatCard({ icon: Icon, label, value, sub, color = 'brand' }) {
  const colors = {
    brand: 'text-brand-400 bg-brand-500/10',
    green: 'text-green-400 bg-green-500/10',
    yellow: 'text-yellow-400 bg-yellow-500/10',
    purple: 'text-purple-400 bg-purple-500/10',
    cyan: 'text-cyan-400 bg-cyan-500/10',
    red: 'text-red-400 bg-red-500/10',
  };
  return (
    <div className="card p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colors[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-100">{value ?? '—'}</p>
        <p className="text-xs text-gray-400">{label}</p>
        {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function AlertItem({ alert }) {
  const styles = {
    warning: { icon: AlertTriangle, className: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
    success: { icon: CheckCircle, className: 'text-green-400 bg-green-500/10 border-green-500/20' },
    info: { icon: Info, className: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
    error: { icon: XCircle, className: 'text-red-400 bg-red-500/10 border-red-500/20' },
  };
  const s = styles[alert.type] || styles.info;
  const Icon = s.icon;
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${s.className}`}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <p className="text-sm text-gray-300">{alert.message}</p>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs">
      <p className="text-gray-400">{label}</p>
      <p className="text-brand-400 font-semibold">{payload[0].value} responses</p>
    </div>
  );
};

export default function Dashboard() {
  const { data: statsRes, isLoading } = useQuery({ queryKey: ['dashboard-stats'], queryFn: dashboardApi.stats });
  const { data: alertsRes } = useQuery({ queryKey: ['dashboard-alerts'], queryFn: dashboardApi.alerts });
  const { data: activityRes } = useQuery({ queryKey: ['dashboard-activity'], queryFn: () => dashboardApi.activity(10) });

  const stats = statsRes?.data?.data;
  const alerts = alertsRes?.data?.data || [];
  const activity = activityRes?.data?.data || [];

  if (isLoading) return <PageSpinner />;

  const trendData = (stats?.survey_trend || []).map(d => ({
    day: format(new Date(d.day), 'MMM d'),
    count: parseInt(d.count),
  }));

  const expedienteData = stats?.expedientes || {};

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title="Dashboard" />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard icon={Users} label="Active Users" value={stats?.users?.active} color="brand" />
          <StatCard icon={Layers} label="Active Areas" value={stats?.areas?.total} color="green" />
          <StatCard icon={ScrollText} label="Expedientes" value={stats?.expedientes?.total} color="purple" />
          <StatCard icon={ClipboardList} label="Surveys" value={stats?.surveys?.total} sub={`${stats?.surveys?.total_responses || 0} responses`} color="yellow" />
          <StatCard icon={MapPin} label="Active Pins" value={stats?.pins?.total} color="cyan" />
          <StatCard icon={MessageSquare} label="Messages Today" value={stats?.messages_today?.total} color="red" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Survey trend */}
          <div className="xl:col-span-2 card p-5">
            <h3 className="section-title mb-4">Survey Responses (30 days)</h3>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} fill="url(#grad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-44 flex items-center justify-center text-sm text-gray-600">No data yet</div>
            )}
          </div>

          {/* Expediente status */}
          <div className="card p-5">
            <h3 className="section-title mb-4">Legislative Status</h3>
            <div className="space-y-3">
              {[
                { label: 'Draft', key: 'draft', color: 'bg-gray-500' },
                { label: 'In Progress', key: 'in_progress', color: 'bg-blue-500' },
                { label: 'Approved', key: 'approved', color: 'bg-green-500' },
                { label: 'Rejected', key: 'rejected', color: 'bg-red-500' },
              ].map(({ label, key, color }) => {
                const count = parseInt(expedienteData[key] || 0);
                const total = parseInt(expedienteData.total || 1);
                const pct = total ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={key}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-400">{label}</span>
                      <span className="text-gray-300 font-medium">{count}</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Alerts */}
          <div className="card p-5">
            <h3 className="section-title mb-4 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-400" />
              Alerts & Insights
            </h3>
            {alerts.length === 0 ? (
              <p className="text-sm text-gray-600 text-center py-6">No alerts at this time</p>
            ) : (
              <div className="space-y-2">
                {alerts.map((a, i) => <AlertItem key={i} alert={a} />)}
              </div>
            )}
          </div>

          {/* Area activity */}
          <div className="xl:col-span-2 card p-5">
            <h3 className="section-title mb-4 flex items-center gap-2">
              <Activity className="w-4 h-4 text-brand-400" />
              Area Activity
            </h3>
            <div className="space-y-2">
              {(stats?.area_activity || []).map((area) => (
                <div key={area.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: area.color }} />
                  <span className="flex-1 text-sm font-medium text-gray-200 truncate">{area.name}</span>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span><span className="text-gray-300">{area.members}</span> members</span>
                    <span><span className="text-gray-300">{area.expedientes}</span> expedientes</span>
                    <span><span className="text-gray-300">{area.documents}</span> docs</span>
                  </div>
                </div>
              ))}
              {(stats?.area_activity || []).length === 0 && (
                <p className="text-sm text-gray-600 text-center py-6">No areas yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
