'use client';
import { useState } from 'react';
import { fonts } from '../../library/sitewide_visuals';

const border = '1px solid #e0dcd5';

export default function PasswordGate({ onAuth }) {
  const [pw, setPw] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAuth() {
    if (loading || !pw) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        onAuth();
      } else {
        setError(true);
        setPw('');
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f3ef', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: fonts.sans }}>
      <div style={{ background: '#fff', border, borderRadius: 20, padding: 48, width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 4px 32px rgba(0,0,0,0.08)' }}>
        <div>
          <div style={{ fontFamily: 'Fraunces, serif', fontSize: 26, fontWeight: 900, color: '#1a1916', letterSpacing: '-0.02em' }}>Listening Notes</div>
          <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a776f', marginTop: 4 }}>session access</div>
        </div>
        <input type="password" placeholder="password" value={pw}
          onChange={e => { setPw(e.target.value); setError(false); }}
          onKeyDown={e => e.key === 'Enter' && handleAuth()}
          disabled={loading}
          style={{ background: '#fff', border: `1px solid ${error ? '#ef4444' : '#e0dcd5'}`, borderRadius: 8, padding: '12px 16px', fontFamily: fonts.mono, fontSize: 13, color: '#1a1916', outline: 'none', opacity: loading ? 0.6 : 1 }}
        />
        {error && <div style={{ fontFamily: fonts.mono, fontSize: 11, color: '#ef4444' }}>incorrect password</div>}
        <button onClick={handleAuth} disabled={loading}
          style={{ background: '#1a1916', color: '#fff', borderRadius: 8, padding: '12px 0', fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', cursor: loading ? 'default' : 'pointer', border: 'none', fontWeight: 600, opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Checking…' : 'Enter →'}
        </button>
      </div>
    </div>
  );
}
