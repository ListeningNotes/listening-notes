'use client';

import { useState, useEffect, useRef } from 'react';
import PasswordGate from '../../../components/session_components/PasswordGate';
import backgrounds from '../../../components/session_components/backgrounds';

const MONO  = "'DM Mono', 'Courier New', monospace";
const SERIF = "'DM Serif Display', Georgia, serif";
const SANS  = "'DM Sans', system-ui, sans-serif";
const SYNE  = "'Syne', sans-serif";

const INK = '#1a1916';
const label = { fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(26,25,22,0.45)' };

// Frosted-glass "widget" recipe — matches the hub cards + homepage modal.
const glass = {
  background: 'rgba(255,255,255,0.72)',
  backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
  border: '1px solid rgba(255,255,255,0.55)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.09)',
  position: 'relative',
  overflow: 'hidden',
};
const Sheen = () => (
  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(145deg, rgba(255,255,255,0.55) 0%, transparent 55%)', pointerEvents: 'none' }} />
);

function NoteModal({ submission, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(26,25,22,0.28)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ ...glass, borderRadius: 24, width: '100%', maxWidth: 520 }}>
        <Sheen />
        <div style={{ position: 'relative', zIndex: 1, padding: '22px 28px', borderBottom: '1px solid rgba(26,25,22,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: SERIF, fontSize: 19, color: INK }}>{submission.album}</div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(26,25,22,0.4)', marginTop: 2 }}>{submission.artist}{submission.year ? ` · ${submission.year}` : ''}</div>
          </div>
          <button onClick={onClose} style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(26,25,22,0.5)', background: 'rgba(255,255,255,0.6)', border: '1px solid rgba(26,25,22,0.1)', borderRadius: 10, padding: '7px 13px', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ position: 'relative', zIndex: 1, padding: '22px 28px' }}>
          {submission.submitter_name && <div style={{ ...label, marginBottom: 8 }}>from {submission.submitter_name}</div>}
          <p style={{ fontFamily: SANS, fontSize: 14, color: INK, lineHeight: 1.7, margin: 0 }}>{submission.note}</p>
          {submission.submitter_email && <div style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(26,25,22,0.35)', marginTop: 16 }}>{submission.submitter_email}</div>}
        </div>
      </div>
    </div>
  );
}

