// app/entries/[slug]/PostClient.js
// The interactive UI for a single entry page.
// This is a CLIENT component — it runs in the browser and handles all interactivity:
// comments, upvotes, the horizon bar, track threads, and the live listening beacon.
// It receives the entry data from page.js which fetched it server-side.

'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fonts } from '../../../library/sitewide_visuals';
import { parseHorizon, parseTracksFromNotes, splitNotes } from '../../../library/entry_formatter';
import DotNav from '../../../components/main_components/DotNav';
import { useTheme } from '../../../components/main_components/Lightswitch';
import HorizonBar from '../../../components/main_components/Slug_Page/HorizonBar';
import TrackThread from '../../../components/main_components/Slug_Page/TrackThread';
import MetadataLabel from '../../../components/main_components/Slug_Page/MetadataLabel';
import MetadataLabelInline from '../../../components/main_components/Slug_Page/MetadataLabelInline';
import Chip from '../../../components/main_components/Slug_Page/Chip';


export default function FullPostPage({ entry }) {
  const { theme, toggle } = useTheme();
  const [commentsByTrack, setCommentsByTrack] = useState({});
  const [commentsLoaded, setCommentsLoaded] = useState(false);

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
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--ink)', fontFamily: fonts.sans }}>

      <style>{`
        @keyframes ln-pulse {
          0%,100% { box-shadow: 0 0 0 0 var(--accent); }
          50% { box-shadow: 0 0 0 5px transparent; }
        }
        @keyframes ln-breathe {
          0%,100% { opacity:1; } 50% { opacity:0.6; }
        }

        /* Layout — base (desktop). Responsive overrides live in the media query below. */
        .ln-hero-pad    { padding: 0 48px 36px; }
        .ln-hero-row    { display: flex; align-items: flex-end; gap: 24px; }
        .ln-content     { padding: 48px 48px 100px; }

        @media (max-width: 600px) {
          .ln-hero-pad    { padding: 0 24px 28px; }
          .ln-hero-row    { flex-direction: column; align-items: flex-start; gap: 14px; }
          .ln-content     { padding: 40px 24px 80px; }
        }
      `}</style>

      {/* ── NAV ── shared site nav (logo + corner icons + dot nav), identical to every other public page */}
      <Link href="/" className="hp-logo-mini" aria-label="Listening Notes">
        <img src="/Logo.png" alt="Listening Notes" style={{ height: 30, width: 'auto', display: 'block', filter: theme === 'dark' ? 'invert(1)' : 'none' }} />
      </Link>
      <div className="hp-corner">
        <a
          href="https://instagram.com/listeningnotes.blog"
          target="_blank"
          rel="noopener noreferrer"
          className="hp-icon-btn"
          aria-label="Instagram"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/></svg>
        </a>
        <button className="hp-icon-btn" onClick={toggle} aria-label="Toggle theme">
          {theme === 'dark' ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/></svg>
          )}
        </button>
      </div>
      <DotNav />

      {/* ── HERO ── Blurred album art background with metadata overlay */}
      <div style={{ position: 'relative', height: '360px', overflow: 'hidden' }}>
        {entry.album_art && (
          <div style={{ position: 'absolute', inset: '-40px', backgroundImage: 'url(' + entry.album_art + ')', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(50px) saturate(1.3) brightness(1.05)', transform: 'scale(1.2)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg) 20%, transparent 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, var(--bg) 0%, transparent 38%)' }} />

        <div className="ln-hero-pad" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, maxWidth: '860px', margin: '0 auto' }}>
          <div className="ln-hero-row">
            {entry.album_art && (
              <div style={{
                width: '110px', height: '110px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0,
                boxShadow: 'var(--shadow-lift)',
                border: '1px solid var(--panel-border)',
              }}>
                <img src={entry.album_art} alt={entry.album} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              </div>
            )}
            <div style={{ flex: 1, paddingBottom: '4px' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 400, lineHeight: 1.05, color: 'var(--ink)', marginBottom: '6px' }}>
                {entry.album}
                {isMasterpiece && <span style={{ fontFamily: 'var(--font-label)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginLeft: '12px', verticalAlign: 'middle', animation: 'ln-breathe 2.8s ease-in-out infinite' }}>Masterpiece</span>}
              </h1>
              <div style={{ fontFamily: 'var(--font-label)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: '12px' }}>
                {entry.artist}{entry.year ? ' · ' + entry.year : ''}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {StarVisualConversion && <span style={{ color: 'var(--gold)', fontSize: '14px', letterSpacing: '2px' }}>{StarVisualConversion}</span>}
                {entry.relationship && <Chip>{entry.relationship}</Chip>}
                {entry.entry_type && <Chip>{entry.entry_type}</Chip>}
                {(entry.favorite === true || entry.favorite === 'true') && <Chip accent>Favorite</Chip>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="ln-content" style={{ maxWidth: '860px', margin: '0 auto' }}>

        {entry.background && (
          <section style={{ marginBottom: '48px' }}>
            <MetadataLabel>Background</MetadataLabel>
            <p style={{ lineHeight: 1.85, color: 'var(--ink-soft)', fontSize: '14px' }}>{entry.background}</p>
          </section>
        )}

        {albumNotes && (
          <section style={{ marginBottom: '48px' }}>
            <MetadataLabel>Notes</MetadataLabel>
            <div style={{ lineHeight: 1.95, fontSize: '15px', whiteSpace: 'pre-wrap', color: 'var(--ink)' }}>{albumNotes}</div>
          </section>
        )}

        {horizonBars.length > 0 && (
          <section style={{ marginBottom: '48px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <MetadataLabelInline>Horizon</MetadataLabelInline>
              <span style={{ fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>click a bar to jump to track</span>
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
                <span key={i} style={{ fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', border: '1px solid var(--border)', borderRadius: '4px', padding: '3px 8px' }}>{tag}</span>
              ))}
            </div>
          </section>
        )}

        {/* Footer — date and back link */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: fonts.mono, fontSize: '10px', color: 'var(--ink-faint)' }}>{new Date(entry.created_at).toLocaleDateString('en-US', { year:'numeric', month:'long', day:'numeric' })}</span>
          <a href="/" style={{ fontFamily: fonts.mono, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-soft)', textDecoration: 'none' }}>← All entries</a>
        </div>

      </div>
    </div>
  );
}
