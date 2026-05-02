import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { ArrowLeft, BarChart2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#4C6EF5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function SurveyDetailPage() {
  const { id } = useParams();
  const { data: survey } = useQuery({ queryKey: ['survey', id], queryFn: () => api.get(`/surveys/${id}`) });
  const { data: analytics, isLoading } = useQuery({ queryKey: ['survey-analytics', id], queryFn: () => api.get(`/surveys/${id}/analytics`) });

  if (isLoading) return <LoadingSpinner centered />;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link to="/surveys" className="btn-ghost p-2"><ArrowLeft size={18} /></Link>
        <div>
          <h1 className="text-xl font-bold text-gray-100">{survey?.title}</h1>
          <p className="text-sm text-gray-500">{analytics?.totalResponses || 0} total responses</p>
        </div>
      </div>

      {analytics?.analytics?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {analytics.analytics.map((q) => (
            <div key={q.questionId} className="card">
              <h3 className="font-medium text-gray-200 mb-1">{q.question}</h3>
              <p className="text-xs text-gray-500 mb-4">{q.totalResponses} responses · {q.type}</p>
              {(q.type === 'single_choice' || q.type === 'multiple_choice') && q.counts ? (
                <>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={Object.entries(q.counts).map(([k, v]) => ({ name: k, value: v }))} cx="50%" cy="50%" outerRadius={70} dataKey="value">
                        {Object.keys(q.counts).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#111827', border: '1px solid #1F2937', color: '#F3F4F6', borderRadius: 8 }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2 mt-2">
                    {Object.entries(q.percentages).map(([k, v]) => (
                      <div key={k}>
                        <div className="flex justify-between text-xs text-gray-400 mb-1"><span>{k}</span><span>{v}%</span></div>
                        <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-orbis-500 rounded-full" style={{ width: `${v}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500 text-center py-4 flex items-center justify-center gap-2">
                  <BarChart2 size={16} /> Analytics not available for {q.type} questions
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="card text-center py-12 text-gray-500">No responses yet</div>
      )}
    </div>
  );
}
