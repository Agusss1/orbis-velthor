import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Globe, CheckCircle } from 'lucide-react';
import { surveysApi } from '../api';
import { PageSpinner } from '../components/ui/Spinner';
import toast from 'react-hot-toast';

export default function SurveyPublic() {
  const { token } = useParams();
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['public-survey', token],
    queryFn: () => surveysApi.getPublic(token),
  });

  const submit = useMutation({
    mutationFn: () => surveysApi.submit(token, { answers }),
    onSuccess: () => setSubmitted(true),
    onError: (err) => toast.error(err.response?.data?.error || 'Submission failed'),
  });

  const setAnswer = (questionId, value) => setAnswers(prev => ({ ...prev, [questionId]: value }));
  const toggleMulti = (questionId, option) => {
    const current = answers[questionId] || [];
    setAnswer(questionId, current.includes(option) ? current.filter(o => o !== option) : [...current, option]);
  };

  if (isLoading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <PageSpinner />
    </div>
  );

  if (error || !data?.data?.data) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        <p className="text-gray-400 text-lg font-medium">Survey not found</p>
        <p className="text-gray-600 text-sm mt-1">This survey may be closed or the link is invalid.</p>
      </div>
    </div>
  );

  const survey = data.data.data;

  if (submitted) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Thank you!</h2>
        <p className="text-gray-400">Your response has been recorded.</p>
        <p className="text-xs text-gray-600 mt-4">Powered by Orbis · Velthor Technologies</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 p-4">
      <div className="max-w-2xl mx-auto py-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
            <Globe className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">{survey.title}</h1>
            {survey.description && <p className="text-sm text-gray-400">{survey.description}</p>}
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-5">
          {(survey.questions || []).map((q, i) => (
            <div key={q.id} className="card p-5">
              <p className="text-sm font-medium text-gray-200 mb-3">
                {i + 1}. {q.question_text}
                {q.is_required && <span className="text-red-400 ml-1">*</span>}
              </p>

              {q.question_type === 'text' && (
                <textarea
                  className="input-base resize-none"
                  rows={3}
                  value={answers[q.id] || ''}
                  onChange={(e) => setAnswer(q.id, e.target.value)}
                  placeholder="Your answer..."
                />
              )}

              {q.question_type === 'single_choice' && (
                <div className="space-y-2">
                  {(q.options || []).map(opt => (
                    <label key={opt} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-800">
                      <input type="radio" name={q.id} value={opt} checked={answers[q.id] === opt} onChange={() => setAnswer(q.id, opt)} className="accent-brand-500" />
                      <span className="text-sm text-gray-300">{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.question_type === 'multiple_choice' && (
                <div className="space-y-2">
                  {(q.options || []).map(opt => (
                    <label key={opt} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-800">
                      <input type="checkbox" checked={(answers[q.id] || []).includes(opt)} onChange={() => toggleMulti(q.id, opt)} className="accent-brand-500 rounded" />
                      <span className="text-sm text-gray-300">{opt}</span>
                    </label>
                  ))}
                </div>
              )}

              {q.question_type === 'yes_no' && (
                <div className="flex gap-3">
                  {['Yes', 'No'].map(opt => (
                    <button key={opt} onClick={() => setAnswer(q.id, opt)}
                      className={`px-6 py-2 rounded-lg text-sm font-medium border transition-colors ${answers[q.id] === opt ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {q.question_type === 'rating' && (
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} onClick={() => setAnswer(q.id, n)}
                      className={`w-10 h-10 rounded-lg text-sm font-semibold border transition-colors ${answers[q.id] === n ? 'bg-brand-600 border-brand-600 text-white' : 'border-gray-700 text-gray-400 hover:border-gray-500'}`}>
                      {n}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <button
          className="btn-primary w-full justify-center mt-6 py-3"
          onClick={() => submit.mutate()}
          disabled={submit.isPending}
        >
          {submit.isPending ? 'Submitting...' : 'Submit Response'}
        </button>

        <p className="text-center text-xs text-gray-700 mt-6">Powered by Orbis · Velthor Technologies</p>
      </div>
    </div>
  );
}
