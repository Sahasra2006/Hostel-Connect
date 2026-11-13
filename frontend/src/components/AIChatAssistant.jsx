import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MessageSquare, Send, X, Bot, User, Sparkles } from 'lucide-react';

const API_URL = '/api';

export default function AIChatAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hello! I am HostelConnect Warden AI, your Resident Assistant. How can I help you today with hostel rules, timings, or room request procedures?' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue;
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      // Map history to backend expected structure: { role, text }
      // Slice out the initial welcome message (index 0) so history starts with 'user' role
      const history = messages.slice(1).map(m => ({
        role: m.role,
        text: m.text
      }));

      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      const res = await axios.post(`${API_URL}/ai/chat`, {
        message: userText,
        history: history
      }, config);

      setMessages(prev => [...prev, { role: 'assistant', text: res.data.reply }]);
    } catch (error) {
      console.error('Chatbot error:', error);
      setMessages(prev => [...prev, { role: 'assistant', text: 'Sorry, I lost connection to the server. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-glow) 100%)',
            color: '#fff',
            border: 'none',
            boxShadow: '0 8px 32px rgba(99, 102, 241, 0.4)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1) translateY(-4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1) translateY(0)';
          }}
        >
          <Sparkles size={24} style={{ animation: 'pulse 2s infinite' }} />
        </button>
      )}

      {/* Expanded Chat Box */}
      {isOpen && (
        <div
          className="card animate-up"
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            width: '380px',
            height: '520px',
            borderRadius: '20px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border-subtle)',
            background: 'var(--bg-secondary)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 9999,
            padding: 0
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-glow) 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '8px',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Bot size={20} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '750', letterSpacing: '0.5px' }}>HostelConnect Warden AI</h4>
                <span style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.9 }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', display: 'inline-block', boxShadow: '0 0 8px #10b981' }}></span>
                  Online Resident Assistant
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                background: 'none',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                opacity: 0.8,
                padding: '4px'
              }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div
            style={{
              flex: 1,
              padding: '20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: 'var(--bg-accent)'
            }}
          >
            {messages.map((m, idx) => {
              const isAssistant = m.role === 'assistant';
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '8px',
                    alignSelf: isAssistant ? 'flex-start' : 'flex-end',
                    flexDirection: isAssistant ? 'row' : 'row-reverse',
                    maxWidth: '85%'
                  }}
                >
                  <div
                    style={{
                      background: isAssistant ? 'var(--brand-primary)' : 'var(--bg-secondary)',
                      color: isAssistant ? '#fff' : 'var(--text-primary)',
                      padding: '4px',
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    {isAssistant ? <Bot size={14} /> : <User size={14} />}
                  </div>
                  <div
                    style={{
                      background: isAssistant ? 'var(--bg-secondary)' : 'linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-glow) 100%)',
                      color: isAssistant ? 'var(--text-primary)' : '#fff',
                      padding: '10px 14px',
                      borderRadius: isAssistant ? '0px 16px 16px 16px' : '16px 0px 16px 16px',
                      fontSize: '0.85rem',
                      lineHeight: '1.4',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                      border: isAssistant ? '1px solid var(--border-subtle)' : 'none',
                      whiteSpace: 'pre-line'
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}
            {isLoading && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  alignSelf: 'flex-start',
                  maxWidth: '85%'
                }}
              >
                <div style={{ background: 'var(--brand-primary)', color: '#fff', padding: '4px', borderRadius: '50%', display: 'flex', alignItems: 'center' }}>
                  <Bot size={14} />
                </div>
                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-muted)',
                    padding: '10px 14px',
                    borderRadius: '0px 16px 16px 16px',
                    fontSize: '0.85rem',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex',
                    gap: '4px',
                    alignItems: 'center'
                  }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)', animation: 'pulse 1.2s infinite' }}></span>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)', animation: 'pulse 1.2s infinite 0.2s' }}></span>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-muted)', animation: 'pulse 1.2s infinite 0.4s' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <form
            onSubmit={handleSend}
            style={{
              padding: '14px 16px',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              gap: '10px',
              background: 'var(--bg-secondary)',
              alignItems: 'center'
            }}
          >
            <input
              type="text"
              placeholder="Ask me anything..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={isLoading}
              style={{
                flex: 1,
                border: '1px solid var(--border-subtle)',
                borderRadius: '24px',
                padding: '8px 16px',
                fontSize: '0.85rem',
                outline: 'none',
                background: 'var(--bg-accent)',
                color: 'var(--text-primary)',
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--brand-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              style={{
                background: 'var(--brand-primary)',
                color: '#fff',
                border: 'none',
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: inputValue.trim() ? 1 : 0.6,
                transition: 'all 0.2s ease'
              }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
