import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, X, Bot, Sparkles } from 'lucide-react';

const QUICK_QUESTIONS = [
  "Show me pending approvals",
  "How many active vendors do we have?",
  "Summarize recent RFQs",
  "What's our total procurement spend?",
];

export default function ChatBot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', content: "👋 Hi! I'm your **VendorBridge AI Assistant**. I have access to your procurement data and can help you:\n\n• Answer questions about vendors, RFQs, and orders\n• Generate reports and summaries\n• Guide you through procurement workflows\n• Analyze spending patterns\n\nWhat would you like to know?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const sendMessage = async (text = input.trim()) => {
    if (!text || loading) return;
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages.filter(m => m.role !== 'bot' || messages.indexOf(m) > 0)
        .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));
      const r = await axios.post('/api/ai/chat', { message: text, history });
      setMessages(prev => [...prev, { role: 'bot', content: r.data.reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', content: '❌ Connection error. Please check that the backend server is running.' }]);
    }
    setLoading(false);
  };

  const renderContent = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code style="background:rgba(0,0,0,0.3);padding:1px 4px;border-radius:4px;font-size:12px">$1</code>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <>
      <button id="chatbot-toggle" className="chatbot-toggle" onClick={() => setOpen(!open)} title="AI Assistant">
        {open ? <X size={22} color="white" /> : <Bot size={22} color="white" />}
      </button>

      {open && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <div className="chatbot-avatar"><Sparkles size={22} /></div>
            <div>
              <div className="chatbot-name">VendorBridge AI</div>
              <div className="chatbot-status">● Online • GPT-4o powered</div>
            </div>
            <button className="chatbot-close" onClick={() => setOpen(false)}><X size={18} /></button>
          </div>

          <div className="chatbot-messages" id="chat-messages">
            {messages.map((m, i) => (
              <div key={i} className={`chat-message ${m.role}`}>
                {m.role === 'bot' && <div style={{ fontSize: 18, flexShrink: 0 }}>🤖</div>}
                <div
                  className="chat-bubble"
                  dangerouslySetInnerHTML={{ __html: renderContent(m.content) }}
                />
              </div>
            ))}
            {loading && (
              <div className="chat-message bot">
                <div style={{ fontSize: 18 }}>🤖</div>
                <div className="chat-bubble">
                  <div className="typing-indicator">
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {messages.length === 1 && (
            <div style={{ padding: '0 12px 8px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {QUICK_QUESTIONS.map((q, i) => (
                <button key={i} onClick={() => sendMessage(q)}
                  style={{ fontSize: 11, padding: '5px 10px', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 20, color: 'var(--primary-light)', cursor: 'pointer' }}>
                  {q}
                </button>
              ))}
            </div>
          )}

          <div className="chatbot-input">
            <input
              id="chat-input"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Ask me anything about procurement..."
            />
            <button id="chat-send" className="chat-send-btn" onClick={() => sendMessage()} disabled={loading}>
              <Send size={15} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
