import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { Plus, Users, Search, UserX, ShieldCheck } from 'lucide-react';

const ROLES = ['OWNER', 'SUPER_ADMIN', 'POLITICAL_COORDINATOR', 'AREA_MANAGER', 'LEGISLATOR', 'BASIC_USER'];

export default function UsersPage() {
  const { hasMinRole } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [roleFilter, setRoleFilter] = useState('');
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'BASIC_USER' });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users', search, roleFilter],
    queryFn: () => api.get(`/users?${new URLSearchParams({ ...(search && { search }), ...(roleFilter && { role: roleFilter }) })}`),
  });

  const create = useMutation({
    mutationFn: (data) => api.post('/auth/register', data),
    onSuccess: () => { qc.invalidateQueries(['users']); setShowModal(false); setForm({ email: '', name: '', password: '', role: 'BASIC_USER' }); },
  });

  const deactivate = useMutation({
    mutationFn: (id) => api.delete(`/users/${id}`),
    onSuccess: () => qc.invalidateQueries(['users']),
  });

  const changeRole = useMutation({
    mutationFn: ({ id, role }) => api.put(`/users/${id}/role`, { role }),
    onSuccess: () => qc.invalidateQueries(['users']),
  });

  if (isLoading) return <LoadingSpinner centered />;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Users</h1>
          <p className="text-sm text-gray-500">{users.length} users</p>
        </div>
        {hasMinRole('SUPER_ADMIN') && (
          <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> Add User</button>
        )}
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2 flex-1 min-w-48">
          <Search size={14} className="text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search users..."
            className="bg-transparent text-sm text-gray-300 placeholder-gray-500 focus:outline-none flex-1"
          />
        </div>
        <select className="input w-48" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
        </select>
      </div>

      {users.length === 0 ? (
        <EmptyState icon={Users} title="No users found" />
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">User</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">Role</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 hidden md:table-cell">Status</th>
                <th className="px-4 py-3 text-xs font-medium text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-800/40">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-medium text-gray-300 flex-shrink-0">
                        {u.name[0]}
                      </div>
                      <div>
                        <p className="text-sm text-gray-300">{u.name}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {hasMinRole('SUPER_ADMIN') ? (
                      <select
                        value={u.role}
                        onChange={(e) => changeRole.mutate({ id: u.id, role: e.target.value })}
                        className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-xs text-gray-300 focus:outline-none"
                      >
                        {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
                      </select>
                    ) : <StatusBadge status={u.role} />}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className={`badge ${u.isActive ? 'badge-green' : 'badge-red'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {hasMinRole('SUPER_ADMIN') && u.isActive && (
                      <button
                        onClick={() => deactivate.mutate(u.id)}
                        className="btn-danger text-xs py-1 px-2"
                        title="Deactivate user"
                      >
                        <UserX size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add User">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form); }} className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="label">Password *</label>
            <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={create.isPending}>
              {create.isPending ? 'Adding...' : 'Add User'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
