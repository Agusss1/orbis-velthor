import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, UserCheck, UserX, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersApi } from '../api';
import Header from '../components/layout/Header';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { PageSpinner } from '../components/ui/Spinner';
import { format } from 'date-fns';
import useAuthStore from '../store/authStore';

const ROLES = ['super_admin', 'political_coordinator', 'area_manager', 'legislator', 'basic_user'];

function CreateUserModal({ isOpen, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'basic_user', phone: '' });

  const mutation = useMutation({
    mutationFn: () => usersApi.create(form),
    onSuccess: () => { qc.invalidateQueries(['users']); toast.success('User created'); onClose(); setForm({ email: '', password: '', full_name: '', role: 'basic_user', phone: '' }); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create User">
      <div className="space-y-4">
        <div>
          <label className="label">Full Name *</label>
          <input className="input-base" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Jane Doe" />
        </div>
        <div>
          <label className="label">Email *</label>
          <input type="email" className="input-base" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="jane@example.com" />
        </div>
        <div>
          <label className="label">Password *</label>
          <input type="password" className="input-base" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 8 characters" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Role *</label>
            <select className="input-base" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="input-base" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1 555 000" />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1 justify-center" onClick={() => mutation.mutate()} disabled={!form.email || !form.password || !form.full_name || mutation.isPending}>
            {mutation.isPending ? 'Creating...' : 'Create User'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function Users() {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const { hasRole } = useAuthStore();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['users', search, roleFilter],
    queryFn: () => usersApi.list({ search, role: roleFilter || undefined, limit: 50 }),
  });

  const users = data?.data?.data || [];
  const canCreate = hasRole('owner', 'super_admin');

  const deactivate = useMutation({
    mutationFn: (id) => usersApi.deactivate(id),
    onSuccess: () => { qc.invalidateQueries(['users']); toast.success('User deactivated'); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  const activate = useMutation({
    mutationFn: (id) => usersApi.activate(id),
    onSuccess: () => { qc.invalidateQueries(['users']); toast.success('User activated'); },
    onError: () => toast.error('Failed'),
  });

  if (isLoading) return <PageSpinner />;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Users"
        actions={canCreate && <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> New User</button>}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-3 mb-5 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input className="input-base pl-9 w-56" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <select className="input-base w-44" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All roles</option>
            {['owner', ...ROLES].map(r => <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        {users.length === 0 ? (
          <EmptyState icon={() => <span className="text-3xl">👤</span>} title="No users found" description="Adjust your filters or create a new user."
            action={canCreate && <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Create User</button>} />
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-gray-500 text-xs">
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Last Login</th>
                  <th className="text-left px-4 py-3 font-medium">Joined</th>
                  {canCreate && <th className="text-right px-4 py-3 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 text-xs font-bold">
                          {user.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-200">{user.full_name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><Badge status={user.role} /></td>
                    <td className="px-4 py-3">
                      <span className={`badge ${user.is_active ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'} border`}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {user.last_login_at ? format(new Date(user.last_login_at), 'MMM d, HH:mm') : 'Never'}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {format(new Date(user.created_at), 'MMM d, yyyy')}
                    </td>
                    {canCreate && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {user.is_active ? (
                            <button onClick={() => deactivate.mutate(user.id)} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors rounded" title="Deactivate">
                              <UserX className="w-4 h-4" />
                            </button>
                          ) : (
                            <button onClick={() => activate.mutate(user.id)} className="p-1.5 text-gray-500 hover:text-green-400 transition-colors rounded" title="Activate">
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateUserModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
