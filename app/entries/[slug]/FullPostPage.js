// app/entries/[slug]/PostClient.js
// The interactive UI for a single entry page.
// This is a CLIENT component — it runs in the browser and handles all interactivity:
// comments, upvotes, the horizon bar, track threads, and the live listening beacon.
// It receives the entry data from page.js which fetched it server-side.

'use client';
import { useState, useEffect } from 'react';
import { fonts } from '../../../library/sitewide_visuals';
import { parseHorizon, parseTracksFromNotes, splitNotes } from '../../../library/entry_formatter';
import NavBeacon from '../../../components/main_components/NavBeacon';
import HorizonBar from '../../../components/main_components/Slug_Page/HorizonBar';
import TrackThread from '../../../components/main_components/Slug_Page/TrackThread';
import MetadataLabel from '../../../components/main_components/Slug_Page/MetadataLabel';
import MetadataLabelInline from '../../../components/main_components/Slug_Page/MetadataLabelInline';
import Chip from '../../../components/main_components/Slug_Page/Chip';


export default function FullPostPage({ entry }) {
  const [commentsByTrack, setCommentsByTrack] = useState({});
  const [commentsLoaded, setCommentsLoaded] = useState(false);

  // Force dark theme on this page regardless of any global theme setting
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.body.style.background = '#0e0e0e';
    return () => {
      document.documentElement.removeAttribute('data-theme');
      document.body.style.background = '';
    };
  }, []);

  // Parse tags — stored as either an array or comma-separated string in the DB
  const tags = entry.tags
    ? (Array.isArray(entry.tags) ? entry.tags : entry.tags.split(',').map(t => t.trim()).filter(Boolean))
    : [];

  const { albumNotes } = splitNotes(entry.notes);
  const parsedTracks = parseTracksFromNotes(entry.track_notes || entry.notes);
  const horizonBars = parseHorizon(entry.horizon);

  // Load comments from the API for this entry
  async function loadComments() {
    try {
      const res = await fetch('/api/comments?slug=' + entry.slug);
      const data = await res.json();
      setCommentsByTrack(data.comments || {});
      setCommentsLoaded(true);
    } catch {}
  }

  // Load comments once when the page mounts
  useEffect(() => { loadComments(); }, []);

  // Smooth scroll to a track section when clicking a horizon bar
  function handleBarClick(i) {
    const el = document.getElementById('track-' + i);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  const allTracksFive = parsedTracks.length > 0 && parsedTracks.every(t => t.stars === 5);
  const isMasterpiece = allTracksFive || entry.rating === 'Masterpiece';
  const displayRating = isMasterpiece ? 5 : parseFloat(entry.rating) || 0;
  const StarVisualConversion = displayRating > 0 ? '★'.repeat(Math.floor(displayRating)) + (displayRating % 1 >= 0.5 ? '½' : '') : '';

  return (
    <div style={{ background: '#0e0e0e', minHeight: '100vh', color: '#e8e4dc', fontFamily: fonts.sans }}>

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
            <span style={{ fontFamily: fonts.mono, fontSize: '10px', color: '#333', alignSelf: 'center', padding: '0 4px' }}>/</span>
            <span style={{ fontFamily: fonts.mono, fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#a8a49c', padding: '7px 12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '200px' }}>{entry.album}</span>
          </div>
          <NavBeacon />
        </div>
      </nav>

      {/* ── HERO ── Blurred album art background with metadata overlay */}
      <div style={{ position: 'relative', height: '360px', overflow: 'hidden' }}>
        {entry.album_art && (
          <div style={{ position: 'absolute', inset: '-40px', backgroundImage: 'url(' + entry.album_art + ')', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(50px) saturate(1.3) brightness(0.55)', transform: 'scale(1.2)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0e0e0e 20%, rgba(14,14,14,0.3) 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(14,14,14,0.4) 0%, transparent 40%)' }} />

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
              <h1 style={{ fontFamily: fonts.serif, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 400, lineHeight: 1.05, color: '#e8e4dc', marginBottom: '6px' }}>
                {entry.album}
                {isMasterpiece && <span style={{ fontFamily: fonts.mono, fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#c8d47a', marginLeft: '12px', verticalAlign: 'middle', animation: 'ln-breathe 2.8s ease-in-out infinite' }}>Masterpiece</span>}
              </h1>
              <div style={{ fontFamily: fonts.mono, fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(232,228,220,0.5)', marginBottom: '12px' }}>
                {entry.artist}{entry.year ? ' · ' + entry.year : ''}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {StarVisualConversion && <span style={{ color: '#c8d47a', fontSize: '14px', letterSpacing: '2px' }}>{StarVisualConversion}</span>}
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

        {entry.background && (
          <section style={{ marginBottom: '48px' }}>
            <MetadataLabel>Background</MetadataLabel>
            <p style={{ lineHeight: 1.85, color: '#a8a49c', fontSize: '14px' }}>{entry.background}</p>
          </section>
        )}

        {albumNotes && (
          <section style={{ marginBottom: '48px' }}>
            <MetadataLabel>Notes</MetadataLabel>
            <div style={{ lineHeight: 1.95, fontSize: '15px', whiteSpace: 'pre-wrap', color: '#e8e4dc' }}>{albumNotes}</div>
          </section>
        )}

        {horizonBars.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <MetadataLabelInline>Horizon</MetadataLabelInline>
              <span style={{ fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444' }}>click a bar to jump to track</span>
            </div>
            <HorizonBar
              horizon={entry.horizon}
              tracks={parsedTracks}
              commentsByTrack={commentsByTrack}
              onBarClick={handleBarClick}
            />
          </section>
        )}

        {parsedTracks.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <MetadataLabel>Tracks</MetadataLabel>
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

        {tags.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <MetadataLabel>Tags</MetadataLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {tags.map((tag, i) => (
                <span key={i} style={{ fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#555', border: '1px solid #2a2a2a', borderRadius: '4px', padding: '3px 8px' }}>{tag}</span>
              ))}
            </div>
          </section>
        )}

        {/* Footer — date and back link */}
        <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: fonts.mono, fontSize: '10px', color: '#333' }}>{new Date(entry.created_at).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</span>
          <a href="/" style={{ fontFamily: fonts.mono, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444', textDecoration: 'none' }}>← All entries</a>
        </div>

      </div>
    </div>
  );
}

const navLinkStyle = {
  fontFamily: fonts.mono, fontSize: '10px', letterSpacing: '0.08em', textTransform: 'uppercase',
  color: '#555', textDecoration: 'none', padding: '7px 12px', borderRadius: '8px',
  transition: 'color 0.15s', flexShrink: 0,
};