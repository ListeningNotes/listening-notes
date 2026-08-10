// app/entries/[slug]/PostClient.js
// The interactive UI for a single entry page.
// This is a CLIENT component — it runs in the browser and handles all interactivity:
// comments, upvotes, the horizon bar, track threads, and the live listening beacon.
// It receives the entry data from page.js which fetched it server-side.

'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fonts } from '../../../library/sitewide_visuals';
import { parseHorizon, entryTracks, splitNotes } from '../../../library/entry_formatter';
import DotNav from '../../../components/main_components/DotNav';
import SiteNav from '../../../components/main_components/SiteNav';
import HorizonBar from '../../../components/main_components/Slug_Page/HorizonBar';
import TrackThread from '../../../components/main_components/Slug_Page/TrackThread';
import MetadataLabel from '../../../components/main_components/Slug_Page/MetadataLabel';
import MetadataLabelInline from '../../../components/main_components/Slug_Page/MetadataLabelInline';
import Chip from '../../../components/main_components/Slug_Page/Chip';
import StarRating from '../../../components/main_components/StarRating';


export default function FullPostPage({ entry }) {
  const [commentsByTrack, setCommentsByTrack] = useState({});
  const [commentsLoaded, setCommentsLoaded] = useState(false);

  // Parse tags — stored as either an array or comma-separated string in the DB
  const tags = entry.tags
    ? (Array.isArray(entry.tags) ? entry.tags : entry.tags.split(',').map(t => t.trim()).filter(Boolean))
    : [];

  const { albumNotes } = splitNotes(entry.notes);
  const parsedTracks = entryTracks(entry);
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

  // Load comments once when the page mounts. The work is wrapped so nothing is
  // set during the effect's synchronous pass, and a cancel flag stops a slow
  // response writing state after the page has moved on.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/comments?slug=' + entry.slug);
        const data = await res.json();
        if (cancelled) return;
        setCommentsByTrack(data.comments || {});
        setCommentsLoaded(true);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [entry.slug]);

  // Smooth scroll to a track section when clicking a horizon bar
  function handleBarClick(i) {
    const el = document.getElementById('track-' + i);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  const allTracksFive = parsedTracks.length > 0 && parsedTracks.every(t => t.stars === 5);
  const isMasterpiece = allTracksFive || entry.rating === 'Masterpiece';
  const displayRating = isMasterpiece ? 5 : parseFloat(entry.rating) || 0;

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

      {/* ── NAV ── shared site nav (logo + dot nav), identical to every other public page */}
      <SiteNav />
      <DotNav />

      {/* ── HERO ── Blurred album art background with metadata overlay.
          390px, not 360 — the album thumbnail/title sit bottom-anchored in
          here, and need the extra room to clear SiteNav + DotNav above. */}
      <div style={{ position: 'relative', height: '390px', overflow: 'hidden' }}>
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
                {displayRating > 0 && <StarRating rating={displayRating} size={15} glow={isMasterpiece} style={{ verticalAlign: 'middle' }} />}
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
          <Link href="/" style={{ fontFamily: fonts.mono, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-soft)', textDecoration: 'none' }}>← All entries</Link>
        </div>

      </div>
    </div>
  );
}
