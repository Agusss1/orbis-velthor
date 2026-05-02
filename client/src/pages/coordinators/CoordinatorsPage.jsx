import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import { Plus, UserCheck, Map } from 'lucide-react';

export default function CoordinatorsPage() {
  const { hasMinRole } = useAuth();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ userId: '', bio: '' });

  const { data: coordinators = [], isLoading } = useQuery({ queryKey: ['coordinators'], queryFn: () => api.get('/coordinators') });
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => api.get('/users') });

  const create = useMutation({
    mutationFn: (data) => api.post('/coordinators', data),
    onSuccess: () => { qc.invalidateQueries(['coordinators']); setShowModal(false); },
  });

  if (isLoading) return <LoadingSpinner centered />;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Coordinators</h1>
          <p className="text-sm text-gray-500">{coordinators.length} coordinators</p>
        </div>
        {hasMinRole('SUPER_ADMIN') && (
          <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> Add Coordinator</button>
        )}
      </div>

      {coordinators.length === 0 ? (
        <EmptyState icon={UserCheck} title="No coordinators" description="Add your first coordinator." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coordinators.map((c) => (
            <div key={c.id} className="card">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-orbis-600/20 flex items-center justify-center font-medium text-orbis-400">
                  {c.user.name[0]}
                </div>
                <div>
                  <h3 className="font-medium text-gray-200">{c.user.name}</h3>
                  <p className="text-xs text-gray-500">{c.user.email}</p>
                </div>
              </div>
              {c.bio && <p className="text-sm text-gray-400 mb-3">{c.bio}</p>}
              <div>
                <p className="text-xs text-gray-500 mb-2 flex items-center gap-1"><Map size={11} /> Assigned areas</p>
                <div className="flex flex-wrap gap-1.5">
                  {c.areas.length ? c.areas.map(({ area }) => (
                    <span key={area.id} className="badge-blue text-xs">{area.name}</span>
                  )) : <span className="text-xs text-gray-600">No areas assigned</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Coordinator">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form); }} className="space-y-4">
          <div>
            <label className="label">User *</label>
            <select className="input" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })} required>
              <option value="">Select user</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
          </div>
          <div>
            <label className="label">Bio</label>
            <textarea className="input resize-none" rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={create.isPending}>
              {create.isPending ? 'Adding...' : 'Add Coordinator'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
