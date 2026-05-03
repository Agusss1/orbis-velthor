import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, ScrollText, ChevronRight, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { legislativeApi, areasApi } from '../api';
import Header from '../components/layout/Header';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { PageSpinner } from '../components/ui/Spinner';
import { format } from 'date-fns';
import useAuthStore from '../store/authStore';

const STATUSES = ['draft', 'in_progress', 'approved', 'rejected', 'archived'];

function ExpedienteCard({ exp }) {
  return (
    <Link to={`/legislative/${exp.id}`} className="card p-4 hover:border-gray-600 transition-colors group block">
      <div className="flex items-start gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-200 group-hover:text-white line-clamp-2 transition-colors">{exp.title}</h3>
          <p className="text-xs text-gray-500 mt-0.5">{exp.area_name || 'No area'}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge status={exp.status} />
          <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
        </div>
      </div>
      {exp.description && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{exp.description}</p>}
      <div className="flex items-center justify-between text-xs text-gray-600 pt-2 border-t border-gray-800">
        <span>{exp.assignees?.length || 0} assignees · {exp.message_count || 0} messages</span>
        <span>{format(new Date(exp.updated_at), 'MMM d, yyyy')}</span>
      </div>
    </Link>
  );
}

function CreateModal({ isOpen, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ title: '', description: '', area_id: '', status: 'draft' });
  const { data: areasData } = useQuery({ queryKey: ['areas'], queryFn: () => areasApi.list({ limit: 100 }) });
  const areas = areasData?.data?.data || [];

  const mutation = useMutation({
    mutationFn: () => legislativeApi.create(form),
    onSuccess: () => { qc.invalidateQueries(['legislative']); toast.success('Expediente created'); onClose(); setForm({ title: '', description: '', area_id: '', status: 'draft' }); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Expediente">
      <div className="space-y-4">
        <div>
          <label className="label">Title *</label>
          <input className="input-base" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Expediente title" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input-base resize-none" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Area</label>
            <select className="input-base" value={form.area_id} onChange={(e) => setForm({ ...form, area_id: e.target.value })}>
              <option value="">None</option>
              {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Initial Status</label>
            <select className="input-base" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUSES.map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1 justify-center" onClick={() => mutation.mutate()} disabled={!form.title || mutation.isPending}>
            {mutation.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function Legislative() {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { hasRole } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['legislative', search, statusFilter],
    queryFn: () => legislativeApi.list({ search, status: statusFilter || undefined, limit: 50 }),
  });

  const expedientes = data?.data?.data || [];
  const canCreate = hasRole('owner', 'super_admin', 'political_coordinator', 'legislator');

  if (isLoading) return <PageSpinner />;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Legislative"
        actions={canCreate && <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> New Expediente</button>}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="flex gap-3 mb-5 flex-wrap">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input className="input-base pl-9 w-56" placeholder="Search expedientes..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex gap-2">
            {['', ...STATUSES].map(s => (
              <button key={s} onClick={() => setStatusFilter(s)} className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${statusFilter === s ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                {s || 'All'}
              </button>
            ))}
          </div>
        </div>

        {expedientes.length === 0 ? (
          <EmptyState icon={ScrollText} title="No expedientes yet" description="Track legislative files, assign users, and follow the workflow."
            action={canCreate && <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> New Expediente</button>} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {expedientes.map(exp => <ExpedienteCard key={exp.id} exp={exp} />)}
          </div>
        )}
      </div>

      <CreateModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
