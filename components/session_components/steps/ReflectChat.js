'use client';
import { fonts } from '../../../library/sitewide_visuals';
import { tx, bdr, dk, lbl } from '../../../library/session_styles';
import SessionButton from '../SessionButton';

// Step 3 — Echo-powered reflection chat with quick-prompt shortcuts.

export default function ReflectChat({
  chatMessages,
  chatInput,
  setChatInput,
  chatLoading,
  chatEndRef,
  sendChat,
  onNext,
}) {
  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 }}>

        {chatMessages.length === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4 }}>
            <div style={{ ...lbl, marginBottom: 8 }}>Quick prompts</div>
            {['Reflect on my notes so far', 'What patterns do you notice?', 'Push back on something I said'].map(p => (
              <button key={p} onClick={() => sendChat(p)} style={{
                fontFamily: fonts.mono, fontSize: 11, color: tx(0.75),
                background: dk(0.42), border: `1px solid ${bdr(0.14)}`,
                borderRadius: 20, padding: '10px 18px', cursor: 'pointer', textAlign: 'left', letterSpacing: '0.03em',
              }}>{p}</button>
            ))}
          </div>
        )}

        {chatMessages.map((m, i) => {
          // Both bubbles keep white text; the speaker reads from how dark the
          // surface is, plus the side it sits on and the label above it.
          const isUser = m.role === 'user';
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: isUser ? 'flex-end' : 'flex-start' }}>
              <div style={{ ...lbl }}>{isUser ? 'you' : 'echo'}</div>
              <div style={{
                maxWidth: '80%', padding: '11px 16px', borderRadius: 16,
                background: isUser ? dk(0.58) : dk(0.36),
                border: `1px solid ${isUser ? bdr(0.2) : bdr(0.12)}`,
                fontFamily: fonts.sans, fontSize: 13, lineHeight: 1.75,
                color: isUser ? tx(0.95) : tx(0.9),
                whiteSpace: 'pre-wrap', fontStyle: isUser ? 'normal' : 'italic',
              }}>
                {m.text}
              </div>
            </div>
          );
        })}

        {chatLoading && (
          <div style={{ display: 'flex', gap: 5, padding: '4px 2px' }}>
            {[0, 1, 2].map(i => <div key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: tx(0.25), animation: `ln-dot 1.4s ease-in-out ${i * 0.22}s infinite` }} />)}
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div style={{ borderTop: `1px solid ${bdr(0.07)}`, paddingTop: 14, display: 'flex', gap: 10, alignItems: 'center' }}>
        <input
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()}
          placeholder="ask echo anything..."
          style={{ flex: 1, background: dk(0.45), border: `1px solid ${bdr(0.16)}`, borderRadius: 20, padding: '10px 18px', fontFamily: fonts.mono, fontSize: 11, color: tx(0.9), outline: 'none' }}
        />
        <SessionButton onClick={() => sendChat()} disabled={!chatInput.trim() || chatLoading} style={{ padding: '10px 18px' }}>→</SessionButton>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
        <button onClick={onNext} style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: tx(0.25), background: 'none', border: 'none', cursor: 'pointer' }}>
          Skip →
        </button>
        <SessionButton onClick={onNext} accent>Continue →</SessionButton>
      </div>
    </div>
  );
}
