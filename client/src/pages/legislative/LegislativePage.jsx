import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { Plus, BookOpen, MessageSquare, FileText } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const STATUSES = ['ALL', 'DRAFT', 'IN_PROGRESS', 'APPROVED', 'REJECTED'];

export default function LegislativePage() {
  const { hasMinRole } = useAuth();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const [form, setForm] = useState({ title: '', description: '', areaId: '' });

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['expedientes', filter],
    queryFn: () => api.get(`/legislative${filter !== 'ALL' ? `?status=${filter}` : ''}`),
  });

  const { data: areas = [] } = useQuery({ queryKey: ['areas'], queryFn: () => api.get('/areas') });

  const create = useMutation({
    mutationFn: (data) => api.post('/legislative', data),
    onSuccess: () => { qc.invalidateQueries(['expedientes']); setShowModal(false); setForm({ title: '', description: '', areaId: '' }); },
  });

  if (isLoading) return <LoadingSpinner centered />;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Legislative</h1>
          <p className="text-sm text-gray-500">Manage expedientes and legislative processes</p>
        </div>
        {hasMinRole('LEGISLATOR') && (
          <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> New Expediente</button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {STATUSES.map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${filter === s ? 'bg-orbis-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-gray-200'}`}>
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={BookOpen} title="No expedientes" description="Create your first legislative expediente." />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Link key={item.id} to={`/legislative/${item.id}`}
              className="card hover:border-gray-700 flex items-center gap-4 transition-colors group">
              <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center flex-shrink-0">
                <BookOpen size={18} className="text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-medium text-gray-200 group-hover:text-white">{item.title}</h3>
                    {item.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>}
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <div className="flex items-center gap-4 mt-2">
                  {item.area && <span className="text-xs text-gray-500">{item.area.name}</span>}
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <FileText size={11} /> {item._count?.documents || 0}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-gray-500">
                    <MessageSquare size={11} /> {item._count?.messages || 0}
                  </span>
                  <span className="text-xs text-gray-600">{formatDistanceToNow(new Date(item.updatedAt), { addSuffix: true })}</span>
                </div>
              </div>
              <div className="flex -space-x-2">
                {item.users?.slice(0, 3).map(({ user: u }) => (
                  <div key={u.id} title={u.name} className="w-7 h-7 rounded-full bg-gray-700 border-2 border-gray-900 flex items-center justify-center text-xs text-gray-300">
                    {u.name[0]}
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Expediente">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form); }} className="space-y-4">
          <div>
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Area</label>
            <select className="input" value={form.areaId} onChange={(e) => setForm({ ...form, areaId: e.target.value })}>
              <option value="">No area</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={create.isPending}>
              {create.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
