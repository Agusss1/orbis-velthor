import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import EmptyState from '../../components/ui/EmptyState';
import { Plus, BarChart2, ExternalLink, Copy, Check } from 'lucide-react';

export default function SurveysPage() {
  const { hasMinRole } = useAuth();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(null);
  const [form, setForm] = useState({ title: '', description: '', areaId: '', questions: [{ id: '1', type: 'text', text: '' }] });

  const { data: surveys = [], isLoading } = useQuery({ queryKey: ['surveys'], queryFn: () => api.get('/surveys') });
  const { data: areas = [] } = useQuery({ queryKey: ['areas'], queryFn: () => api.get('/areas') });

  const create = useMutation({
    mutationFn: (data) => api.post('/surveys', data),
    onSuccess: () => { qc.invalidateQueries(['surveys']); setShowModal(false); },
  });

  const copyLink = (token) => {
    navigator.clipboard.writeText(`${window.location.origin}/survey/${token}`);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const addQuestion = () => setForm((f) => ({
    ...f,
    questions: [...f.questions, { id: String(f.questions.length + 1), type: 'text', text: '' }],
  }));

  const updateQuestion = (idx, field, val) => setForm((f) => ({
    ...f,
    questions: f.questions.map((q, i) => i === idx ? { ...q, [field]: val } : q),
  }));

  if (isLoading) return <LoadingSpinner centered />;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-100">Surveys</h1>
          <p className="text-sm text-gray-500">{surveys.length} surveys</p>
        </div>
        {hasMinRole('AREA_MANAGER') && (
          <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} /> New Survey</button>
        )}
      </div>

      {surveys.length === 0 ? (
        <EmptyState icon={BarChart2} title="No surveys" description="Create your first survey." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {surveys.map((s) => (
            <div key={s.id} className="card">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h3 className="font-medium text-gray-200">{s.title}</h3>
                <StatusBadge status={s.status} />
              </div>
              {s.description && <p className="text-sm text-gray-500 mb-3 line-clamp-2">{s.description}</p>}
              {s.area && <p className="text-xs text-gray-500 mb-3">{s.area.name}</p>}
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                <BarChart2 size={12} /> <span>{s._count?.responses || 0} responses</span>
              </div>
              <div className="flex gap-2 pt-3 border-t border-gray-800">
                <Link to={`/surveys/${s.id}`} className="btn-secondary flex-1 justify-center text-xs py-1.5">
                  View Analytics
                </Link>
                <button onClick={() => copyLink(s.accessToken)}
                  className={`btn-ghost text-xs py-1.5 px-2 ${copied === s.accessToken ? 'text-emerald-400' : ''}`}>
                  {copied === s.accessToken ? <Check size={14} /> : <Copy size={14} />}
                </button>
                <a href={`/survey/${s.accessToken}`} target="_blank" rel="noreferrer" className="btn-ghost text-xs py-1.5 px-2">
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Survey" size="lg">
        <form onSubmit={(e) => { e.preventDefault(); create.mutate({ ...form, areaId: form.areaId || undefined }); }} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Title *</label>
              <input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <label className="label">Area</label>
              <select className="input" value={form.areaId} onChange={(e) => setForm({ ...form, areaId: e.target.value })}>
                <option value="">None</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input resize-none" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">Questions</label>
              <button type="button" onClick={addQuestion} className="btn-ghost text-xs py-1 px-2"><Plus size={13} /> Add</button>
            </div>
            <div className="space-y-3">
              {form.questions.map((q, i) => (
                <div key={i} className="flex gap-2">
                  <select className="input w-36" value={q.type} onChange={(e) => updateQuestion(i, 'type', e.target.value)}>
                    <option value="text">Text</option>
                    <option value="single_choice">Single Choice</option>
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="rating">Rating</option>
                  </select>
                  <input className="input flex-1" placeholder={`Question ${i + 1}`} value={q.text} onChange={(e) => updateQuestion(i, 'text', e.target.value)} />
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
            <button type="submit" className="btn-primary flex-1 justify-center" disabled={create.isPending}>
              {create.isPending ? 'Creating...' : 'Create Survey'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
