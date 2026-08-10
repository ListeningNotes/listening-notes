// components/EntryModal.js
// The overlay modal that opens when you click an entry tile on the archive
// page. Shows the full entry — art, metadata, background, notes, horizon bar, tags.
// Does NOT load a new page — it overlays the current page and updates the URL
// to /entries/[slug] so the entry is shareable, then restores / on close.

'use client';
import { fonts } from '../../library/sitewide_visuals';

import { useEffect, useLayoutEffect, useState, useRef, useCallback } from 'react';
import StarRating from './StarRating';
import HorizonGenerator from './entry_modal/HorizonGenerator';
import StickyHeader from './entry_modal/StickyHeader';
import { entryTracks, splitNotes, parseRating } from '../../library/entry_formatter';


const WIDGET_BG = 'var(--panel)';
const WIDGET_BORDER = 'var(--panel-border)';
const DIVIDER = 'var(--border)';


export default function EntryModal({ slug, originRect, onClose }) {
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [animateBars, setAnimateBars] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef(null);
  const dialogRef = useRef(null);
  const closingRef = useRef(false);

  // Map the modal's resting box onto a target rect (a strip tile), so it can
  // grow out of / shrink back into that tile. transform-origin is the top-left.
  function flipFrom(node, target) {
    const final = node.getBoundingClientRect();
    return `translate(${target.left - final.left}px, ${target.top - final.top}px)`
      + ` scale(${target.width / final.width}, ${target.height / final.height})`;
  }

  // Animate the modal shrinking back toward the (still-drifting) tile, then close.
  const requestClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    const node = dialogRef.current;
    const ghost = document.querySelector('[data-tile-slug="' + slug + '"]');
    const target = ghost ? ghost.getBoundingClientRect() : originRect;
    if (!node || !target) { onClose(); return; }
    node.style.transformOrigin = '0 0';
    node.style.transition = 'transform 0.32s cubic-bezier(0.4,0,0.5,1), opacity 0.32s ease';
    node.style.transform = flipFrom(node, target);
    node.style.opacity = '0';
    setTimeout(onClose, 300);
  }, [slug, originRect, onClose]);

  // Opening a different entry resets the modal. React's documented way to do
  // that is to adjust state during render when a prop changes — doing it inside
  // the effect meant every slug change rendered the old entry once first.
  const [shownSlug, setShownSlug] = useState(slug);
  if (slug !== shownSlug) {
    setShownSlug(slug);
    setLoading(true);
    setAnimateBars(false);
    setEntry(null);
    setCollapsed(false);
  }

  // Fetch entry data when slug changes
  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/entries/' + slug);
        const data = await res.json();
        if (cancelled) return;
        setEntry(data.entry || data);
        setLoading(false);
        // Wait two animation frames before triggering bar animation
        // so the bars are in the DOM before we animate them
        requestAnimationFrame(() => requestAnimationFrame(() => {
          if (!cancelled) setAnimateBars(true);
        }));
      } catch {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slug]);

  // Update the URL to /entries/[slug] while modal is open — restores / on close
  useEffect(() => {
    if (slug) window.history.pushState({}, '', '/entries/' + slug);
    return () => {
      if (window.location.pathname.startsWith('/entries/')) {
        window.history.pushState({}, '', '/');
      }
    };
  }, [slug]);

  // Close on Escape key
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') requestClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [requestClose]);

  // Prevent page scrolling while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Grow the modal out of the clicked tile on open.
  useLayoutEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (!originRect) { node.style.opacity = '1'; return; }
    node.style.transformOrigin = '0 0';
    node.style.transition = 'none';
    node.style.opacity = '0.5';
    node.style.transform = flipFrom(node, originRect);
    node.getBoundingClientRect(); // flush styles so the next change animates
    node.style.transition = 'transform 0.42s cubic-bezier(0.33,1.06,0.42,1), opacity 0.3s ease';
    node.style.transform = 'none';
    node.style.opacity = '1';
  }, []);

  // Show the sticky bar when the user scrolls more than 40px into the notes
  const handleScroll = useCallback(() => {
    if (scrollRef.current) setCollapsed(scrollRef.current.scrollTop > 40);
  }, []);

  // Parse tags — stored as array or comma string in the DB
  const tags = entry?.tags
    ? (Array.isArray(entry.tags) ? entry.tags : entry.tags.split(',').map(t => t.trim()).filter(Boolean))
    : [];

  const { albumNotes, trackNotes: trackNotesFallback } = splitNotes(entry?.notes);
  const trackNotes = entry?.track_notes || trackNotesFallback;
  const tracks = entryTracks(entry);
  const allTracksFive = tracks.length > 0 && tracks.every(t => t.stars === 5);
  const masterpiece = allTracksFive || entry?.rating === 'Masterpiece';
  const displayRating = masterpiece ? 5 : parseRating(entry?.rating);
  const isFavorite = entry?.favorite === true || entry?.favorite === 'true';
  const isSubmission = entry?.entry_type === 'Submission';

  return (
    <>
      {/* CSS animations — defined here so they're scoped to the modal */}
      <style>{`
        @keyframes ln-star-glow-kf {
          0%,100%{filter:brightness(1.15) drop-shadow(0 0 3px rgba(255,210,60,0.5)) drop-shadow(0 0 6px rgba(255,180,30,0.3))}
          50%{filter:brightness(1.45) drop-shadow(0 0 6px rgba(255,210,60,0.9)) drop-shadow(0 0 12px rgba(255,180,30,0.5))}
        }
        @keyframes ln-master-shine-kf {
          0%,80%,100%{background-position:-200% center}
          83%{background-position:200% center}
        }
        .ln-star-glow{animation:ln-star-glow-kf 2.8s ease-in-out infinite}
        .ln-star-glow:nth-child(2){animation-delay:.18s}
        .ln-star-glow:nth-child(3){animation-delay:.36s}
        .ln-star-glow:nth-child(4){animation-delay:.54s}
        .ln-star-glow:nth-child(5){animation-delay:.72s}
        .ln-masterpiece-shine{
          background:linear-gradient(105deg,rgba(255,210,60,.7) 0%,rgba(255,255,200,1) 40%,rgba(232,184,75,.7) 60%,rgba(255,210,60,.7) 100%);
          background-size:200% auto;
          -webkit-background-clip:text;
          -webkit-text-fill-color:transparent;
          background-clip:text;
          animation:ln-master-shine-kf 30s ease-in-out infinite;
        }
        .ln-horizon-bar{transition:filter 0.2s}
        .ln-horizon-bar-wrap:hover .ln-horizon-bar{filter:brightness(1.12)}
        .ln-horizon-tooltip{
          position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);
          background:var(--panel-solid);border:1px solid var(--border);
          border-radius:6px;padding:4px 8px;white-space:nowrap;
          font-family:${fonts.sans};font-size:10px;color:var(--ink-soft);
          opacity:0;pointer-events:none;transition:opacity 0.15s;z-index:10;
          backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
        }
        .ln-horizon-bar-wrap:hover .ln-horizon-tooltip{opacity:1}
        .ln-notes-scroll::-webkit-scrollbar{width:4px}
        .ln-notes-scroll::-webkit-scrollbar-track{background:transparent}
        .ln-notes-scroll::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}
        .ln-notes-scroll::-webkit-scrollbar-thumb:hover{background:var(--ink-faint)}
      `}</style>

      {/* Backdrop tint — clicking closes the modal */}
      <div onClick={requestClose} style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)' }} />

      {/* Centering wrapper — pointer-events pass through to the backdrop */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 501, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
      {/* Modal container */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()} // prevent clicks inside from closing
        style={{
          position: 'relative', pointerEvents: 'auto',
          width: '78vw', maxWidth: 940, height: '86vh',
          borderRadius: 16, overflow: 'hidden',
          border: '1px solid ' + WIDGET_BORDER,
          boxShadow: 'var(--shadow-lift)',
          willChange: 'transform',
        }}
      >
        {/* Full-bleed album art — fills the entire modal background */}
        {entry?.album_art && (
          <img src={entry.album_art} alt={entry.album} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
        {/* Light wash over the art so dark text reads on cream */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.25)' }} />

        {/* Close button */}
        <button
          onClick={requestClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: 14, right: 14, zIndex: 20,
            width: 28, height: 28, borderRadius: '50%',
            background: 'var(--panel)', border: '1px solid ' + WIDGET_BORDER,
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            color: 'var(--ink-soft)', fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.sans,
          }}
        >
          ✕
        </button>

        {/* Frosted glass info box — inset from the modal edges */}
        <div style={{
          position: 'absolute', top: 48, left: 44, right: 44, bottom: 64,
          background: WIDGET_BG,
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          border: '1px solid ' + WIDGET_BORDER,
          borderRadius: 12,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>

          {/* Sticky bar — slides in when metadata is scrolled out of view */}
          <StickyHeader entry={entry} visible={collapsed} />

          {/* Metadata + background section — collapses when scrolled */}
          <div style={{
            display: 'grid',
            gridTemplateRows: collapsed ? '0fr' : '1fr',
            flexShrink: 0,
            transition: 'grid-template-rows 0.32s cubic-bezier(0.4,0,0.2,1)',
          }}><div style={{
            display: 'flex',
            minHeight: 0,
            overflow: 'hidden',
            opacity: collapsed ? 0 : 1,
            borderBottom: collapsed ? 'none' : '1px solid ' + DIVIDER,
            transition: 'opacity 0.25s ease',
          }}>

            {/* Left column: album title, artist, year, rating, relationship */}
            <div style={{ padding: '20px 22px', width: 270, flexShrink: 0, borderRight: '1px solid ' + DIVIDER, fontFamily: fonts.sans, display: 'flex', flexDirection: 'column' }}>
              {loading ? (
                // Skeleton loading bars
                [70, 50, 40].map((w, i) => <div key={i} style={{ height: 10, width: w + '%', background: 'var(--border)', borderRadius: 3, marginBottom: 8 }} />)
              ) : entry ? (
                <>
                  <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 3 }}>{entry.album}</div>
                  <div style={{ fontSize: 13, fontWeight: 400, color: 'var(--ink-soft)', marginBottom: 14 }}>
                    {entry.artist}
                    {entry.year && <><span style={{ color: 'var(--ink-faint)' }}> · </span>{entry.year}</>}
                  </div>
                  <div style={{ height: 1, background: 'var(--border)', marginBottom: 12 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                    <StarRating rating={displayRating} size={18} glow={masterpiece} />
                    {masterpiece && (
                      <>
                        <span style={{ color: 'var(--ink-faint)', fontFamily: fonts.mono, fontSize: 9 }}>·</span>
                        <span className="ln-masterpiece-shine" style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500 }}>Masterpiece</span>
                      </>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {entry.relationship && <span style={{ color: 'var(--ink-soft)' }}>{entry.relationship}</span>}
                    {isFavorite && (
                      <>
                        {entry.relationship && <span style={{ color: 'var(--ink-faint)' }}>·</span>}
                        <span style={{ color: 'var(--accent)' }}>Favorite</span>
                      </>
                    )}
                    {isSubmission && (
                      <>
                        <span style={{ color: 'var(--ink-faint)' }}>·</span>
                        <span style={{ color: 'var(--accent)' }}>Submission</span>
                      </>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          </div>
          </div>

          {/* Scrollable notes section */}
          <div ref={scrollRef} className="ln-notes-scroll" onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', fontFamily: fonts.sans }}>
            {loading ? (
              // Skeleton loading bars
              [100, 92, 97, 85, 90, 88, 95, 78].map((w, i) => <div key={i} style={{ height: 9, width: w + '%', background: 'var(--border)', borderRadius: 3, marginBottom: 10 }} />)
            ) : entry ? (
              <>
                {albumNotes && (
                  <>
                    <div style={{ fontFamily: fonts.mono, fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 12 }}>Album Notes</div>
                    <div style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.88, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{albumNotes}</div>
                  </>
                )}

                {/* Horizon bar — shown between album notes and track notes */}
                {(tracks.length > 0 || entry.horizon) && (
                  <HorizonGenerator horizon={entry.horizon} tracks={tracks} animate={animateBars} />
                )}

                {trackNotes && (
                  <>
                    <div style={{ fontFamily: fonts.mono, fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 12 }}>Track Notes</div>
                    <div style={{ fontSize: 13.5, fontWeight: 400, lineHeight: 1.88, color: 'var(--ink-soft)', whiteSpace: 'pre-wrap' }}>{trackNotes}</div>
                  </>
                )}

                {tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 28, paddingTop: 20, borderTop: '1px solid ' + DIVIDER }}>
                    {tags.map((tag, i) => (
                      <span key={i} style={{ fontFamily: fonts.mono, fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', border: '1px solid var(--border)', borderRadius: 4, padding: '3px 8px' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ height: 16 }} />
              </>
            ) : (
              <div style={{ color: 'var(--ink-faint)', fontFamily: fonts.mono, fontSize: 11 }}>entry not found</div>
            )}
          </div>
        </div>

        {/* Footer bar — first 3 tags on the left, full page link on the right */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 44,
          background: 'var(--panel)',
          backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
        }}>
          <div style={{ display: 'flex', gap: 6, fontFamily: fonts.mono, alignItems: 'center' }}>
            {tags.slice(0, 3).map((tag, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && <span style={{ color: 'var(--ink-faint)' }}>·</span>}
                <span style={{ fontSize: 8, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>{tag}</span>
              </span>
            ))}
          </div>
          {/* Link to the full public entry page with comments */}
          {entry && (
            <a href={'/entries/' + entry.slug} style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink)', textDecoration: 'none' }}>
              Full page + comments ↗
            </a>
          )}
        </div>
      </div>
      </div>
    </>
  );
}
