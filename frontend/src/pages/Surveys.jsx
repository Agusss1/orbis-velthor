import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, ClipboardList, Link2, BarChart3, Play, Square, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { surveysApi, areasApi } from '../api';
import Header from '../components/layout/Header';
import Modal from '../components/ui/Modal';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { PageSpinner } from '../components/ui/Spinner';
import { format } from 'date-fns';
import useAuthStore from '../store/authStore';

const QUESTION_TYPES = ['text', 'single_choice', 'multiple_choice', 'rating', 'yes_no'];

function AnalyticsModal({ isOpen, onClose, surveyId }) {
  const { data } = useQuery({
    queryKey: ['survey-analytics', surveyId],
    queryFn: () => surveysApi.getAnalytics(surveyId),
    enabled: !!surveyId && isOpen,
  });
  const analytics = data?.data?.data;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Survey Analytics" size="lg">
      {!analytics ? <div className="text-center py-8 text-gray-500">Loading...</div> : (
        <div>
          <p className="text-sm text-gray-400 mb-5">
            Total responses: <span className="text-gray-100 font-semibold">{analytics.total_responses}</span>
          </p>
          <div className="space-y-5">
            {Object.values(analytics.questions || {}).map((q) => (
              <div key={q.question} className="p-4 bg-gray-800 rounded-xl">
                <p className="text-sm font-medium text-gray-200 mb-3">{q.question}</p>
                <p className="text-xs text-gray-500 mb-3">Answered: {q.total_answered} ({q.percentage_answered}%)</p>
                {q.counts && (
                  <div className="space-y-2">
                    {Object.entries(q.counts).map(([k, v]) => (
                      <div key={k}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-300">{k}</span>
                          <span className="text-gray-400">{v} ({q.percentages?.[k] || 0}%)</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-500 rounded-full" style={{ width: `${q.percentages?.[k] || 0}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {q.average && <p className="text-sm text-brand-400 font-medium">Average rating: {q.average}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}

function CreateSurveyModal({ isOpen, onClose }) {
  const qc = useQueryClient();
  const { data: areasData } = useQuery({ queryKey: ['areas'], queryFn: () => areasApi.list({ limit: 100 }) });
  const areas = areasData?.data?.data || [];

  const [form, setForm] = useState({ title: '', description: '', area_id: '' });
  const [questions, setQuestions] = useState([{ question_text: '', question_type: 'text', options: [], is_required: false }]);

  const addQuestion = () => setQuestions([...questions, { question_text: '', question_type: 'text', options: [], is_required: false }]);
  const removeQuestion = (i) => setQuestions(questions.filter((_, idx) => idx !== i));
  const updateQuestion = (i, key, value) => {
    const updated = [...questions];
    updated[i] = { ...updated[i], [key]: value };
    setQuestions(updated);
  };

  const mutation = useMutation({
    mutationFn: () => surveysApi.create({ ...form, questions: questions.filter(q => q.question_text) }),
    onSuccess: (res) => {
      qc.invalidateQueries(['surveys']);
      const link = res.data?.data?.access_link;
      toast.success('Survey created!' + (link ? ' Copy the link to share.' : ''));
      onClose();
      setForm({ title: '', description: '', area_id: '' });
      setQuestions([{ question_text: '', question_type: 'text', options: [], is_required: false }]);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Survey" size="lg">
      <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
        <div>
          <label className="label">Title *</label>
          <input className="input-base" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Survey title" />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea className="input-base resize-none" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div>
          <label className="label">Area</label>
          <select className="input-base" value={form.area_id} onChange={(e) => setForm({ ...form, area_id: e.target.value })}>
            <option value="">None</option>
            {areas.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="label mb-0">Questions</label>
            <button className="btn-ghost text-xs" onClick={addQuestion}><Plus className="w-3.5 h-3.5" /> Add</button>
          </div>
          {questions.map((q, i) => (
            <div key={i} className="p-3 bg-gray-800 rounded-lg mb-3 space-y-2">
              <div className="flex gap-2">
                <input className="input-base flex-1 text-xs" value={q.question_text} onChange={(e) => updateQuestion(i, 'question_text', e.target.value)} placeholder={`Question ${i + 1}`} />
                <select className="input-base w-36 text-xs" value={q.question_type} onChange={(e) => updateQuestion(i, 'question_type', e.target.value)}>
                  {QUESTION_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
                {questions.length > 1 && (
                  <button onClick={() => removeQuestion(i)} className="p-1.5 text-gray-600 hover:text-red-400 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                )}
              </div>
              {['single_choice', 'multiple_choice'].includes(q.question_type) && (
                <input
                  className="input-base text-xs"
                  placeholder="Options (comma-separated): Option 1, Option 2"
                  value={(q.options || []).join(', ')}
                  onChange={(e) => updateQuestion(i, 'options', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                />
              )}
              <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer">
                <input type="checkbox" checked={q.is_required} onChange={(e) => updateQuestion(i, 'is_required', e.target.checked)} />
                Required
              </label>
            </div>
          ))}
        </div>
      </div>
      <div className="flex gap-3 pt-4">
        <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
        <button className="btn-primary flex-1 justify-center" onClick={() => mutation.mutate()} disabled={!form.title || mutation.isPending}>
          {mutation.isPending ? 'Creating...' : 'Create Survey'}
        </button>
      </div>
    </Modal>
  );
}

export default function Surveys() {
  const [showCreate, setShowCreate] = useState(false);
  const [analyticsId, setAnalyticsId] = useState(null);
  const { hasRole } = useAuthStore();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['surveys'], queryFn: () => surveysApi.list({ limit: 50 }) });
  const surveys = data?.data?.data || [];

  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => surveysApi.updateStatus(id, status),
    onSuccess: () => { qc.invalidateQueries(['surveys']); toast.success('Status updated'); },
  });

  const canCreate = hasRole('owner', 'super_admin', 'political_coordinator', 'area_manager');

  const copyLink = (token) => {
    navigator.clipboard.writeText(`${window.location.origin}/s/${token}`);
    toast.success('Link copied!');
  };

  if (isLoading) return <PageSpinner />;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Surveys"
        actions={canCreate && <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Create Survey</button>}
      />

      <div className="flex-1 overflow-y-auto p-6">
        {surveys.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No surveys yet" description="Create surveys to gather insights from your territories."
            action={canCreate && <button className="btn-primary" onClick={() => setShowCreate(true)}><Plus className="w-4 h-4" /> Create Survey</button>} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {surveys.map(s => (
              <div key={s.id} className="card p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-200 flex-1 pr-2 line-clamp-2">{s.title}</h3>
                  <Badge status={s.status} />
                </div>
                {s.description && <p className="text-xs text-gray-500 mb-3 line-clamp-2">{s.description}</p>}
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-4">
                  <span>{s.question_count || 0} questions</span>
                  <span>{s.response_count || 0} responses</span>
                  {s.area_name && <span>{s.area_name}</span>}
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button className="btn-ghost text-xs py-1 px-2" onClick={() => copyLink(s.access_token)}>
                    <Link2 className="w-3.5 h-3.5" /> Copy Link
                  </button>
                  <button className="btn-ghost text-xs py-1 px-2" onClick={() => setAnalyticsId(s.id)}>
                    <BarChart3 className="w-3.5 h-3.5" /> Analytics
                  </button>
                  {canCreate && s.status === 'draft' && (
                    <button className="btn-ghost text-xs py-1 px-2 text-green-400" onClick={() => updateStatus.mutate({ id: s.id, status: 'active' })}>
                      <Play className="w-3.5 h-3.5" /> Activate
                    </button>
                  )}
                  {canCreate && s.status === 'active' && (
                    <button className="btn-ghost text-xs py-1 px-2 text-red-400" onClick={() => updateStatus.mutate({ id: s.id, status: 'closed' })}>
                      <Square className="w-3.5 h-3.5" /> Close
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-700 mt-3">{format(new Date(s.created_at), 'MMM d, yyyy')}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateSurveyModal isOpen={showCreate} onClose={() => setShowCreate(false)} />
      <AnalyticsModal isOpen={!!analyticsId} onClose={() => setAnalyticsId(null)} surveyId={analyticsId} />
    </div>
  );
}
