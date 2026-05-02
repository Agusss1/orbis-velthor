import { useQuery } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../services/socket';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { MessageSquare, Send, Hash } from 'lucide-react';
import { format } from 'date-fns';

export default function ChatPage() {
  const { user } = useAuth();
  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [typing, setTyping] = useState({});
  const messagesEndRef = useRef(null);
  const typingTimeout = useRef(null);

  const { data: channels = [], isLoading } = useQuery({
    queryKey: ['channels'],
    queryFn: () => api.get('/chat/channels'),
    onSuccess: (data) => { if (data.length && !activeChannel) setActiveChannel(data[0]); },
  });

  useEffect(() => {
    if (channels.length && !activeChannel) setActiveChannel(channels[0]);
  }, [channels]);

  useEffect(() => {
    if (!activeChannel) return;
    api.get(`/chat/channels/${activeChannel.id}/messages`).then(setMessages);

    const socket = getSocket();
    socket.emit('join:channel', activeChannel.id);
    socket.on('message:new', (msg) => {
      if (msg.channelId === activeChannel.id) setMessages((prev) => [...prev, msg]);
    });
    socket.on('typing:update', ({ userId: uid, isTyping }) => {
      setTyping((prev) => ({ ...prev, [uid]: isTyping }));
    });

    return () => {
      socket.emit('leave:channel', activeChannel.id);
      socket.off('message:new');
      socket.off('typing:update');
    };
  }, [activeChannel?.id]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleTyping = () => {
    const socket = getSocket();
    socket.emit('typing:start', { channelId: activeChannel.id });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => socket.emit('typing:stop', { channelId: activeChannel.id }), 2000);
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!message.trim() || !activeChannel) return;
    const socket = getSocket();
    socket.emit('message:send', { channelId: activeChannel.id, content: message });
    setMessage('');
  };

  if (isLoading) return <LoadingSpinner centered />;

  const typingUsers = Object.entries(typing).filter(([uid, t]) => t && uid !== user.id);

  return (
    <div className="flex h-[calc(100vh-112px)] -m-4 md:-m-6">
      <div className="w-60 flex-shrink-0 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-semibold text-gray-200 text-sm">Channels</h2>
        </div>
        <div className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {channels.map((ch) => (
            <button key={ch.id} onClick={() => setActiveChannel(ch)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left ${activeChannel?.id === ch.id ? 'bg-orbis-600/20 text-orbis-400' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'}`}>
              <Hash size={14} />
              <span className="truncate">{ch.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {activeChannel ? (
          <>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 bg-gray-900/50">
              <Hash size={16} className="text-gray-400" />
              <span className="font-medium text-gray-200">{activeChannel.name}</span>
              {activeChannel.area && <span className="text-xs text-gray-500">· {activeChannel.area.name}</span>}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex gap-3 ${msg.sender?.id === user.id ? 'flex-row-reverse' : ''}`}>
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs flex-shrink-0 font-medium">
                    {msg.sender?.name?.[0]}
                  </div>
                  <div className={`max-w-[65%] ${msg.sender?.id === user.id ? 'items-end' : 'items-start'} flex flex-col`}>
                    <span className="text-xs text-gray-500 mb-1">{msg.sender?.name} · {format(new Date(msg.createdAt), 'HH:mm')}</span>
                    <div className={`px-3 py-2 rounded-xl text-sm leading-relaxed ${msg.sender?.id === user.id ? 'bg-orbis-600 text-white' : 'bg-gray-800 text-gray-200'}`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              {typingUsers.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-gray-500 italic">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => <span key={i} className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
                  </div>
                  Someone is typing...
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="flex gap-2 p-4 border-t border-gray-800">
              <input
                className="input flex-1"
                value={message}
                onChange={(e) => { setMessage(e.target.value); handleTyping(); }}
                placeholder={`Message ${activeChannel.name}...`}
              />
              <button type="submit" className="btn-primary px-3" disabled={!message.trim()}>
                <Send size={16} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex items-center justify-center flex-1 text-gray-500">
            <div className="text-center">
              <MessageSquare size={32} className="mx-auto mb-2 opacity-40" />
              <p>Select a channel</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
