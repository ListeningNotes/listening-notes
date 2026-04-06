'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useListeningBeacon } from '../../../hooks/useListeningBeacon';

// ── Helpers ────────────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return m + 'm ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + 'h ago';
  const d = Math.floor(h / 24);
  if (d < 7) return d + 'd ago';
  return Math.floor(d / 7) + 'w ago';
}

function starsFromRating(r) {
  const n = parseFloat(r);
  if (!n) return '';
  const full = Math.floor(n);
  const half = n % 1 >= 0.5;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - (half ? 1 : 0));
}

const BLOCK_MAP = { '▁':0.12,'▂':0.25,'▃':0.37,'▄':0.50,'▅':0.62,'▆':0.75,'▇':0.87,'█':1.00 };
const VALID_BLOCKS = new Set(Object.keys(BLOCK_MAP));

function parseHorizon(horizon) {
  if (!horizon) return [];
  if (horizon.trim().startsWith('[')) {
    try {
      const arr = JSON.parse(horizon);
      if (Array.isArray(arr)) return arr.map(v => parseFloat(v) / 5);
    } catch {}
  }
  return [...horizon.trim()].filter(c => VALID_BLOCKS.has(c)).map(c => BLOCK_MAP[c]);
}

function parseTracksFromNotes(notes) {
  if (!notes) return [];
  const normalized = notes.replace(/\\n/g, '\n');
  const lines = normalized.split('\n');
  const tracks = [];
  let current = null;
  let noteLines = [];
  for (const line of lines) {
    const m = line.match(/^(\d+)\.\s+(.+?)(?:\s+[—–-]\s+([\u2605\u2606\u00BD]+))?$/);
    if (m) {
      if (current) { current.note = noteLines.join('\n').trim(); tracks.push(current); }
      current = { number: parseInt(m[1]), title: m[2].trim(), rating: m[3] || '' };
      noteLines = [];
    } else if (current && line.trim()) {
      noteLines.push(line.trim());
    }
  }
  if (current) { current.note = noteLines.join('\n').trim(); tracks.push(current); }
  return tracks;
}

function splitNotes(notes) {
  if (!notes) return { album: '', tracks: '' };
  const idx = notes.search(/\n\n1\.\s|\n\nTrack \d/);
  if (idx !== -1) return { album: notes.slice(0, idx).trim(), tracks: notes.slice(idx).trim() };
  const lines = notes.split('\n');
  const splitLine = lines.findIndex(l => /^1\.\s/.test(l) || /^Track \d/.test(l));
  if (splitLine > 0) return { album: lines.slice(0, splitLine).join('\n').trim(), tracks: lines.slice(splitLine).join('\n').trim() };
  return { album: notes, tracks: '' };
}

// ── Nav Beacon ─────────────────────────────────────────────────────────────

