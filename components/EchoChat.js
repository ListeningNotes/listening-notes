'use client';
import { useEffect, useRef } from 'react';

export default function EchoChat({ open, onClose, messages, onSend, loading, input, setInput }) {
  const endRef  = useRef(null);
  const inputEl = useRef(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputEl.current?.focus(), 60);
    }
  }, [open]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Click-away backdrop */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 19 }} />

      {/* Chat panel — floats above the orb (bottom-right) */}
      <div style={{
        position: 'fixed',
        bottom: 84,
        right: 24,
        width: 280,
        borderRadius: 12,
        background: '#f5f2ec',
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 21,
        maxHeight: '60vh',
      }}>

        {/* Thread */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '14px 14px 10px' }}>
          {messages.length === 0 && (
            <div style={{ fontFamily: "'Nunito', sans-serif", fontSize: 12, color: 'rgba(26,21,32,0.35)', fontStyle: 'italic', paddingTop: 8 }}>
              ask echo something...
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} style={{
              marginBottom: 12,
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
            }}>
              <div style={{
                maxWidth: '85%',
                fontFamily: "'Nunito', sans-serif",
                fontSize: 13,
                lineHeight: 1.65,
                color: m.role === 'user' ? '#555' : '#1a1520',
                fontStyle: m.role === 'assistant' ? 'italic' : 'normal',
                textAlign: m.role === 'user' ? 'right' : 'left',
                whiteSpace: 'pre-wrap',
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', gap: 4, paddingBottom: 8 }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: 'rgba(112,96,160,0.4)', animation: `echo-dot 1.2s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div style={{ borderTop: '1px solid rgba(0,0,0,0.06)', padding: '9px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            ref={inputEl}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && input.trim()) { e.preventDefault(); onSend(input.trim()); } }}
            placeholder="ask echo something..."
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              fontFamily: "'Nunito', sans-serif", fontSize: 13, color: '#1a1520',
            }}
          />
          <button
            onClick={() => input.trim() && onSend(input.trim())}
            disabled={!input.trim() || loading}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(112,96,160,0.7)', fontSize: 16, padding: 0, lineHeight: 1 }}
          >
            →
          </button>
        </div>
      </div>

      <style>{`@keyframes echo-dot{0%,80%,100%{opacity:0.3;transform:scale(1)}40%{opacity:1;transform:scale(1.3)}}`}</style>
    </>
  );
}
