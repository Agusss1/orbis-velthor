import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Clock, Users, FileText, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { legislativeApi, usersApi } from '../api';
import Header from '../components/layout/Header';
import Badge from '../components/ui/Badge';
import { PageSpinner } from '../components/ui/Spinner';
import { format } from 'date-fns';
import useAuthStore from '../store/authStore';

const STATUSES = ['draft', 'in_progress', 'approved', 'rejected', 'archived'];

export default function ExpedienteDetail() {
  const { id } = useParams();
  const { user, hasRole } = useAuthStore();
  const qc = useQueryClient();
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);
  const [tab, setTab] = useState('chat');

  const { data, isLoading } = useQuery({ queryKey: ['expediente', id], queryFn: () => legislativeApi.getOne(id) });
  const { data: messagesData } = useQuery({ queryKey: ['exp-messages', id], queryFn: () => legislativeApi.getMessages(id), refetchInterval: 5000 });
  const { data: timelineData } = useQuery({ queryKey: ['exp-timeline', id], queryFn: () => legislativeApi.getTimeline(id) });

  const messages = messagesData?.data?.data || [];
  const timeline = timelineData?.data?.data || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMsg = useMutation({
    mutationFn: () => legislativeApi.sendMessage(id, message),
    onSuccess: () => { qc.invalidateQueries(['exp-messages', id]); setMessage(''); },
    onError: () => toast.error('Failed to send message'),
  });

  const updateStatus = useMutation({
    mutationFn: (status) => legislativeApi.update(id, { status }),
    onSuccess: () => { qc.invalidateQueries(['expediente', id]); toast.success('Status updated'); },
    onError: () => toast.error('Failed to update status'),
  });

  if (isLoading) return <PageSpinner />;
  const exp = data?.data?.data;
  if (!exp) return <div className="p-6 text-gray-400">Not found</div>;

  const canManage = hasRole('owner', 'super_admin', 'political_coordinator', 'legislator');

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header title={exp.title} />

      <div className="flex-1 overflow-hidden flex">
        {/* Main content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-800 flex items-center gap-2">
            <Link to="/legislative" className="btn-ghost"><ArrowLeft className="w-4 h-4" /></Link>
            <Badge status={exp.status} />
            {exp.area_name && <span className="text-xs text-gray-500 px-2 py-1 bg-gray-800 rounded">{exp.area_name}</span>}

            {canManage && (
              <div className="ml-auto relative group">
                <button className="btn-ghost text-xs">
                  Change Status <ChevronDown className="w-3 h-3" />
                </button>
                <div className="absolute right-0 top-full mt-1 w-36 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10 hidden group-hover:block">
                  {STATUSES.filter(s => s !== exp.status).map(s => (
                    <button key={s} className="block w-full text-left px-3 py-2 text-xs text-gray-300 hover:bg-gray-700 capitalize"
                            onClick={() => updateStatus.mutate(s)}>
                      {s.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className="flex gap-1 px-5 pt-3 border-b border-gray-800">
            {['chat', 'timeline'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors capitalize ${tab === t ? 'bg-gray-800 text-gray-100 border border-b-transparent border-gray-700' : 'text-gray-500 hover:text-gray-300'}`}>
                {t}
              </button>
            ))}
          </div>

          {tab === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {messages.length === 0 && <p className="text-sm text-gray-600 text-center py-8">No messages yet. Start the discussion.</p>}
                {messages.map(msg => (
                  <div key={msg.id} className={`flex gap-3 ${msg.user_id === user?.id ? 'flex-row-reverse' : ''}`}>
                    <div className="w-7 h-7 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 text-xs font-bold shrink-0">
                      {msg.full_name?.charAt(0)}
                    </div>
                    <div className={`max-w-[70%] ${msg.user_id === user?.id ? 'items-end' : 'items-start'} flex flex-col`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-500">{msg.full_name}</span>
                        <span className="text-[10px] text-gray-600">{format(new Date(msg.created_at), 'HH:mm')}</span>
                      </div>
                      <div className={`px-3 py-2 rounded-xl text-sm ${msg.user_id === user?.id ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-200'}`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 border-t border-gray-800">
                <form className="flex gap-3" onSubmit={(e) => { e.preventDefault(); if (message.trim()) sendMsg.mutate(); }}>
                  <input className="input-base flex-1" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write a message..." />
                  <button type="submit" className="btn-primary" disabled={!message.trim() || sendMsg.isPending}>
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          )}

          {tab === 'timeline' && (
            <div className="flex-1 overflow-y-auto p-5">
              <div className="relative border-l-2 border-gray-800 ml-3 space-y-4">
                {timeline.map(item => (
                  <div key={item.id} className="pl-6 relative">
                    <div className="w-2.5 h-2.5 rounded-full bg-brand-500 absolute -left-1.5 top-1.5" />
                    <p className="text-xs font-semibold text-brand-400">{item.action}</p>
                    <p className="text-sm text-gray-300">{item.description}</p>
                    <p className="text-xs text-gray-600 mt-1">{item.full_name} · {format(new Date(item.created_at), 'MMM d, yyyy HH:mm')}</p>
                  </div>
                ))}
                {timeline.length === 0 && <p className="text-sm text-gray-600 pl-6">No activity yet</p>}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar info */}
        <div className="w-64 border-l border-gray-800 overflow-y-auto p-4 space-y-5 shrink-0">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Assignees</p>
            {(exp.assignees || []).map(a => (
              <div key={a.id} className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 text-[10px] font-bold">{a.full_name?.charAt(0)}</div>
                <span className="text-xs text-gray-300 truncate">{a.full_name}</span>
              </div>
            ))}
            {(exp.assignees || []).length === 0 && <p className="text-xs text-gray-600">No assignees</p>}
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Description</p>
            <p className="text-xs text-gray-400">{exp.description || 'No description'}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Documents</p>
            {(exp.documents || []).map(d => (
              <div key={d.id} className="flex items-center gap-2 mb-2">
                <FileText className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                <span className="text-xs text-gray-400 truncate">{d.title}</span>
              </div>
            ))}
            {(exp.documents || []).length === 0 && <p className="text-xs text-gray-600">No linked documents</p>}
          </div>

          <div className="text-xs text-gray-600 space-y-1 pt-3 border-t border-gray-800">
            <p>Created by {exp.created_by_name}</p>
            <p>{format(new Date(exp.created_at), 'MMM d, yyyy')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
