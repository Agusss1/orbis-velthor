import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, UserPlus, Layers, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { areasApi, usersApi } from '../api';
import Header from '../components/layout/Header';
import Badge from '../components/ui/Badge';
import { PageSpinner } from '../components/ui/Spinner';
import { useState } from 'react';
import Modal from '../components/ui/Modal';
import useAuthStore from '../store/authStore';

function AddMemberModal({ isOpen, onClose, areaId }) {
  const qc = useQueryClient();
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('member');
  const { data } = useQuery({ queryKey: ['users-all'], queryFn: () => usersApi.list({ limit: 100 }) });
  const users = data?.data?.data || [];

  const mutation = useMutation({
    mutationFn: () => areasApi.addMember(areaId, { user_id: userId, role }),
    onSuccess: () => { qc.invalidateQueries(['area', areaId]); toast.success('Member added'); onClose(); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to add member'),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Member">
      <div className="space-y-4">
        <div>
          <label className="label">Select User</label>
          <select className="input-base" value={userId} onChange={(e) => setUserId(e.target.value)}>
            <option value="">Choose a user...</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>)}
          </select>
        </div>
        <div>
          <label className="label">Role in Area</label>
          <select className="input-base" value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="member">Member</option>
            <option value="manager">Manager</option>
            <option value="coordinator">Coordinator</option>
          </select>
        </div>
        <div className="flex gap-3 pt-2">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1 justify-center" onClick={() => mutation.mutate()} disabled={!userId || mutation.isPending}>
            Add Member
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function AreaDetail() {
  const { id } = useParams();
  const [showAddMember, setShowAddMember] = useState(false);
  const { hasRole } = useAuthStore();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['area', id],
    queryFn: () => areasApi.getOne(id),
  });

  const removeMember = useMutation({
    mutationFn: (userId) => areasApi.removeMember(id, userId),
    onSuccess: () => { qc.invalidateQueries(['area', id]); toast.success('Member removed'); },
    onError: () => toast.error('Failed to remove member'),
  });

  if (isLoading) return <PageSpinner />;
  const area = data?.data?.data;
  if (!area) return <div className="p-6 text-gray-400">Area not found</div>;

  const canManage = hasRole('owner', 'super_admin', 'political_coordinator', 'area_manager');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title={area.name}
        actions={
          canManage && (
            <button className="btn-primary" onClick={() => setShowAddMember(true)}>
              <UserPlus className="w-4 h-4" /> Add Member
            </button>
          )
        }
      />

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div>
          <Link to="/areas" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Areas
          </Link>

          <div className="card p-5 flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
                 style={{ backgroundColor: `${area.color}20`, border: `1px solid ${area.color}40` }}>
              <Layers className="w-6 h-6" style={{ color: area.color }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-100">{area.name}</h2>
              {area.type && <p className="text-sm text-gray-400">{area.type}</p>}
              {area.description && <p className="text-sm text-gray-500 mt-2">{area.description}</p>}
            </div>
          </div>
        </div>

        {/* Members */}
        <div className="card p-5">
          <h3 className="section-title flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-brand-400" />
            Members ({(area.members || []).length})
          </h3>
          <div className="space-y-2">
            {(area.members || []).map(member => (
              <div key={member.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50">
                <div className="w-8 h-8 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 text-xs font-bold">
                  {member.full_name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-200">{member.full_name}</p>
                  <p className="text-xs text-gray-500">{member.email}</p>
                </div>
                <Badge status={member.role} label={member.role} />
                {canManage && (
                  <button
                    className="text-xs text-gray-600 hover:text-red-400 transition-colors ml-2"
                    onClick={() => removeMember.mutate(member.id)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            {(area.members || []).length === 0 && (
              <p className="text-sm text-gray-600 text-center py-4">No members yet</p>
            )}
          </div>
        </div>
      </div>

      <AddMemberModal isOpen={showAddMember} onClose={() => setShowAddMember(false)} areaId={id} />
    </div>
  );
}
