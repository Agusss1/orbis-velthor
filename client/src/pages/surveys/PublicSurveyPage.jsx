import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { CheckCircle, Globe } from 'lucide-react';

export default function PublicSurveyPage() {
  const { token } = useParams();
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const { data: survey, isLoading, error } = useQuery({
    queryKey: ['public-survey', token],
    queryFn: () => api.get(`/surveys/respond/${token}`),
  });

  const submit = useMutation({
    mutationFn: (data) => api.post(`/surveys/respond/${token}`, data),
    onSuccess: () => setSubmitted(true),
  });

  if (isLoading) return <div className="min-h-screen bg-gray-950 flex items-center justify-center"><LoadingSpinner size="lg" /></div>;
  if (error || !survey) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
      Survey not available or has been closed.
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center">
        <CheckCircle size={48} className="text-emerald-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-100 mb-2">Response submitted!</h2>
        <p className="text-gray-400">Thank you for completing this survey.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        <div className="text-center mb-6">
          <Globe size={32} className="text-orbis-400 mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-gray-100">{survey.title}</h1>
          {survey.description && <p className="text-gray-400 mt-1">{survey.description}</p>}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); submit.mutate({ answers }); }} className="space-y-5">
          {survey.questions?.map((q, i) => (
            <div key={q.id} className="card">
              <label className="block font-medium text-gray-200 mb-3">{i + 1}. {q.text}</label>
              {q.type === 'text' && (
                <textarea className="input resize-none" rows={3} value={answers[q.id] || ''}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} placeholder="Your answer..." />
              )}
              {q.type === 'rating' && (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <button key={r} type="button"
                      onClick={() => setAnswers({ ...answers, [q.id]: r })}
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${answers[q.id] === r ? 'bg-orbis-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                      {r}
                    </button>
                  ))}
                </div>
              )}
              {(q.type === 'single_choice' || q.type === 'multiple_choice') && q.options?.map((opt) => (
                <label key={opt} className="flex items-center gap-3 cursor-pointer mb-2 hover:bg-gray-800 rounded-lg p-2 -mx-2">
                  <input
                    type={q.type === 'single_choice' ? 'radio' : 'checkbox'}
                    name={q.id}
                    value={opt}
                    checked={q.type === 'single_choice' ? answers[q.id] === opt : answers[q.id]?.includes(opt)}
                    onChange={() => {
                      if (q.type === 'single_choice') setAnswers({ ...answers, [q.id]: opt });
                      else {
                        const current = answers[q.id] || [];
                        setAnswers({ ...answers, [q.id]: current.includes(opt) ? current.filter((v) => v !== opt) : [...current, opt] });
                      }
                    }}
                    className="accent-orbis-500"
                  />
                  <span className="text-sm text-gray-300">{opt}</span>
                </label>
              ))}
            </div>
          ))}
          <button type="submit" className="btn-primary w-full justify-center" disabled={submit.isPending}>
            {submit.isPending ? 'Submitting...' : 'Submit Response'}
          </button>
        </form>
        <p className="text-center text-xs text-gray-600 mt-6">Powered by Orbis · Velthor Technologies</p>
      </div>
    </div>
  );
}
