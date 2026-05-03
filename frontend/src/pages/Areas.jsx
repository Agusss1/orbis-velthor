import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Plus, Layers, Users, ScrollText, FileText, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { areasApi } from '../api';
import Header from '../components/layout/Header';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { PageSpinner } from '../components/ui/Spinner';
import useAuthStore from '../store/authStore';

const AREA_TYPES = ['Territory', 'Communication', 'Legislative', 'Security', 'Social', 'Economic', 'Other'];

function AreaCard({ area }) {
  return (
    <Link to={`/areas/${area.id}`} className="card p-4 hover:border-gray-600 transition-colors group block">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
             style={{ backgroundColor: `${area.color}20`, border: `1px solid ${area.color}40` }}>
          <Layers className="w-5 h-5" style={{ color: area.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-200 group-hover:text-white transition-colors truncate">{area.name}</h3>
          {area.type && <p className="text-xs text-gray-500">{area.type}</p>}
        </div>
        <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400 shrink-0 mt-0.5" />
      </div>
      {area.description && (
        <p className="text-xs text-gray-500 mb-3 line-clamp-2">{area.description}</p>
      )}
      <div className="flex items-center gap-4 text-xs text-gray-500 pt-3 border-t border-gray-800">
        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{area.member_count} members</span>
      </div>
    </Link>
  );
}

function CreateAreaModal({ isOpen, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', description: '', type: '', color: '#3B82F6' });

  const mutation = useMutation({
    mutationFn: areasApi.create,
    onSuccess: () => {
      qc.invalidateQueries(['areas']);
      toast.success('Area created');
      onClose();
      setForm({ name: '', description: '', type: '', color: '#3B82F6' });
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to create area'),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Area">
      <div className="space-y-4">
        <div>
          <label className="label">Name *</label>
          <input className="input-base" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. North Territory" />
        </div>
        <div>
          <label className="label">Type</label>
          <select className="input-base" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="">Select type</option>
            {AREA_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input-base resize-none" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Brief description..." />
        </div>
        <div>
          <label className="label">Color</label>
          <div className="flex items-center gap-3">
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="w-10 h-10 rounded cursor-pointer bg-transparent border-0" />
            <span className="text-sm text-gray-400">{form.color}</span>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary flex-1 justify-center"
            onClick={() => mutation.mutate(form)}
            disabled={!form.name || mutation.isPending}
          >
            {mutation.isPending ? 'Creating...' : 'Create Area'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function Areas() {
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const { hasRole } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['areas', search],
    queryFn: () => areasApi.list({ search, limit: 100 }),
  });

  const areas = data?.data?.data || [];
  const canCreate = hasRole('owner', 'super_admin', 'political_coordinator');

  if (isLoading) return <PageSpinner />;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Areas"
        actions={
          canCreate && (
            <button className="btn-primary" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4" /> New Area
            </button>
          )
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="mb-5">
          <input
            className="input-base max-w-xs"
            placeholder="Search areas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {areas.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No areas yet"
            description="Areas organize your team by territory, function, or purpose."
            action={canCreate && <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Create first area</button>}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {areas.map(area => <AreaCard key={area.id} area={area} />)}
          </div>
        )}
      </div>

      <CreateAreaModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
    </div>
  );
}