function NavBeacon() {
  const { track, isLive } = useListeningBeacon();
  const [open, setOpen] = useState(false);
  const [recents, setRecents] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    async function fetchRecents() {
      try {
        const res = await fetch('https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=listeningnotes&api_key=f022ca293645cd4cf2beeb3be7ae4b6f&limit=5&format=json');
        const data = await res.json();
        const all = data?.recenttracks?.track || [];
        setRecents(all.filter(t => !t['@attr']?.nowplaying).slice(0, 3).map(t => ({
          name: t.name,
          artist: t.artist['#text'],
          art: t.image?.[2]?.['#text'] || ''
        })));
      } catch {}
    }
    fetchRecents();
    const iv = setInterval(fetchRecents, 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const artUrl = track?.image || '';
  const trackName = track?.name || '';
  const artistName = track?.artist || '';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          borderRadius: '999px', padding: '5px 12px 5px 6px', cursor: 'pointer',
          transition: 'border-color 0.2s',
        }}
      >
        <div style={{ width: '26px', height: '26px', borderRadius: '6px', overflow: 'hidden', background: '#2a2a2a', flexShrink: 0 }}>
          {artUrl && <img src={artUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', maxWidth: '140px' }}>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#e8e4dc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {trackName || '—'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {isLive && <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#7cff9b', flexShrink: 0, animation: 'ln-pulse 2.5s ease-in-out infinite' }} />}
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#555' }}>
              {isLive ? 'Now listening' : 'Last played'}
            </span>
          </div>
        </div>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          background: 'rgba(22,22,22,0.92)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px',
          padding: '16px', width: '240px', zIndex: 300,
          boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        }}>
          {artUrl && (
            <div style={{ width: '100%', aspectRatio: '1', borderRadius: '10px', overflow: 'hidden', marginBottom: '12px' }}>
              <img src={artUrl} alt={trackName} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
          )}
          <div style={{ fontFamily: 'Fraunces, serif', fontWeight: 900, fontSize: '15px', color: '#e8e4dc', lineHeight: 1.2, marginBottom: '3px' }}>{trackName}</div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#555', letterSpacing: '0.06em', marginBottom: '14px' }}>{artistName}</div>
          {recents.length > 0 && (
            <>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#444', marginBottom: '10px', paddingTop: '12px', borderTop: '1px solid #2a2a2a' }}>Recently played</div>
              {recents.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <div style={{ width: '30px', height: '30px', borderRadius: '5px', overflow: 'hidden', background: '#2a2a2a', flexShrink: 0 }}>
                    {r.art && <img src={r.art} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '11px', color: '#e8e4dc', lineHeight: 1.3 }}>{r.name}</div>
                    <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#555', letterSpacing: '0.04em' }}>{r.artist}</div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Comment components ─────────────────────────────────────────────────────

function CommentThread({ comment, slug, onReplyPosted }) {
  const [collapsed, setCollapsed] = useState(false);
  const [replying, setReplying] = useState(false);
  const [upvotes, setUpvotes] = useState(comment.upvotes);
  const [upvoted, setUpvoted] = useState(false);
  const [replyName, setReplyName] = useState('');
  const [replyEmail, setReplyEmail] = useState('');
  const [replyText, setReplyText] = useState('');
  const [posting, setPosting] = useState(false);

  async function handleUpvote() {
    if (upvoted) return;
    setUpvoted(true);
    setUpvotes(v => v + 1);
    await fetch('/api/comments/upvote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: comment.id }),
    });
  }

  async function handleReply() {
    if (!replyName.trim() || !replyEmail.trim() || !replyText.trim()) return;
    setPosting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          track_index: comment.track_index,
          parent_id: comment.id,
          author_name: replyName,
          author_email: replyEmail,
          content: replyText,
        }),
      });
      const data = await res.json();
      if (data.comment) {
        setReplying(false);
        setReplyName(''); setReplyEmail(''); setReplyText('');
        onReplyPosted();
      }
    } finally {
      setPosting(false);
    }
  }

  const initials = comment.author_name.slice(0, 2).toUpperCase();

  return (
    <div style={{ display: 'flex', gap: 0, marginBottom: '2px' }}>
      {/* Gutter */}
      <div
        onClick={() => setCollapsed(v => !v)}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '32px', flexShrink: 0, cursor: 'pointer' }}
      >
        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#1c1c1c', border: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'DM Mono, monospace', fontSize: '8px', color: '#555', flexShrink: 0 }}>
          {initials}
        </div>
        {(comment.replies?.length > 0 || !collapsed) && (
          <div style={{ flex: 1, width: '1px', background: collapsed ? 'transparent' : '#2a2a2a', margin: '3px 0', minHeight: '12px', transition: 'background 0.2s' }} />
        )}
      </div>

      {/* Body */}
      <div style={{ flex: 1, paddingTop: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', color: '#e8e4dc', letterSpacing: '0.04em' }}>{comment.author_name}</span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#444' }}>{timeAgo(comment.created_at)}</span>
        </div>

        {!collapsed && (
          <>
            <div style={{ fontSize: '13px', lineHeight: 1.7, color: '#a8a49c', marginBottom: '8px' }}>{comment.content}</div>
            <div style={{ display: 'flex', gap: '14px', marginBottom: '10px' }}>
              <button onClick={handleUpvote} style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: upvoted ? '#c8d47a' : '#555', background: 'none', border: 'none', cursor: upvoted ? 'default' : 'pointer', padding: 0 }}>
                ↑ {upvotes}
              </button>
              <button onClick={() => setReplying(v => !v)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#555', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                reply
              </button>
              <button onClick={() => setCollapsed(true)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#555', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                collapse
              </button>
            </div>

            {replying && (
              <div style={{ marginBottom: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input value={replyName} onChange={e => setReplyName(e.target.value)} placeholder="Name" style={inputStyle} />
                  <input value={replyEmail} onChange={e => setReplyEmail(e.target.value)} placeholder="Email (private)" type="email" style={inputStyle} />
                </div>
                <textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Reply..." rows={2} style={{ ...inputStyle, resize: 'vertical', width: '100%' }} />
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleReply} disabled={posting} style={accentBtnSm}>{posting ? '…' : 'Post reply'}</button>
                  <button onClick={() => setReplying(false)} style={ghostBtnSm}>Cancel</button>
                </div>
              </div>
            )}

            {comment.replies?.length > 0 && (
              <div style={{ paddingLeft: '0' }}>
                {comment.replies.map(r => (
                  <CommentThread key={r.id} comment={r} slug={slug} onReplyPosted={onReplyPosted} />
                ))}
              </div>
            )}
          </>
        )}

        {collapsed && (
          <button onClick={() => setCollapsed(false)} style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#444', background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 10px' }}>
            {comment.replies?.length > 0 ? `expand (${comment.replies.length} repl${comment.replies.length > 1 ? 'ies' : 'y'})` : 'expand'}
          </button>
        )}
      </div>
    </div>
  );
}

function NewCommentForm({ slug, trackIndex, onPosted }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');

  async function handlePost() {
    setError('');
    if (!name.trim() || !email.trim() || !text.trim()) { setError('Name, email and comment are required.'); return; }
    setPosting(true);
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, track_index: trackIndex, author_name: name, author_email: email, content: text }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      setName(''); setEmail(''); setText('');
      onPosted();
    } catch { setError('Something went wrong.'); }
    finally { setPosting(false); }
  }

  return (
    <div style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #2a2a2a' }}>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Name" style={inputStyle} />
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (private)" type="email" style={inputStyle} />
      </div>
      <textarea value={text} onChange={e => setText(e.target.value)} placeholder="What did you hear?" rows={3} style={{ ...inputStyle, resize: 'vertical', width: '100%', marginBottom: '8px' }} />
      {error && <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#ff6b6b', marginBottom: '8px' }}>{error}</div>}
      <button onClick={handlePost} disabled={posting} style={accentBtnSm}>{posting ? 'Posting…' : 'Post comment'}</button>
    </div>
  );
}

