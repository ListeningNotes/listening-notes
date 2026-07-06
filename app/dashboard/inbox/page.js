'use client';

import { useState, useEffect } from 'react';
import PasswordGate from '../../../components/session_components/PasswordGate';

const MONO  = "'DM Mono', 'Courier New', monospace";
const SERIF = "'DM Serif Display', Georgia, serif";
const SANS  = "'DM Sans', system-ui, sans-serif";
const BORDER = '1px solid #e0dcd5';
const labelStyle = { fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#7a776f' };

function NoteModal({ submission, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(26,25,22,0.55)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
      <div style={{ background: '#fff', border: BORDER, borderRadius: 20, width: '100%', maxWidth: 520, boxShadow: '0 24px 80px rgba(0,0,0,0.2)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 28px', borderBottom: BORDER, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: SERIF, fontSize: 18, color: '#1a1916' }}>{submission.album}</div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: '#aaa8a2', marginTop: 2 }}>{submission.artist}{submission.year ? ` · ${submission.year}` : ''}</div>
          </div>
          <button onClick={onClose} style={{ fontFamily: MONO, fontSize: 11, color: '#7a776f', background: '#f0ede8', border: BORDER, borderRadius: 8, padding: '7px 14px', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: '24px 28px' }}>
          {submission.submitter_name && (
            <div style={{ ...labelStyle, marginBottom: 8 }}>from {submission.submitter_name}</div>
          )}
          <p style={{ fontFamily: SANS, fontSize: 14, color: '#1a1916', lineHeight: 1.7, margin: 0 }}>{submission.note}</p>
          {submission.submitter_email && (
            <div style={{ fontFamily: MONO, fontSize: 10, color: '#aaa8a2', marginTop: 16 }}>{submission.submitter_email}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Inbox() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState('submissions'); // 'submissions' | 'comments'

  // Submissions
  const [submissions, setSubmissions] = useState([]);
  const [subLoading, setSubLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [viewing, setViewing] = useState(null);

  // Comments (pending moderation)
  const [comments, setComments] = useState([]);
  const [comLoading, setComLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/check')
      .then(r => r.json())
      .then(d => setAuthed(!!d.authed))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetch('/api/submissions')
      .then(r => r.json())
      .then(d => { setSubmissions(d.submissions || []); setSubLoading(false); })
      .catch(() => setSubLoading(false));
    fetch('/api/comments/pending')
      .then(r => r.json())
      .then(d => { setComments(d.comments || []); setComLoading(false); })
      .catch(() => setComLoading(false));
  }, [authed]);

  async function updateStatus(id, status) {
    await fetch(`/api/submissions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setSubmissions(prev => prev.map(s => s.id === id ? { ...s, status } : s));
  }

  async function approveComment(id) {
    await fetch(`/api/comments/${id}`, { method: 'PATCH' });
    setComments(prev => prev.filter(c => c.id !== id));
  }

  async function dismissComment(id) {
    await fetch(`/api/comments/${id}`, { method: 'DELETE' });
    setComments(prev => prev.filter(c => c.id !== id));
  }

  const filtered = submissions.filter(s => s.status === filter);
  const subCounts = {
    pending: submissions.filter(s => s.status === 'pending').length,
    reviewed: submissions.filter(s => s.status === 'reviewed').length,
    dismissed: submissions.filter(s => s.status === 'dismissed').length,
  };

  if (checking) return <div style={{ minHeight: '100vh', background: '#f5f3ef' }} />;
  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />;

  const tabBtn = (key, label, count) => (
    <button key={key} onClick={() => setTab(key)}
      style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase', padding: '7px 16px', borderRadius: 8, border: BORDER, cursor: 'pointer', background: tab === key ? '#1a1916' : '#fff', color: tab === key ? '#fff' : '#7a776f' }}>
      {label} {count > 0 ? `(${count})` : ''}
    </button>
  );

  return (
    <>
      <style>{`
        .inbox-row:hover { background: #f0ede8; }
        .inbox-row { transition: background 0.1s; }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f5f3ef', fontFamily: SANS, color: '#1a1916' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 28px', borderBottom: BORDER, background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 10 }}>
          <a href="/dashboard" style={{ fontFamily: 'Fraunces, serif', fontSize: 18, fontWeight: 900, color: '#1a1916', letterSpacing: '-0.02em', textDecoration: 'none' }}>Listening Notes</a>
          <span style={{ color: '#d0ccc5' }}>·</span>
          <span style={labelStyle}>inbox</span>

          <div style={{ display: 'flex', gap: 6, marginLeft: 16 }}>
            {tabBtn('submissions', 'Submissions', subCounts.pending)}
            {tabBtn('comments', 'Comments', comments.length)}
          </div>

          <div style={{ marginLeft: 'auto' }}>
            <a href="/dashboard" style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#7a776f', textDecoration: 'none', padding: '7px 14px', border: BORDER, borderRadius: 8, background: '#fff' }}>← Dashboard</a>
          </div>
        </div>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '32px 24px' }}>

          {/* ── SUBMISSIONS ── */}
          {tab === 'submissions' && (
            <>
              <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
                {['pending', 'reviewed', 'dismissed'].map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 12px', borderRadius: 6, border: BORDER, cursor: 'pointer', background: filter === f ? '#1a1916' : '#fff', color: filter === f ? '#fff' : '#7a776f' }}>
                    {f} {subCounts[f] > 0 ? `(${subCounts[f]})` : ''}
                  </button>
                ))}
              </div>

              {subLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[...Array(5)].map((_, i) => <div key={i} style={{ height: 64, borderRadius: 10, background: '#ece9e3' }} />)}
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ padding: '64px 0', textAlign: 'center', fontFamily: MONO, fontSize: 11, color: '#aaa8a2' }}>
                  No {filter} submissions.
                </div>
              ) : (
                <div style={{ background: '#fff', border: BORDER, borderRadius: 14, overflow: 'hidden' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 60px 140px 120px', padding: '8px 20px', borderBottom: BORDER, background: '#f5f3ef' }}>
                    {['Album', 'Artist', 'Year', 'From', ''].map((h, i) => (
                      <div key={i} style={{ ...labelStyle, padding: '4px 0' }}>{h}</div>
                    ))}
                  </div>

                  {filtered.map(s => (
                    <div key={s.id} className="inbox-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 60px 140px 120px', padding: '14px 20px', borderBottom: BORDER, alignItems: 'center' }}>
                      <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.album}</div>
                      <div style={{ fontFamily: MONO, fontSize: 11, color: '#7a776f', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.artist}</div>
                      <div style={{ fontFamily: MONO, fontSize: 11, color: '#aaa8a2' }}>{s.year || '—'}</div>
                      <div style={{ fontFamily: MONO, fontSize: 11, color: '#aaa8a2', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.submitter_name || 'Anonymous'}</div>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button onClick={() => setViewing(s)}
                          style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 10px', borderRadius: 6, border: BORDER, background: '#fff', color: '#7a776f', cursor: 'pointer' }}>
                          Note
                        </button>
                        <a href="/dashboard"
                          style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 10px', borderRadius: 6, border: 'none', background: '#1a1916', color: '#fff', cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                          onClick={() => updateStatus(s.id, 'reviewed')}>
                          Listen →
                        </a>
                        {s.status !== 'dismissed' && (
                          <button onClick={() => updateStatus(s.id, 'dismissed')}
                            style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '5px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff', color: '#ef4444', cursor: 'pointer' }}>
                            ✕
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── COMMENTS (pending moderation) ── */}
          {tab === 'comments' && (
            <>
              {comLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[...Array(4)].map((_, i) => <div key={i} style={{ height: 90, borderRadius: 12, background: '#ece9e3' }} />)}
                </div>
              ) : comments.length === 0 ? (
                <div style={{ padding: '64px 0', textAlign: 'center', fontFamily: MONO, fontSize: 11, color: '#aaa8a2' }}>
                  No comments awaiting moderation.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {comments.map(c => (
                    <div key={c.id} style={{ background: '#fff', border: BORDER, borderRadius: 12, padding: '16px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600 }}>{c.author_name}</span>
                        <a href={`/entries/${c.entry_slug}`} target="_blank" rel="noopener noreferrer"
                          style={{ fontFamily: MONO, fontSize: 10, color: '#7a776f', textDecoration: 'none', borderBottom: '1px solid #e0dcd5' }}>
                          on {c.entry_slug}{c.track_index >= 0 ? ` · track ${c.track_index + 1}` : ''} ↗
                        </a>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: '#c0bcb4', marginLeft: 'auto' }}>
                          {new Date(c.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p style={{ fontFamily: SANS, fontSize: 14, color: '#1a1916', lineHeight: 1.7, margin: '0 0 14px' }}>{c.content}</p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => approveComment(c.id)}
                          style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '7px 16px', borderRadius: 8, border: 'none', background: '#1a1916', color: '#fff', cursor: 'pointer' }}>
                          Approve
                        </button>
                        <button onClick={() => dismissComment(c.id)}
                          style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '7px 16px', borderRadius: 8, border: '1px solid #fca5a5', background: '#fff', color: '#ef4444', cursor: 'pointer' }}>
                          Dismiss
                        </button>
                        {c.author_email && (
                          <span style={{ fontFamily: MONO, fontSize: 10, color: '#c0bcb4', marginLeft: 'auto' }}>{c.author_email}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {viewing && <NoteModal submission={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
