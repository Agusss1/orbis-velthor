import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, Users, Activity, Map, Download, TrendingUp } from 'lucide-react';
import { intelligenceApi } from '../api';
import Header from '../components/layout/Header';
import { PageSpinner } from '../components/ui/Spinner';
import Badge from '../components/ui/Badge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const TABS = [
  { id: 'overview', label: 'Overview', icon: TrendingUp },
  { id: 'users', label: 'User Activity', icon: Users },
  { id: 'territories', label: 'Territories', icon: Map },
  { id: 'audit', label: 'Audit Logs', icon: Activity },
];

function StatBox({ label, value, sub }) {
  return (
    <div className="card p-4">
      <p className="text-2xl font-bold text-gray-100">{value ?? '—'}</p>
      <p className="text-xs text-gray-400">{label}</p>
      {sub && <p className="text-xs text-gray-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function OverviewTab() {
  const { data, isLoading } = useQuery({ queryKey: ['intel-overview'], queryFn: intelligenceApi.overview });
  if (isLoading) return <PageSpinner />;
  const d = data?.data?.data;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatBox label="Active Users" value={d?.totals?.active_users} />
        <StatBox label="Active Areas" value={d?.totals?.active_areas} />
        <StatBox label="Expedientes" value={d?.totals?.total_expedientes} />
        <StatBox label="Total Messages" value={d?.totals?.total_messages} />
        <StatBox label="Survey Responses" value={d?.totals?.total_survey_responses} />
        <StatBox label="Documents" value={d?.totals?.total_documents} />
        <StatBox label="Map Pins" value={d?.totals?.total_pins} />
        <StatBox label="Actions Today" value={d?.totals?.actions_today} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="section-title mb-4">Users by Role</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={d?.role_breakdown || []}>
              <XAxis dataKey="role" tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="section-title mb-4">Most Active Users (30 days)</h3>
          <div className="space-y-2">
            {(d?.top_users || []).slice(0, 6).map(u => (
              <div key={u.id} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 text-[10px] font-bold">{u.full_name?.charAt(0)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-200 truncate">{u.full_name}</p>
                </div>
                <Badge status={u.role} />
                <span className="text-xs text-gray-400 w-12 text-right">{u.action_count} actions</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function UserActivityTab() {
  const [period, setPeriod] = useState('30');
  const { data, isLoading } = useQuery({
    queryKey: ['intel-user-activity', period],
    queryFn: () => intelligenceApi.userActivity(period),
  });
  const users = data?.data?.data || [];

  return (
    <div>
      <div className="flex gap-2 mb-5">
        {[['7', '7 days'], ['30', '30 days'], ['90', '90 days']].map(([v, l]) => (
          <button key={v} onClick={() => setPeriod(v)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${period === v ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-700 text-gray-400'}`}>{l}</button>
        ))}
      </div>
      {isLoading ? <PageSpinner /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500">
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium">Role</th>
                <th className="text-right px-4 py-3 font-medium">Total</th>
                <th className="text-right px-4 py-3 font-medium">Creates</th>
                <th className="text-right px-4 py-3 font-medium">Updates</th>
                <th className="text-left px-4 py-3 font-medium">Last Action</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 text-[10px] font-bold">{u.full_name?.charAt(0)}</div>
                      <div>
                        <p className="font-medium text-gray-200">{u.full_name}</p>
                        <p className="text-gray-600">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3"><Badge status={u.role} /></td>
                  <td className="px-4 py-3 text-right text-gray-200 font-semibold">{u.total_actions}</td>
                  <td className="px-4 py-3 text-right text-green-400">{u.creates}</td>
                  <td className="px-4 py-3 text-right text-blue-400">{u.updates}</td>
                  <td className="px-4 py-3 text-gray-500">{u.last_action_at ? format(new Date(u.last_action_at), 'MMM d, HH:mm') : 'Never'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function TerritoriesTab() {
  const { data, isLoading } = useQuery({ queryKey: ['intel-territories'], queryFn: intelligenceApi.territorialInsights });
  if (isLoading) return <PageSpinner />;
  const d = data?.data?.data;

  return (
    <div className="space-y-6">
      {(d?.hotspots || []).length > 0 && (
        <div className="p-4 bg-orange-500/10 border border-orange-500/20 rounded-xl">
          <h3 className="text-sm font-semibold text-orange-400 mb-3">🔥 Active Hotspots</h3>
          <div className="space-y-2">
            {d.hotspots.map(h => (
              <div key={h.territory_id} className="flex items-center justify-between text-sm">
                <span className="text-gray-300">{h.territory_name}</span>
                <span className="text-orange-400 font-semibold">{h.pin_count} new pins</span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-800">
          <h3 className="section-title">Territory Overview</h3>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500">
              <th className="text-left px-4 py-3 font-medium">Territory</th>
              <th className="text-left px-4 py-3 font-medium">Area</th>
              <th className="text-right px-4 py-3 font-medium">Pins</th>
              <th className="text-right px-4 py-3 font-medium">Surveys</th>
              <th className="text-right px-4 py-3 font-medium">Responses</th>
            </tr>
          </thead>
          <tbody>
            {(d?.territories || []).map(t => (
              <tr key={t.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                <td className="px-4 py-3 font-medium text-gray-200">{t.name}</td>
                <td className="px-4 py-3 text-gray-500">{t.area_name || '—'}</td>
                <td className="px-4 py-3 text-right text-gray-200">{t.pin_count}</td>
                <td className="px-4 py-3 text-right text-gray-200">{t.survey_count}</td>
                <td className="px-4 py-3 text-right text-gray-200">{t.response_count}</td>
              </tr>
            ))}
            {(d?.territories || []).length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600">No territories yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AuditTab() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['intel-audit', page],
    queryFn: () => intelligenceApi.auditLogs({ page, limit: 30 }),
  });
  const logs = data?.data?.data || [];
  const pagination = data?.data?.pagination;

  return (
    <div>
      {isLoading ? <PageSpinner /> : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500">
                  <th className="text-left px-4 py-3 font-medium">Time</th>
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                  <th className="text-left px-4 py-3 font-medium">Entity</th>
                  <th className="text-left px-4 py-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(log => (
                  <tr key={log.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{format(new Date(log.created_at), 'MMM d, HH:mm')}</td>
                    <td className="px-4 py-3 text-gray-300">{log.full_name || 'System'}</td>
                    <td className="px-4 py-3"><Badge status={log.action} label={log.action} variant={log.action === 'delete' ? 'red' : log.action === 'create' ? 'green' : 'blue'} /></td>
                    <td className="px-4 py-3 text-gray-500">{log.entity_type}</td>
                    <td className="px-4 py-3 text-gray-400 max-w-xs truncate">{log.description}</td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-600">No audit logs</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {pagination && (
            <div className="flex items-center justify-between mt-4 text-xs text-gray-500">
              <span>Showing {logs.length} of {pagination.total}</span>
              <div className="flex gap-2">
                <button className="btn-ghost py-1 px-2 text-xs" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>Previous</button>
                <button className="btn-ghost py-1 px-2 text-xs" onClick={() => setPage(p => p + 1)} disabled={page >= pagination.pages}>Next</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function Intelligence() {
  const [tab, setTab] = useState('overview');

  const handleExport = async (type) => {
    try {
      const res = await intelligenceApi.export(type);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `orbis_${type}_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export downloaded');
    } catch {
      toast.error('Export failed');
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Strategic Intelligence"
        actions={
          <div className="relative group">
            <button className="btn-secondary"><Download className="w-4 h-4" /> Export</button>
            <div className="absolute right-0 top-full mt-1 w-44 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 hidden group-hover:block">
              {['users', 'audit_logs', 'survey_responses', 'expedientes'].map(t => (
                <button key={t} className="block w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 capitalize" onClick={() => handleExport(t)}>
                  Export {t.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        }
      />

      <div className="border-b border-gray-800 px-6 pt-3 flex gap-1">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors ${tab === id ? 'bg-gray-800 text-gray-100 border border-b-transparent border-gray-700' : 'text-gray-500 hover:text-gray-300'}`}>
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'overview' && <OverviewTab />}
        {tab === 'users' && <UserActivityTab />}
        {tab === 'territories' && <TerritoriesTab />}
        {tab === 'audit' && <AuditTab />}
      </div>
    </div>
  );
}