function TrackThread({ track, trackIndex, slug, commentsByTrack, onRefresh }) {
  const [open, setOpen] = useState(false);
  const trackComments = commentsByTrack[String(trackIndex)] || [];
  const count = trackComments.length;

  function scrollAndOpen() {
    setOpen(true);
  }

  const ratingStr = starsFromRating(track.rating);

  return (
    <div id={'track-' + trackIndex} style={{ borderBottom: '1px solid #2a2a2a' }}>
      <div
        onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0', cursor: 'pointer' }}
      >
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#555', width: '20px', textAlign: 'right', flexShrink: 0 }}>{track.number}</span>
        <span style={{ fontSize: '13px', color: '#e8e4dc', flex: 1 }}>{track.title}</span>
        {ratingStr && <span style={{ fontSize: '11px', color: '#c8d47a', letterSpacing: '1px' }}>{ratingStr}</span>}
        <span style={{
          fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.06em',
          color: count ? '#c8d47a' : '#555',
          background: count ? 'rgba(200,212,122,0.08)' : '#1c1c1c',
          border: '1px solid ' + (count ? 'rgba(200,212,122,0.25)' : '#2a2a2a'),
          borderRadius: '999px', padding: '3px 10px', whiteSpace: 'nowrap', flexShrink: 0,
          transition: 'all 0.15s',
        }}>
          {count ? count + ' comment' + (count > 1 ? 's' : '') : '+ comment'}
        </span>
        <span style={{ fontSize: '10px', color: '#555', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>▶</span>
      </div>

      {track.note && (
        <p style={{ fontSize: '13px', lineHeight: 1.8, color: '#a8a49c', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #2a2a2a', whiteSpace: 'pre-wrap' }}>{track.note}</p>
      )}
      {open && (
        <div style={{ paddingLeft: '32px', paddingBottom: '20px' }}>
          <NewCommentForm slug={slug} trackIndex={trackIndex} onPosted={onRefresh} />
          {trackComments.length === 0 && (
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#444', paddingBottom: '8px' }}>No comments yet. Be the first.</div>
          )}
          {trackComments.map(c => (
            <CommentThread key={c.id} comment={c} slug={slug} onReplyPosted={onRefresh} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Horizon Bar ────────────────────────────────────────────────────────────

function HorizonBar({ horizon, tracks, commentsByTrack, onBarClick }) {
  const bars = parseHorizon(horizon);
  if (!bars.length) return null;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '52px' }}>
        {bars.map((h, i) => {
          const track = tracks[i];
          const count = (commentsByTrack[String(i)] || []).length;
          const label = track ? (i + 1) + '. ' + track.title : 'Track ' + (i + 1);
          const ratingStr = track?.rating ? starsFromRating(track.rating) : '';
          return (
            <div
              key={i}
              onClick={() => onBarClick(i)}
              title={label}
              style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', cursor: 'pointer', position: 'relative' }}
            >
              {count > 0 && (
                <div style={{ position: 'absolute', top: '-8px', left: '50%', transform: 'translateX(-50%)', width: '5px', height: '5px', borderRadius: '50%', background: '#c8d47a' }} />
              )}
              <div style={{ borderRadius: '2px 2px 0 0', background: '#c8d47a', height: (h * 100) + '%', transition: 'background 0.15s, transform 0.1s', transformOrigin: 'bottom' }}
                onMouseEnter={e => { e.currentTarget.style.background = '#e0ec9a'; e.currentTarget.parentNode.style.transform = 'scaleX(1.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#c8d47a'; e.currentTarget.parentNode.style.transform = 'scaleX(1)'; }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#555', letterSpacing: '0.1em' }}>track 1</span>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', color: '#555', letterSpacing: '0.1em' }}>track {bars.length}</span>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function PostClient({ entry }) {
  const [commentsByTrack, setCommentsByTrack] = useState({});
  const [commentsLoaded, setCommentsLoaded] = useState(false);

  // Force dark theme — post page is always dark
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.style.background = '#0e0e0e';
    return () => {
      document.documentElement.removeAttribute('data-theme');
      document.body.style.background = '';
    };
  }, []);

  const tags = entry.tags
    ? (Array.isArray(entry.tags) ? entry.tags : entry.tags.split(',').map(t => t.trim()).filter(Boolean))
    : [];

  const { album: albumNotes, tracks: trackNotesRaw } = splitNotes(entry.notes);
  const parsedTracks = parseTracksFromNotes(entry.notes);
  const horizonBars = parseHorizon(entry.horizon);

  async function loadComments() {
    try {
      const res = await fetch('/api/comments?slug=' + entry.slug);
      const data = await res.json();
      setCommentsByTrack(data.comments || {});
      setCommentsLoaded(true);
    } catch {}
  }

  useEffect(() => { loadComments(); }, []);

  function handleBarClick(i) {
    const el = document.getElementById('track-' + i);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  const ratingNum = parseFloat(entry.rating);
  const ratingStr = starsFromRating(entry.rating);
  const isMasterpiece = entry.masterpiece === true;

  return (
    <div style={{ background: '#0e0e0e', minHeight: '100vh', color: '#e8e4dc', fontFamily: 'DM Sans, sans-serif' }}>

      <style>{`
        @keyframes ln-pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(124,255,155,0.5); }
          50% { box-shadow: 0 0 0 5px rgba(124,255,155,0); }
        }
        @keyframes ln-breathe {
          0%,100% { opacity:1; } 50% { opacity:0.6; }
        }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(14,14,14,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '12px 32px',
      }}>
        <div style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '20px' }}>
          <a href="/" style={{ fontFamily: 'Fraunces, serif', fontWeight: 900, fontSize: '18px', color: '#e8e4dc', textDecoration: 'none', letterSpacing: '-0.02em', flexShrink: 0 }}>Listening Notes</a>
          <div style={{ display: 'flex', gap: '2px', flex: 1 }}>
            <a href="/" style={navLinkStyle}>← All entries</a>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#333', alignSelf: 'center', padding: '0 4px' }}>/</span>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#a8a49c', padding: '7px 12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{entry.album}</span>
          </div>
          <NavBeacon />
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{ position: 'relative', height: '360px', overflow: 'hidden' }}>
        {entry.album_art && (
          <div style={{ position: 'absolute', inset: '-40px', backgroundImage: 'url(' + entry.album_art + ')', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(50px) saturate(1.3) brightness(0.55)', transform: 'scale(1.2)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0e0e0e 20%, rgba(14,14,14,0.3) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(14,14,14,0.4) 0%, transparent 40%)' }} />

        {/* Metadata overlay */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '0 48px 36px', maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '24px' }}>
            {entry.album_art && (
              <div style={{
                width: '110px', height: '110px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0,
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}>
                <img src={entry.album_art} alt={entry.album} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            )}
            <div style={{ flex: 1, paddingBottom: '4px' }}>
              <h1 style={{ fontFamily: 'DM Serif Display, serif', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 400, lineHeight: 1.05, color: '#e8e4dc', marginBottom: '6px' }}>
                {entry.album}
                {isMasterpiece && <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c8d47a', marginLeft: '12px', verticalAlign: 'middle', animation: 'ln-breathe 2.8s ease-in-out infinite' }}>Masterpiece</span>}
              </h1>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(232,228,220,0.5)', marginBottom: '12px' }}>
                {entry.artist}{entry.year ? ' · ' + entry.year : ''}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {ratingStr && <span style={{ color: '#c8d47a', fontSize: '14px', letterSpacing: '2px' }}>{ratingStr}</span>}
                {entry.relationship && <Chip>{entry.relationship}</Chip>}
                {entry.entry_type && <Chip>{entry.entry_type}</Chip>}
                {(entry.favorite === true || entry.favorite === 'true') && <Chip accent>Favorite</Chip>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 48px 100px' }}>

        {/* Background */}
        {entry.background && (
          <section style={{ marginBottom: '48px' }}>
            <SLabel>Background</SLabel>
            <p style={{ lineHeight: 1.85, color: '#a8a49c', fontSize: '14px' }}>{entry.background}</p>
          </section>
        )}

        {/* Notes */}
        {albumNotes && (
          <section style={{ marginBottom: '48px' }}>
            <SLabel>Notes</SLabel>
            <div style={{ lineHeight: 1.95, fontSize: '15px', whiteSpace: 'pre-wrap', color: '#e8e4dc' }}>{albumNotes}</div>
          </section>
        )}

        {/* ── HORIZON ── */}
        {horizonBars.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <SLabelInline>Horizon</SLabelInline>
              <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444' }}>click a bar to jump to track</span>
            </div>
            <HorizonBar
              horizon={entry.horizon}
              tracks={parsedTracks}
              commentsByTrack={commentsByTrack}
              onBarClick={handleBarClick}
            />
          </section>
        )}

        {/* ── TRACKS + COMMENTS ── */}
        {parsedTracks.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <SLabel>Tracks</SLabel>
            <div>
              {parsedTracks.map((t, i) => (
                <TrackThread
                  key={i}
                  track={t}
                  trackIndex={i}
                  slug={entry.slug}
                  commentsByTrack={commentsByTrack}
                  onRefresh={loadComments}
                />
              ))}
            </div>
          </section>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <SLabel>Tags</SLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {tags.map((tag, i) => (
                <span key={i} style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#555', border: '1px solid #2a2a2a', borderRadius: '4px', padding: '3px 8px' }}>{tag}</span>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', color: '#333' }}>{new Date(entry.created_at).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</span>
          <a href="/" style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444', textDecoration: 'none' }}>← All entries</a>
        </div>

      </div>
    </div>
  );
}

// ── Small shared components ────────────────────────────────────────────────

function SLabel({ children }) {
  return <div style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#555', marginBottom: '16px', paddingBottom: '10px', borderBottom: '1px solid #2a2a2a' }}>{children}</div>;
}
function SLabelInline({ children }) {
  return <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#555' }}>{children}</span>;
}
function Chip({ children, accent }) {
  return <span style={{ fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.08em', border: '1px solid ' + (accent ? 'rgba(200,212,122,0.3)' : '#2a2a2a'), color: accent ? '#c8d47a' : '#a8a49c', borderRadius: '4px', padding: '3px 8px' }}>{children}</span>;
}

const inputStyle = {
  background: 'rgba(255,255,255,0.04)', border: '1px solid #2a2a2a', borderRadius: '6px',
  color: '#e8e4dc', padding: '7px 10px', fontFamily: 'DM Mono, monospace', fontSize: '11px',
  outline: 'none', flex: 1, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
};
const accentBtnSm = {
  fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase',
  color: '#0e0e0e', background: '#c8d47a', border: 'none', borderRadius: '6px',
  padding: '7px 14px', cursor: 'pointer',
};
const ghostBtnSm = {
  fontFamily: 'DM Mono, monospace', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase',
  color: '#555', background: 'none', border: '1px solid #2a2a2a', borderRadius: '6px',
  padding: '7px 14px', cursor: 'pointer',
};
const navLinkStyle = {
  fontFamily: 'DM Mono, monospace', fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase',
  color: '#555', textDecoration: 'none', padding: '7px 12px', borderRadius: '8px',
  transition: 'color 0.15s', flexShrink: 0,
};
