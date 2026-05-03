import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Hash, Plus, Send, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';
import { chatApi } from '../api';
import { PageSpinner } from '../components/ui/Spinner';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { format } from 'date-fns';
import useAuthStore from '../store/authStore';
import { io } from 'socket.io-client';

let socket = null;

function useSocket(token) {
  useEffect(() => {
    if (!token || socket) return;
    socket = io('/', { auth: { token }, transports: ['websocket'] });
    return () => { socket?.disconnect(); socket = null; };
  }, [token]);
  return socket;
}

function NewChannelModal({ isOpen, onClose }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', description: '', is_private: false });

  const mutation = useMutation({
    mutationFn: () => chatApi.createChannel(form),
    onSuccess: () => { qc.invalidateQueries(['channels']); toast.success('Channel created'); onClose(); setForm({ name: '', description: '', is_private: false }); },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed'),
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="New Channel">
      <div className="space-y-4">
        <div>
          <label className="label">Channel Name *</label>
          <input className="input-base" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. general" />
        </div>
        <div>
          <label className="label">Description</label>
          <input className="input-base" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="What is this channel for?" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.is_private} onChange={(e) => setForm({ ...form, is_private: e.target.checked })} className="rounded" />
          <span className="text-sm text-gray-400">Private channel (invite-only)</span>
        </label>
        <div className="flex gap-3 pt-2">
          <button className="btn-secondary flex-1" onClick={onClose}>Cancel</button>
          <button className="btn-primary flex-1 justify-center" onClick={() => mutation.mutate()} disabled={!form.name || mutation.isPending}>
            Create
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default function Chat() {
  const { user, accessToken, hasRole } = useAuthStore();
  const qc = useQueryClient();
  const [activeChannel, setActiveChannel] = useState(null);
  const [message, setMessage] = useState('');
  const [showNewChannel, setShowNewChannel] = useState(false);
  const messagesEndRef = useRef(null);
  const sock = useSocket(accessToken);

  const { data: channelsData, isLoading } = useQuery({ queryKey: ['channels'], queryFn: chatApi.listChannels });
  const channels = channelsData?.data?.data || [];

  const { data: messagesData, refetch: refetchMessages } = useQuery({
    queryKey: ['channel-messages', activeChannel],
    queryFn: () => chatApi.getMessages(activeChannel),
    enabled: !!activeChannel,
  });
  const messages = messagesData?.data?.data || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!sock || !activeChannel) return;
    sock.emit('join:channel', activeChannel);
    sock.on('channel:message', () => refetchMessages());
    return () => { sock.off('channel:message'); };
  }, [sock, activeChannel, refetchMessages]);

  const sendMsg = useMutation({
    mutationFn: () => chatApi.sendMessage(activeChannel, { content: message }),
    onSuccess: () => { refetchMessages(); setMessage(''); },
    onError: () => toast.error('Failed to send message'),
  });

  const joinChannel = useMutation({
    mutationFn: (id) => chatApi.joinChannel(id),
    onSuccess: () => qc.invalidateQueries(['channels']),
  });

  const canCreateChannel = hasRole('owner', 'super_admin', 'political_coordinator', 'area_manager');
  const currentChannel = channels.find(c => c.id === activeChannel);

  if (isLoading) return <PageSpinner />;

  return (
    <div className="flex h-full overflow-hidden">
      {/* Channel list */}
      <div className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-200">Channels</h2>
          {canCreateChannel && (
            <button onClick={() => setShowNewChannel(true)} className="p-1 text-gray-500 hover:text-brand-400 transition-colors rounded">
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {channels.length === 0 && (
            <p className="text-xs text-gray-600 px-4 py-3">No channels yet</p>
          )}
          {channels.map(ch => (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              className={`w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors ${activeChannel === ch.id ? 'bg-brand-600/20 text-brand-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}
            >
              <Hash className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate flex-1 text-left">{ch.name}</span>
              {parseInt(ch.unread_count) > 0 && (
                <span className="ml-auto badge bg-brand-600 text-white text-[10px] px-1.5 min-w-[18px] text-center">
                  {ch.unread_count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Messages area */}
      {!activeChannel ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState icon={MessageSquare} title="Select a channel" description="Choose a channel from the list to start chatting." />
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Channel header */}
          <div className="h-14 border-b border-gray-800 flex items-center gap-2 px-5 shrink-0">
            <Hash className="w-4 h-4 text-gray-500" />
            <span className="font-semibold text-gray-200">{currentChannel?.name}</span>
            {currentChannel?.description && <span className="text-xs text-gray-500 ml-1">— {currentChannel.description}</span>}
            <span className="ml-auto text-xs text-gray-600">{currentChannel?.member_count} members</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-gray-600 text-center py-8">
                No messages yet. Be the first to say something!
              </p>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-3 ${msg.user_id === user?.id ? 'flex-row-reverse' : ''}`}>
                <div className="w-7 h-7 rounded-full bg-brand-600/20 flex items-center justify-center text-brand-400 text-xs font-bold shrink-0">
                  {msg.full_name?.charAt(0)}
                </div>
                <div className={`flex flex-col max-w-[70%] ${msg.user_id === user?.id ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500">{msg.full_name}</span>
                    <span className="text-[10px] text-gray-600">{format(new Date(msg.created_at), 'HH:mm')}</span>
                    {msg.is_edited && <span className="text-[10px] text-gray-700">(edited)</span>}
                  </div>
                  {msg.reply_to_msg && (
                    <div className="text-[11px] text-gray-600 bg-gray-800/50 px-2 py-1 rounded mb-1 border-l-2 border-gray-600">
                      {msg.reply_to_msg.full_name}: {msg.reply_to_msg.content?.substring(0, 60)}
                    </div>
                  )}
                  <div className={`px-3 py-2 rounded-xl text-sm ${msg.user_id === user?.id ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-200'}`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-800">
            <form className="flex gap-3" onSubmit={(e) => { e.preventDefault(); if (message.trim()) sendMsg.mutate(); }}>
              <input
                className="input-base flex-1"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={`Message #${currentChannel?.name}...`}
              />
              <button type="submit" className="btn-primary" disabled={!message.trim() || sendMsg.isPending}>
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      <NewChannelModal isOpen={showNewChannel} onClose={() => setShowNewChannel(false)} />
    </div>
  );
}