export default function Inbox() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState('submissions');
  const [albums, setAlbums] = useState([]);
  const Background = useRef(backgrounds[Math.floor(Math.random() * backgrounds.length)]).current;

  const [submissions, setSubmissions] = useState([]);
  const [subLoading, setSubLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [viewing, setViewing] = useState(null);

  const [comments, setComments] = useState([]);
  const [comLoading, setComLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/check').then(r => r.json()).then(d => setAuthed(!!d.authed)).catch(() => {}).finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!authed) return;
    fetch('/api/entries').then(r => r.json()).then(d => {
      const withArt = (d.entries || []).filter(e => e.album_art);
      setAlbums(withArt.sort(() => Math.random() - 0.5));
    }).catch(() => {});
    fetch('/api/submissions').then(r => r.json()).then(d => { setSubmissions(d.submissions || []); setSubLoading(false); }).catch(() => setSubLoading(false));
    fetch('/api/comments/pending').then(r => r.json()).then(d => { setComments(d.comments || []); setComLoading(false); }).catch(() => setComLoading(false));
  }, [authed]);

  async function updateStatus(id, status) {
    await fetch(`/api/submissions/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
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

  if (checking) return <div style={{ minHeight: '100vh', background: '#eef0ec' }} />;
  if (!authed) return <PasswordGate onAuth={() => setAuthed(true)} />;

  const pill = (active) => ({
    fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
    padding: '8px 16px', borderRadius: 999, cursor: 'pointer',
    border: active ? 'none' : '1px solid rgba(26,25,22,0.12)',
    background: active ? INK : 'rgba(255,255,255,0.55)',
    color: active ? '#fff' : 'rgba(26,25,22,0.5)',
    backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
  });
  const actionBtn = (danger) => ({
    fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
    padding: '6px 12px', borderRadius: 999, cursor: 'pointer',
    border: danger ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(26,25,22,0.12)',
    background: danger ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.55)',
    color: danger ? '#ef4444' : 'rgba(26,25,22,0.55)',
  });

  return (
    <>
      <style>{`
        .inbox-row:hover { background: rgba(255,255,255,0.45); }
        .inbox-row { transition: background 0.12s; }
        html, body { background: #eef0ec; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.14); border-radius: 99px; }
      `}</style>

      <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', background: '#eef0ec', fontFamily: SANS, color: INK }}>

        {/* Animated album background + frosted overlay (matches the hub) */}
        <Background albums={albums} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', background: 'rgba(224,224,220,0.5)', pointerEvents: 'none' }} />

        <div style={{ position: 'relative', zIndex: 2, maxWidth: 940, margin: '0 auto', padding: '28px 24px 48px' }}>

          {/* Floating header widget */}
          <div style={{ ...glass, borderRadius: 22, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
            <Sheen />
            <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 14, width: '100%' }}>
              <span style={{ fontFamily: SYNE, fontSize: 15, fontWeight: 700, letterSpacing: '-0.01em', color: INK }}>Inbox</span>
              <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
                <button onClick={() => setTab('submissions')} style={pill(tab === 'submissions')}>Submissions {subCounts.pending > 0 ? `(${subCounts.pending})` : ''}</button>
                <button onClick={() => setTab('comments')} style={pill(tab === 'comments')}>Comments {comments.length > 0 ? `(${comments.length})` : ''}</button>
              </div>
              <a href="/dashboard" style={{ ...label, marginLeft: 'auto', textDecoration: 'none' }}>← Dashboard</a>
            </div>
          </div>

          {/* ── SUBMISSIONS ── */}
          {tab === 'submissions' && (
            <>
              <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                {['pending', 'reviewed', 'dismissed'].map(f => (
                  <button key={f} onClick={() => setFilter(f)} style={pill(filter === f)}>
                    {f} {subCounts[f] > 0 ? `(${subCounts[f]})` : ''}
                  </button>
                ))}
              </div>

              {subLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[...Array(4)].map((_, i) => <div key={i} style={{ height: 60, borderRadius: 16, background: 'rgba(255,255,255,0.4)' }} />)}
                </div>
              ) : filtered.length === 0 ? (
                <div style={{ ...glass, borderRadius: 22, padding: '56px 0', textAlign: 'center', fontFamily: MONO, fontSize: 11, color: 'rgba(26,25,22,0.4)' }}>
                  <Sheen /><span style={{ position: 'relative', zIndex: 1 }}>No {filter} submissions.</span>
                </div>
              ) : (
                <div style={{ ...glass, borderRadius: 22 }}>
                  <Sheen />
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 60px 130px 130px', padding: '12px 22px', borderBottom: '1px solid rgba(26,25,22,0.08)' }}>
                      {['Album', 'Artist', 'Year', 'From', ''].map((h, i) => <div key={i} style={label}>{h}</div>)}
                    </div>
                    {filtered.map(s => (
                      <div key={s.id} className="inbox-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 60px 130px 130px', padding: '14px 22px', borderBottom: '1px solid rgba(26,25,22,0.06)', alignItems: 'center' }}>
                        <div style={{ fontFamily: SANS, fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.album}</div>
                        <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(26,25,22,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.artist}</div>
                        <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(26,25,22,0.4)' }}>{s.year || '—'}</div>
                        <div style={{ fontFamily: MONO, fontSize: 11, color: 'rgba(26,25,22,0.4)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.submitter_name || 'Anonymous'}</div>
                        <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button onClick={() => setViewing(s)} style={actionBtn(false)}>Note</button>
                          <a href="/dashboard" onClick={() => updateStatus(s.id, 'reviewed')} style={{ ...actionBtn(false), background: INK, color: '#fff', border: 'none', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Listen →</a>
                          {s.status !== 'dismissed' && <button onClick={() => updateStatus(s.id, 'dismissed')} style={actionBtn(true)}>✕</button>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── COMMENTS ── */}
          {tab === 'comments' && (
            <>
              {comLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[...Array(3)].map((_, i) => <div key={i} style={{ height: 96, borderRadius: 20, background: 'rgba(255,255,255,0.4)' }} />)}
                </div>
              ) : comments.length === 0 ? (
                <div style={{ ...glass, borderRadius: 22, padding: '56px 0', textAlign: 'center', fontFamily: MONO, fontSize: 11, color: 'rgba(26,25,22,0.4)' }}>
                  <Sheen /><span style={{ position: 'relative', zIndex: 1 }}>No comments awaiting moderation.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {comments.map(c => (
                    <div key={c.id} style={{ ...glass, borderRadius: 20, padding: '18px 22px' }}>
                      <Sheen />
                      <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600 }}>{c.author_name}</span>
                          <a href={`/entries/${c.entry_slug}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(26,25,22,0.5)', textDecoration: 'none', borderBottom: '1px solid rgba(26,25,22,0.15)' }}>
                            on {c.entry_slug}{c.track_index >= 0 ? ` · track ${c.track_index + 1}` : ''} ↗
                          </a>
                          <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(26,25,22,0.3)', marginLeft: 'auto' }}>{new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                        <p style={{ fontFamily: SANS, fontSize: 14, color: INK, lineHeight: 1.7, margin: '0 0 14px' }}>{c.content}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <button onClick={() => approveComment(c.id)} style={{ ...actionBtn(false), fontSize: 10, padding: '8px 18px', background: INK, color: '#fff', border: 'none' }}>Approve</button>
                          <button onClick={() => dismissComment(c.id)} style={{ ...actionBtn(true), fontSize: 10, padding: '8px 18px' }}>Dismiss</button>
                          {c.author_email && <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(26,25,22,0.3)', marginLeft: 'auto' }}>{c.author_email}</span>}
                        </div>
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
