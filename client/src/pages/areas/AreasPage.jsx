import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import EmptyState from '../../components/ui/EmptyState';
import { Plus, Map, Users, BookOpen, FileText } from 'lucide-react';

const AREA_TYPES = ['general', 'territorial', 'communication', 'legislative', 'operations'];
const COLORS = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];

export default function AreasPage() {
  const { hasMinRole } = useAuth();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', type: 'general', color: '#3B82F6' });

  const { data: areas = [], isLoading } = useQuery({ queryKey: ['areas'], queryFn: () => api.get('/areas') });

  const create = useMutation({
    mutationFn: (data) => api.post('/areas', data),
    onSuccess: () => { qc.invalidateQueries(['areas']); setShowModal(false); setForm({ name: '', description: '', type: 'general', color: '#3B82F6' }); },
  });

  if (isLoading) return <LoadingSpinner centered />;

  return (
    <div className="space-y-6 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Areas</h1>
          <p className="text-sm text-gray-500">{areas.length} active areas</p>
        </div>
        {hasMinRole('POLITICAL_COORDINATOR') && (
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> New Area
          </button>
        )}
      </div>

      {areas.length === 0 ? (
        <EmptyState icon={Map} title="No areas yet" description="Create your first area to get started." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {areas.map((area) => (
            <Link key={area.id} to={`/areas/${area.id}`} className="card hover:border-gray-700 transition-colors group">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: area.color + '22', borderColor: area.color + '44', border: '1px solid' }}>
                  <Map size={18} style={{ color: area.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-200 group-hover:text-white transition-colors">{area.name}</h3>
                  {area.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{area.description}</p>}
                  <div className="flex items-center gap-1 mt-1">
                    <span className="badge-gray text-xs">{area.type}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 pt-3 border-t border-gray-800">
                {[
                  { icon: Users, count: area._count?.users, label: 'users' },
                  { icon: BookOpen, count: area._count?.expedientes, label: 'exp.' },
                  { icon: FileText, count: area._count?.documents, label: 'docs' },
                ].map(({ icon: Icon, count, label }) => (
                  <div key={label} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <Icon size={12} /> <span>{count || 0} {label}</span>
                  </div>
                ))}
              </div>
            </Link>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Area">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate(form); }} className="space-y-4">
          <div>
            <label className="label">Name *</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {AREA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={create.isPending}>
              {create.isPending ? 'Creating...' : 'Create Area'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
