import React, { useState, useEffect, useContext, useRef } from 'react';
import { Send, Clock, MessageSquare, Users, Shield, Hash, MessageCircle } from 'lucide-react';
import axios from 'axios';
import AuthContext from '../context/AuthContext';
import NotificationContext from '../context/NotificationContext';

const API_URL = '/api';

export default function ChatSystem() {
  const { user } = useContext(AuthContext);
  const { socket } = useContext(NotificationContext);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  
  // activeChat format: { type: 'room' | 'dm', id: string, label: string }
  const [activeChat, setActiveChat] = useState({ type: 'room', id: 'Global', label: 'Global Resident Chat' });
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [error, setError] = useState('');
  const containerRef = useRef(null);

  // Fetch online users and listen for changes
  useEffect(() => {
    if (!socket || !user) return;

    // Request current online users list by declaring connection
    socket.emit('userConnected', { id: user.id || user._id, name: user.name, role: user.role });

    const handleOnlineUsers = (users) => {
      const currentUserId = user.id || user._id;
      // Filter out duplicate connections and ourselves
      const unique = [];
      const seen = new Set();
      users.forEach(u => {
        const uid = u.id || u._id;
        if (uid && uid !== currentUserId && !seen.has(uid)) {
          seen.add(uid);
          unique.push(u);
        }
      });
      setOnlineUsers(unique);
    };

    socket.on('onlineUsers', handleOnlineUsers);
    
    return () => {
      socket.off('onlineUsers', handleOnlineUsers);
    };
  }, [socket, user]);

  // Fetch messages when active chat target changes
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const token = localStorage.getItem('token');
        const config = { headers: { Authorization: `Bearer ${token}` } };
        
        let url = `${API_URL}/messages`;
        if (activeChat.type === 'room') {
          url += `?room=${activeChat.id}`;
        } else if (activeChat.type === 'dm') {
          url += `?recipient=${activeChat.id}`;
        }

        const res = await axios.get(url, config);
        setMessages(res.data);
      } catch (err) {
        console.error('Error fetching messages:', err);
      }
    };

    fetchMessages();
  }, [activeChat]);

  // Handle joining/leaving Socket.io rooms for Room Chat
  useEffect(() => {
    if (socket && activeChat.type === 'room') {
      socket.emit('joinRoom', activeChat.id);
      return () => {
        socket.emit('leaveRoom', activeChat.id);
      };
    }
  }, [socket, activeChat]);

  // Listen for real-time messages
  useEffect(() => {
    if (!socket || !user) return;

    const handleReceiveMessage = (message) => {
      const currentUserId = user.id || user._id;
      const msgUserId = message.user?._id || message.user?.id || message.user;

      if (activeChat.type === 'room') {
        // Match room name and verify it is not a private message
        if (message.room === activeChat.id && !message.recipient) {
          setMessages((prev) => [...prev, message]);
        }
      } else if (activeChat.type === 'dm') {
        const isFromPartner = msgUserId === activeChat.id && 
          (message.recipient === currentUserId || message.recipient?._id === currentUserId);
        const isFromMe = msgUserId === currentUserId && 
          (message.recipient === activeChat.id || message.recipient?._id === activeChat.id);
        
        if (isFromPartner || isFromMe) {
          setMessages((prev) => [...prev, message]);
        }
      }
    };

    const handleModerationWarning = (data) => {
      setError(data.message);
      // Auto-clear error after 6 seconds
      setTimeout(() => setError(''), 6000);
    };

    socket.on('receiveMessage', handleReceiveMessage);
    socket.on('moderationWarning', handleModerationWarning);
    
    return () => {
      socket.off('receiveMessage', handleReceiveMessage);
      socket.off('moderationWarning', handleModerationWarning);
    };
  }, [socket, activeChat, user]);

  // Auto-scroll messages
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !socket || !user) return;

    const currentUserId = user.id || user._id;
    const messagePayload = {
      userId: currentUserId,
      text: newMessage,
      isAnonymous: isAnonymous
    };

    if (activeChat.type === 'room') {
      messagePayload.room = activeChat.id;
    } else if (activeChat.type === 'dm') {
      messagePayload.recipient = activeChat.id;
    }

    socket.emit('sendMessage', messagePayload);
    setNewMessage('');
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', height: '100%', background: 'var(--bg-secondary)', overflow: 'hidden', minHeight: 0 }}>
      
      {/* Sidebar - Rooms and DMs directory */}
      <div style={{ borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', background: 'var(--bg-main)' }}>
        
        {/* Rooms Section */}
        <div style={{ padding: '1.25rem 1rem 0.75rem' }}>
          <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MessageSquare size={12} /> Rooms & Channels
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <button
              onClick={() => setActiveChat({ type: 'room', id: 'Global', label: 'Global Resident Chat' })}
              className="btn btn-ghost"
              style={{
                justifyContent: 'flex-start', padding: '8px 10px', fontSize: '0.85rem', width: '100%', borderRadius: '8px',
                background: activeChat.type === 'room' && activeChat.id === 'Global' ? 'var(--brand-glow)' : 'transparent',
                color: activeChat.type === 'room' && activeChat.id === 'Global' ? 'var(--brand-primary)' : 'var(--text-secondary)'
              }}
            >
              <Hash size={16} />
              <span>Global Chat</span>
            </button>
            {user?.roomNumber && (
              <button
                onClick={() => setActiveChat({ type: 'room', id: `Room-${user.roomNumber}`, label: `Room ${user.roomNumber} Chat` })}
                className="btn btn-ghost"
                style={{
                  justifyContent: 'flex-start', padding: '8px 10px', fontSize: '0.85rem', width: '100%', borderRadius: '8px',
                  background: activeChat.type === 'room' && activeChat.id === `Room-${user.roomNumber}` ? 'var(--brand-glow)' : 'transparent',
                  color: activeChat.type === 'room' && activeChat.id === `Room-${user.roomNumber}` ? 'var(--brand-primary)' : 'var(--text-secondary)'
                }}
              >
                <Hash size={16} />
                <span>My Room ({user.roomNumber})</span>
              </button>
            )}
          </div>
        </div>

        {/* Online Directory Section */}
        <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', borderTop: '1px solid var(--border-subtle)' }}>
          <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Users size={12} /> Active Residents ({onlineUsers.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {onlineUsers.length === 0 ? (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '8px 4px' }}>No other users online</p>
            ) : (
              onlineUsers.map(u => {
                const uid = u.id || u._id;
                const isSelected = activeChat.type === 'dm' && activeChat.id === uid;
                return (
                  <button
                    key={uid}
                    onClick={() => setActiveChat({ type: 'dm', id: uid, label: u.name })}
                    className="btn btn-ghost"
                    style={{
                      justifyContent: 'flex-start', padding: '8px 10px', fontSize: '0.85rem', width: '100%', borderRadius: '8px',
                      background: isSelected ? 'var(--brand-glow)' : 'transparent',
                      color: isSelected ? 'var(--brand-primary)' : 'var(--text-secondary)',
                      gap: '10px'
                    }}
                  >
                    <div style={{ position: 'relative', width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</span>
                    {u.role === 'admin' && <Shield size={12} color="var(--brand-primary)" style={{ marginLeft: 'auto' }} />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Main Chat Viewport */}
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {activeChat.type === 'room' ? <MessageSquare size={18} color="var(--brand-primary)" /> : <MessageCircle size={18} color="var(--brand-primary)" />}
            <h3 style={{ fontSize: '1rem' }}>{activeChat.label}</h3>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
            Connected
          </div>
        </div>

        {/* Messages Pane */}
        <div ref={containerRef} style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', background: 'var(--bg-accent)' }}>
          {messages.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', opacity: 0.5 }}>
              <MessageCircle size={40} style={{ marginBottom: '8px' }} />
              <p style={{ fontSize: '0.85rem' }}>No messages in this chat yet. Say hello!</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isMe = (msg.user?._id || msg.user?.id || msg.user) === (user?.id || user?._id);
              return (
                <div key={msg._id || index} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                  {!isMe && (
                    <div style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', marginBottom: '4px', marginLeft: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      {msg.user?.name || 'Resident'}
                      {msg.user?.role === 'admin' && <Shield size={10} color="var(--brand-primary)" />}
                    </div>
                  )}
                  <div style={{
                    padding: '0.75rem 1rem', borderRadius: '14px',
                    background: isMe ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                    color: isMe ? '#fff' : 'var(--text-primary)',
                    fontSize: '0.9rem',
                    boxShadow: 'var(--card-shadow)',
                    borderBottomRightRadius: isMe ? '2px' : '14px',
                    borderBottomLeftRadius: !isMe ? '2px' : '14px',
                    border: isMe ? 'none' : '1px solid var(--border-subtle)'
                  }}>
                    {msg.text}
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {formatTime(msg.createdAt || new Date())}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Send Input Area */}
        {error && (
          <div style={{ 
            padding: '8px 16px', 
            background: 'rgba(244, 63, 94, 0.15)', 
            borderTop: '1px solid rgba(244, 63, 94, 0.3)', 
            borderBottom: '1px solid rgba(244, 63, 94, 0.3)', 
            color: 'var(--danger)', 
            fontSize: '0.8rem', 
            fontWeight: '600', 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem' }}>×</button>
          </div>
        )}
        <div style={{ padding: '1rem 1.25rem', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border-subtle)' }}>
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '0.75rem', marginBottom: '8px' }}>
            <input
              type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
              className="input-field" placeholder={activeChat.type === 'dm' ? `Message ${activeChat.label}...` : "Send a message..."}
              style={{ flex: 1, padding: '0.625rem 1.25rem' }}
            />
            <button type="submit" disabled={!newMessage.trim()} className="btn btn-primary" style={{ padding: '0 1.25rem' }}>
              <Send size={18} />
            </button>
          </form>
          {activeChat.type === 'room' && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              <input 
                type="checkbox" 
                checked={isAnonymous} 
                onChange={(e) => setIsAnonymous(e.target.checked)}
                style={{ width: '14px', height: '14px', accentColor: 'var(--brand-primary)' }}
              />
              Chat anonymously in this channel
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
