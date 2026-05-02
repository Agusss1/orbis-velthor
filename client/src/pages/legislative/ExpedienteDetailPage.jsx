import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../services/socket';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import StatusBadge from '../../components/ui/StatusBadge';
import { ArrowLeft, Send, Clock, Users, FileText } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

const STATUSES = ['DRAFT', 'IN_PROGRESS', 'APPROVED', 'REJECTED'];

export default function ExpedienteDetailPage() {
  const { id } = useParams();
  const { user, hasMinRole } = useAuth();
  const qc = useQueryClient();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [activeTab, setActiveTab] = useState('chat');
  const messagesEndRef = useRef(null);

  const { data: exp, isLoading } = useQuery({ queryKey: ['expediente', id], queryFn: () => api.get(`/legislative/${id}`) });

  const { data: initialMessages = [] } = useQuery({
    queryKey: ['expediente-messages', id],
    queryFn: () => api.get(`/legislative/${id}/messages`),
    onSuccess: (data) => setMessages(data),
  });

  useEffect(() => { if (initialMessages.length) setMessages(initialMessages); }, [initialMessages]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit('join:expediente', id);
    socket.on('message:new', (msg) => {
      if (msg.expedienteId === id) setMessages((prev) => [...prev, msg]);
    });
    return () => { socket.emit('leave:expediente', id); socket.off('message:new'); };
  }, [id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const updateStatus = useMutation({
    mutationFn: (status) => api.put(`/legislative/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries(['expediente', id]),
  });

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    const socket = getSocket();
    socket.emit('message:send', { expedienteId: id, content: message });
    setMessage('');
  };

  if (isLoading) return <LoadingSpinner centered />;
  if (!exp) return <div className="text-gray-400">Not found</div>;

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center gap-3">
        <Link to="/legislative" className="btn-ghost p-2"><ArrowLeft size={18} /></Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl font-bold text-gray-100">{exp.title}</h1>
            <StatusBadge status={exp.status} />
          </div>
          {exp.area && <p className="text-sm text-gray-500 mt-0.5">{exp.area.name}</p>}
        </div>
        {hasMinRole('LEGISLATOR') && (
          <select
            value={exp.status}
            onChange={(e) => updateStatus.mutate(e.target.value)}
            className="input w-40"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
          </select>
        )}
      </div>

      <div className="flex gap-2 border-b border-gray-800 pb-0">
        {['chat', 'timeline', 'documents', 'people'].map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${activeTab === tab ? 'border-orbis-500 text-orbis-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'chat' && (
        <div className="card flex flex-col" style={{ height: 'calc(100vh - 320px)', minHeight: '400px' }}>
          <div className="flex-1 overflow-y-auto space-y-4 p-2">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.sender?.id === user.id ? 'flex-row-reverse' : ''}`}>
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs flex-shrink-0">
                  {msg.sender?.name?.[0]}
                </div>
                <div className={`max-w-[70%] ${msg.sender?.id === user.id ? 'items-end' : 'items-start'} flex flex-col`}>
                  <span className="text-xs text-gray-500 mb-1">{msg.sender?.name}</span>
                  <div className={`px-3 py-2 rounded-xl text-sm ${msg.sender?.id === user.id ? 'bg-orbis-600 text-white' : 'bg-gray-800 text-gray-200'}`}>
                    {msg.content}
                  </div>
                  <span className="text-xs text-gray-600 mt-1">{format(new Date(msg.createdAt), 'HH:mm')}</span>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <form onSubmit={sendMessage} className="flex gap-2 pt-3 border-t border-gray-800">
            <input
              className="input flex-1"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a message..."
            />
            <button type="submit" className="btn-primary px-3" disabled={!message.trim()}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="card">
          <h2 className="font-semibold text-gray-200 mb-4 flex items-center gap-2"><Clock size={16} /> Timeline</h2>
          <div className="space-y-4">
            {exp.timeline?.length ? exp.timeline.map((event, i) => (
              <div key={event.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-orbis-500 mt-1" />
                  {i < exp.timeline.length - 1 && <div className="w-px flex-1 bg-gray-800 mt-1" />}
                </div>
                <div className="pb-4">
                  <p className="text-sm text-gray-300">{event.description}</p>
                  <p className="text-xs text-gray-600">{format(new Date(event.createdAt), 'PPp')}</p>
                </div>
              </div>
            )) : <p className="text-sm text-gray-500">No events yet</p>}
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="card">
          <h2 className="font-semibold text-gray-200 mb-4 flex items-center gap-2"><FileText size={16} /> Attached Documents</h2>
          <div className="space-y-2">
            {exp.documents?.length ? exp.documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                <FileText size={16} className="text-gray-400" />
                <div className="flex-1">
                  <p className="text-sm text-gray-300">{doc.title}</p>
                  <p className="text-xs text-gray-500">v{doc.version} · {(doc.size / 1024).toFixed(1)} KB</p>
                </div>
                <a href={`/api/documents/${doc.id}/download`} className="btn-secondary text-xs py-1 px-2">Download</a>
              </div>
            )) : <p className="text-sm text-gray-500">No documents attached</p>}
          </div>
        </div>
      )}

      {activeTab === 'people' && (
        <div className="card">
          <h2 className="font-semibold text-gray-200 mb-4 flex items-center gap-2"><Users size={16} /> Assigned Users</h2>
          <div className="space-y-2">
            {exp.users?.length ? exp.users.map(({ user: u }) => (
              <div key={u.id} className="flex items-center gap-3 p-2">
                <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-sm font-medium text-gray-300">{u.name[0]}</div>
                <div>
                  <p className="text-sm text-gray-300">{u.name}</p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </div>
                <StatusBadge status={u.role} />
              </div>
            )) : <p className="text-sm text-gray-500">No users assigned</p>}
          </div>
        </div>
      )}
    </div>
  );
}
