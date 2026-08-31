// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import backgrounds from '../../../components/session_components/backgrounds';
import { fonts } from '../../../library/sitewide_visuals';

const MONO  = "'DM Mono', 'Courier New', monospace";
// The sitewide title face — Nunito bold, same as --font-display. Kept as a
// local const because this file predates the token and reaches for it inline.
const SERIF = "var(--font-nunito), sans-serif";
const SANS  = "'DM Sans', system-ui, sans-serif";

const INK = '#1a1916';
// INK is text and stays near-black for legibility; SOLID is the button fill,
// a softer warm grey, because a button-sized slab of INK reads as harsh.
const SOLID = '#4a4643';
const FOLDER_BG = 'rgba(255,255,255,0.8)';
const label = { fontFamily: MONO, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(26,25,22,0.45)' };

// A folder tab that connects to the open panel when active. Module scope so it
// keeps a stable identity across renders.
function FolderTab({ id, tab, onSelect, children }) {
  const active = tab === id;
  return (
    <button onClick={() => onSelect(id)}
      style={{
        fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase',
        padding: active ? '11px 24px 13px' : '9px 22px 11px',
        border: 'none', cursor: 'pointer',
        borderRadius: '16px 16px 0 0',
        marginBottom: active ? -1 : 0,
        background: active ? FOLDER_BG : 'rgba(255,255,255,0.42)',
        color: active ? INK : 'rgba(26,25,22,0.42)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        boxShadow: active ? '0 -6px 18px rgba(0,0,0,0.05)' : 'none',
        position: 'relative', zIndex: active ? 2 : 1,
        transition: 'background 0.15s, color 0.15s, padding 0.12s',
      }}>
      {children}
    </button>
  );
}

// NoteModal is gone. It existed because the submissions view was a table with
// no room in it for a paragraph, so the one part of a send that mattered — why
// somebody sent it — was hidden behind a button marked "Note". The view is a
// shelf now and the message is on the front of every item, which is what it
// was always for.

export default function Inbox() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState('submissions');
  const [albums, setAlbums] = useState([]);
  // Lazy initialiser so the pick happens once, not on every render — the
  // useRef form re-rolled the dice each time and threw the result away.
  const [Background] = useState(() => backgrounds[Math.floor(Math.random() * backgrounds.length)]);

  const [submissions, setSubmissions] = useState([]);
  const [subLoading, setSubLoading] = useState(true);
  const [filter, setFilter] = useState('pending');

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
  // Takes a sent album into a listen. Everything the session would otherwise
  // ask for is already known here, which is the whole point of the send flow:
  //
  //   the record   — the sender picked it off a shelf of covers, so this opens
  //                  on their pressing rather than searching for it again
  //   where it's from — the session's one remaining question is "Where's it
  //                  from?", and an album that arrived in the inbox answers it
  //                  by having arrived in the inbox
  //   who sent it  — received_from used to be typed in from memory a week
  //                  later. It fills itself in from the row now, along with
  //                  the date the send is stamped with.
  //
  // So this goes straight to the session rather than through the Listen page,
  // the same way resuming a saved draft does, and for the same reason: there
  // is nothing left to ask.
  //
  // Marked reviewed before leaving, and awaited — a fetch left in flight while
  // the router navigates is a fetch that may never land, and the row would
  // still be sitting in Pending when the listen was finished.
  async function startListen(sent) {
    localStorage.setItem('ln_pending_session', JSON.stringify({
      album: sent.album,
      artist: sent.artist || '',
      year: sent.year || '',
      artUrl: sent.album_art || '',
      collectionId: sent.collection_id || null,
      genre: '',
      entryType: 'Submission',
      receivedFrom: sent.submitter_name || '',
      receivedDate: sent.created_at ? String(sent.created_at).slice(0, 10) : '',
    }));
    await updateStatus(sent.id, 'reviewed');
    router.push('/dashboard/echo/session');
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
  if (!authed) { if (typeof window !== 'undefined') window.location.replace('/login'); return null; }


  const subFilter = (f) => ({
    fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase',
    padding: '4px 4px', border: 'none', background: 'none', cursor: 'pointer',
    color: filter === f ? INK : 'rgba(26,25,22,0.35)',
    borderBottom: filter === f ? '1.5px solid ' + INK : '1.5px solid transparent',
  });
  const rowAction = (danger, solid) => ({
    fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
    padding: '6px 13px', borderRadius: 999, cursor: 'pointer',
    border: danger ? '1px solid rgba(239,68,68,0.4)' : (solid ? 'none' : '1px solid rgba(26,25,22,0.12)'),
    background: solid ? SOLID : 'rgba(255,255,255,0.6)',
    color: solid ? '#fff' : (danger ? '#ef4444' : 'rgba(26,25,22,0.55)'),
    textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
  });

  return (
    <>
      <style>{`
        .inbox-row:hover { background: rgba(255,255,255,0.4); }
        .inbox-row { transition: background 0.12s; }

        /* One received album. Cover on the left at the size of a thing being
           handed over, everything said about it in a column to the right. */
        .inbox-sent {
          display: flex; gap: 18px; align-items: flex-start;
          padding: 20px 6px;
          border-bottom: 1px solid rgba(26,25,22,0.07);
        }
        .inbox-sent:last-child { border-bottom: none; }
        .inbox-sent-art {
          flex-shrink: 0; width: 96px; height: 96px;
          border-radius: 8px; overflow: hidden;
          background: rgba(26,25,22,0.05);
          box-shadow: 0 6px 22px rgba(0,0,0,0.16);
          display: flex; align-items: center; justify-content: center;
        }
        .inbox-sent-art img { width: 100%; height: 100%; object-fit: cover; display: block; }
        /* A send typed in by hand rather than picked off the shelf has no
           cover. The frame stays so the column does not shift under the ones
           that do. */
        .inbox-sent-none { font-size: 26px; color: rgba(26,25,22,0.22); }

        .inbox-sent-said { min-width: 0; flex: 1; }
        .inbox-sent-album {
          font-family: var(--font-nunito), sans-serif; font-weight: 700;
          font-size: 16px; color: #1a1916; line-height: 1.25;
        }
        .inbox-sent-artist {
          font-family: 'DM Mono', 'Courier New', monospace; font-size: 11px;
          color: rgba(26,25,22,0.42); margin-top: 2px;
        }
        /* The message. Set at reading size rather than table size, because it
           is the only thing here somebody wrote. */
        .inbox-sent-note {
          font-family: 'DM Sans', system-ui, sans-serif; font-size: 14px;
          color: #1a1916; line-height: 1.7; margin: 11px 0 10px;
          white-space: pre-wrap; overflow-wrap: anywhere;
        }
        .inbox-sent-from {
          display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap;
          font-family: 'DM Mono', 'Courier New', monospace; font-size: 10px;
          letter-spacing: 0.08em; color: rgba(26,25,22,0.45);
        }
        .inbox-sent-journal {
          color: rgba(26,25,22,0.55); text-decoration: none;
          border-bottom: 1px solid rgba(26,25,22,0.18);
          overflow-wrap: anywhere;
        }
        .inbox-sent-journal:hover { color: #1a1916; }
        .inbox-sent-when { margin-left: auto; color: rgba(26,25,22,0.28); }
        .inbox-sent-row { display: flex; align-items: center; gap: 8px; margin-top: 14px; }

        @media (max-width: 640px) {
          .inbox-sent { gap: 14px; }
          .inbox-sent-art { width: 72px; height: 72px; }
          .inbox-sent-when { margin-left: 0; }
        }
        html, body { background: #eef0ec; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.14); border-radius: 99px; }
      `}</style>

      <div style={{ height: '100vh', position: 'relative', overflow: 'hidden', background: '#eef0ec', fontFamily: SANS, color: INK, display: 'flex', flexDirection: 'column' }}>
        <Background albums={albums} />
        <div style={{ position: 'absolute', inset: 0, zIndex: 1, backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', background: 'rgba(224,224,220,0.5)', pointerEvents: 'none' }} />

        {/* Back to dashboard — same style + place as /dashboard/echo */}
        <div style={{ position: 'relative', zIndex: 3, padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <a href="/dashboard" style={{ fontFamily: fonts.mono, fontWeight: 600, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(26,21,32,0.5)', textDecoration: 'none', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(26,21,32,0.12)', background: 'rgba(245,242,236,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', flexShrink: 0 }}>← Dashboard</a>
        </div>

        <div style={{ position: 'relative', zIndex: 2, flex: 1, minHeight: 0, width: '100%', maxWidth: 940, alignSelf: 'center', padding: '8px 24px 24px', display: 'flex', flexDirection: 'column' }}>

          {/* Folder tabs */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, paddingLeft: 14, position: 'relative', zIndex: 2, flexShrink: 0 }}>
            <FolderTab id="submissions" tab={tab} onSelect={setTab}>Submissions{subCounts.pending > 0 ? ` (${subCounts.pending})` : ''}</FolderTab>
            <FolderTab id="comments" tab={tab} onSelect={setTab}>Comments{comments.length > 0 ? ` (${comments.length})` : ''}</FolderTab>
          </div>

          {/* Open folder */}
          <div style={{
            position: 'relative', zIndex: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
            background: FOLDER_BG, backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
            border: '1px solid rgba(255,255,255,0.55)', borderRadius: '20px 20px 24px 24px',
            boxShadow: '0 12px 44px rgba(0,0,0,0.10)', overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(160deg, rgba(255,255,255,0.5) 0%, transparent 45%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, overflowY: 'auto', padding: '22px 26px 28px' }}>

              {/* ── SUBMISSIONS ── */}
              {tab === 'submissions' && (
                <>
                  <div style={{ display: 'flex', gap: 18, marginBottom: 18 }}>
                    {['pending', 'reviewed', 'dismissed'].map(f => (
                      <button key={f} onClick={() => setFilter(f)} style={subFilter(f)}>
                        {f}{subCounts[f] > 0 ? ` ${subCounts[f]}` : ''}
                      </button>
                    ))}
                  </div>

                  {subLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {[...Array(4)].map((_, i) => <div key={i} style={{ height: 46, borderRadius: 10, background: 'rgba(255,255,255,0.4)' }} />)}
                    </div>
                  ) : filtered.length === 0 ? (
                    <div style={{ padding: '80px 0', textAlign: 'center', fontFamily: MONO, fontSize: 11, color: 'rgba(26,25,22,0.35)' }}>No {filter} submissions.</div>
                  ) : (
                    // A shelf, not a spreadsheet. The cover is the first thing
                    // because a cover is what was handed over; the message is
                    // the body because it is the part doing the work; the name
                    // sits under it the way a signature does. The five-column
                    // table this replaced reported the same facts in the shape
                    // of a database row, which is the shape of the thing rather
                    // than the shape of what happened.
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {filtered.map(sent => (
                        <div key={sent.id} className="inbox-sent">
                          <div className="inbox-sent-art">
                            {sent.album_art
                              ? <img src={sent.album_art} alt="" />
                              : <span className="inbox-sent-none" aria-hidden="true">&#9834;</span>}
                          </div>

                          <div className="inbox-sent-said">
                            <div className="inbox-sent-album">{sent.album}</div>
                            <div className="inbox-sent-artist">
                              {sent.artist}{sent.year ? ' \u00b7 ' + sent.year : ''}
                            </div>

                            <p className="inbox-sent-note">{sent.note}</p>

                            <div className="inbox-sent-from">
                              <span>from {sent.submitter_name || 'someone'}</span>
                              {/* Stored without a scheme on purpose - see the
                                  note in the submissions route - so the
                                  https:// here is the only one there can be. */}
                              {sent.sender_url && (
                                <a
                                  href={'https://' + sent.sender_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inbox-sent-journal"
                                >{sent.sender_url} &#8599;</a>
                              )}
                              <span className="inbox-sent-when">
                                {new Date(sent.created_at).toLocaleDateString()}
                              </span>
                            </div>

                            <div className="inbox-sent-row">
                              <button onClick={() => startListen(sent)} style={{ ...rowAction(false, true), fontSize: 10, padding: '8px 18px' }}>
                                Start a listen &#8594;
                              </button>
                              {sent.status !== 'dismissed' && (
                                <button onClick={() => updateStatus(sent.id, 'dismissed')} style={{ ...rowAction(true, false), fontSize: 9 }}>
                                  Dismiss
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* ── COMMENTS ── */}
              {tab === 'comments' && (
                <>
                  {comLoading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      {[...Array(3)].map((_, i) => <div key={i} style={{ height: 70, borderRadius: 10, background: 'rgba(255,255,255,0.4)' }} />)}
                    </div>
                  ) : comments.length === 0 ? (
                    <div style={{ padding: '80px 0', textAlign: 'center', fontFamily: MONO, fontSize: 11, color: 'rgba(26,25,22,0.35)' }}>No comments awaiting moderation.</div>
                  ) : (
                    <div>
                      {comments.map((c, i) => (
                        <div key={c.id} style={{ padding: '18px 6px', borderBottom: i < comments.length - 1 ? '1px solid rgba(26,25,22,0.08)' : 'none' }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontFamily: SANS, fontSize: 13, fontWeight: 600 }}>{c.author_name}</span>
                            <a href={`/entries/${c.entry_slug}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(26,25,22,0.5)', textDecoration: 'none', borderBottom: '1px solid rgba(26,25,22,0.15)' }}>
                              on {c.entry_slug}{c.track_index >= 0 ? ` · track ${c.track_index + 1}` : ''} ↗
                            </a>
                            <span style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(26,25,22,0.3)', marginLeft: 'auto' }}>{new Date(c.created_at).toLocaleDateString()}</span>
                          </div>
                          <p style={{ fontFamily: SANS, fontSize: 14, color: INK, lineHeight: 1.7, margin: '0 0 12px' }}>{c.content}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <button onClick={() => approveComment(c.id)} style={{ ...rowAction(false, true), fontSize: 10, padding: '7px 18px' }}>Approve</button>
                            <button onClick={() => dismissComment(c.id)} style={{ ...rowAction(true, false), fontSize: 10, padding: '7px 18px' }}>Dismiss</button>
                            {c.author_url && (
                              <a href={'https://' + c.author_url} target="_blank" rel="noopener noreferrer"
                                 style={{ fontFamily: MONO, fontSize: 10, color: 'rgba(26,25,22,0.4)', marginLeft: 'auto', textDecoration: 'none', borderBottom: '1px solid rgba(26,25,22,0.15)' }}>
                                {c.author_url} &#8599;
                              </a>
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
        </div>
      </div>

    </>
  );
}
