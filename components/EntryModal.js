// components/EntryModal.js
// The overlay modal that opens when you click an album tile on the homepage.
// Shows the full entry — art, metadata, background, notes, horizon bar, tags.
// Does NOT load a new page — it overlays the current page and updates the URL
// to /entries/[slug] so the entry is shareable, then restores / on close.
//
// Features:
// - Full-bleed album art background
// - Frosted glass info box
// - Collapse-on-scroll metadata (StickyBar replaces it when scrolled)
// - Animated horizon bar
// - Masterpiece star glow + gold shine animation
// - Escape key to close

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';

// ── CONSTANTS ──────────────────────────────────────────────────────────────
const STAR_PATH = 'M9 1.5l2.163 4.38 4.837.703-3.5 3.412.826 4.818L9 12.39l-4.326 2.273.826-4.818L2 6.583l4.837-.703z';
const GOLD = '#E8B84B';
const GOLD_EMPTY = 'rgba(232,184,75,0.18)';
const FONT = "'DM Sans', sans-serif";
const MONO = "'DM Mono', monospace";
const WIDGET_BG = 'rgba(8,6,14,0.50)';
const WIDGET_BORDER = 'rgba(255,255,255,0.09)';
const DIVIDER = 'rgba(255,255,255,0.07)';

// ── UTILITY FUNCTIONS ──────────────────────────────────────────────────────

// Parses a rating value to a number — handles strings like "4.5 stars"
function parseRating(rating) {
  if (!rating) return 0;
  const n = parseFloat(rating);
  return isNaN(n) ? 0 : n;
}

// Parses horizon string into array of heights (0–1).
// Accepts either Unicode block characters (▁▂▃▄) or a JSON array of numbers.
function parseHorizon(horizon) {
  if (!horizon) return [];
  const BLOCK_MAP = { '\u2581': 0.12, '\u2582': 0.25, '\u2583': 0.37, '\u2584': 0.50, '\u2585': 0.62, '\u2586': 0.75, '\u2587': 0.87, '\u2588': 1.00 };
  if (horizon.trim().startsWith('[')) {
    try {
      const arr = JSON.parse(horizon);
      if (Array.isArray(arr)) return arr.map(v => parseFloat(v) / 5);
    } catch {}
  }
  return [...horizon.trim()].filter(c => BLOCK_MAP[c]).map(c => BLOCK_MAP[c]);
}

// Parses numbered track lines with star ratings from the notes field.
// e.g. "1. Song Title — ★★★" becomes { num: 1, name: "Song Title", stars: 3 }
function parseTracksFromNotes(notesText) {
  if (!notesText) return [];
  const matches = [...notesText.matchAll(/(\d+)\.\s+([^\u2014\u2013\n]+?)\s*[\u2014\u2013]\s*(\u2605[\u2605\u2606\s]*)/g)];
  return matches.map(m => ({
    num: parseInt(m[1]),
    name: m[2].replace(/\*\*/g, '').trim(),
    stars: (m[3].match(/\u2605/g) || []).length,
  }));
}

// Splits notes into album-level prose and track-level notes.
// Track notes start at "Track Notes" heading or first numbered line.
function splitNotes(notesText) {
  if (!notesText) return { albumNotes: '', trackNotes: '' };
  const clean = notesText.replace(/\*?\*?Album Notes\*?\*?/g, '').replace(/\*\*/g, '').trim();
  const trackSplit = clean.search(/Track Notes|\n\n\d+\.\s|\n\nTrack\s+\d+\s*[\u2014\u2013]/m);
  if (trackSplit > -1) {
    return {
      albumNotes: clean.slice(0, trackSplit).trim(),
      trackNotes: clean.slice(trackSplit).replace(/\*?\*?Track Notes\*?\*?/g, '').trim(),
    };
  }
  return { albumNotes: clean, trackNotes: '' };
}

// ── STARS ──────────────────────────────────────────────────────────────────
// Read-only star display used inside the modal.
// glow=true adds the pulsing animation used for Masterpiece entries.

function Stars({ rating, size = 16, glow = false }) {
  const numeric = parseRating(rating);
  return (
    <div style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(i => {
        const filled = numeric >= i;
        const half = !filled && numeric >= i - 0.5;
        return (
          <div key={i} className={glow ? 'ln-star-glow' : ''} style={{ position: 'relative', width: size, height: size, flexShrink: 0, display: 'block' }}>
            {/* Dim background star */}
            <svg width={size} height={size} viewBox="0 0 18 18" style={{ position: 'absolute', top: 0, left: 0 }}>
              <path d={STAR_PATH} fill={GOLD_EMPTY} />
            </svg>
            {/* Gold fill — full or half width */}
            <div style={{ position: 'absolute', top: 0, left: 0, overflow: 'hidden', width: half ? size / 2 : filled ? size : 0 }}>
              <svg width={size} height={size} viewBox="0 0 18 18" style={{ display: 'block' }}>
                <path d={STAR_PATH} fill={GOLD} />
              </svg>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── HORIZON DIVIDER ────────────────────────────────────────────────────────
// The bar chart that sits between album notes and track notes.
// Each bar represents one track — height = track star rating.
// Bars animate in with a spring effect when the modal opens (animate prop).
// Hovering a bar shows a tooltip with the track name.

function HorizonDivider({ horizon, tracks, animate }) {
  const bars = parseHorizon(horizon);
  // Use track star ratings if available, otherwise fall back to horizon block characters
  const trackBars = tracks.length > 0 ? tracks.map(t => t.stars / 5) : bars;
  if (!trackBars.length) return null;
  const barWidth = Math.min(trackBars.length * 14, 280);
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '28px 0 24px', gap: 14 }}>
      <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', flexShrink: 0 }}>
        Horizon
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 32, width: barWidth }}>
        {trackBars.map((h, i) => {
          const track = tracks[i];
          return (
            <div key={i} className="ln-horizon-bar-wrap" style={{ position: 'relative', flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end' }}>
              {/* Tooltip — track name on hover */}
              {track && <div className="ln-horizon-tooltip">{track.name}</div>}
              <div
                className="ln-horizon-bar"
                style={{
                  width: '100%',
                  height: Math.round(h * 100) + '%',
                  background: '#c8d47a',
                  borderRadius: '1px 1px 0 0',
                  transformOrigin: 'bottom',
                  // Bars animate up with staggered spring delay when animate=true
                  transform: animate ? 'scaleY(1)' : 'scaleY(0)',
                  opacity: animate ? 1 : 0,
                  transition: animate
                    ? 'transform 0.5s cubic-bezier(0.34,1.4,0.64,1) ' + (i * 35) + 'ms, opacity 0.3s ease ' + (i * 35) + 'ms'
                    : 'none',
                }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── STICKY BAR ─────────────────────────────────────────────────────────────
// A compact metadata bar that slides in at the top of the info box
// when the user scrolls down past the main metadata section.
// Shows album, artist, year, rating, relationship, and entry type in one line.

function StickyBar({ entry, visible }) {
  const masterpiece = entry?.masterpiece === true;
  const isSubmission = entry?.entry_type === 'Submission';
  return (
    <div style={{
      flexShrink: 0,
      borderBottom: '1px solid ' + DIVIDER,
      padding: '10px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      fontFamily: FONT,
      background: 'rgba(8,6,14,0.3)',
      // Animates in by expanding from 0 height when visible becomes true
      maxHeight: visible ? 52 : 0,
      opacity: visible ? 1 : 0,
      overflow: 'hidden',
      transition: 'max-height 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.3s ease',
    }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#f0ece4', letterSpacing: '-0.02em', flexShrink: 0 }}>{entry?.album}</div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', flexShrink: 0 }}>{entry?.artist}{entry?.year ? ' · ' + entry.year : ''}</div>
      <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
      <Stars rating={entry?.rating} size={12} glow={masterpiece} />
      {masterpiece && (
        <span className="ln-masterpiece-shine" style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500 }}>
          Masterpiece
        </span>
      )}
      <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
      {entry?.relationship && (
        <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)' }}>
          {entry.relationship}
        </span>
      )}
      {isSubmission && (
        <>
          <span style={{ color: 'rgba(255,255,255,0.15)', fontFamily: MONO, fontSize: 9 }}>·</span>
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(200,212,122,0.6)' }}>Submission</span>
        </>
      )}
    </div>
  );
}

// ── MAIN MODAL ─────────────────────────────────────────────────────────────

export default function EntryModal({ slug, onClose }) {
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [animateBars, setAnimateBars] = useState(false); // triggers horizon bar animation
  const [collapsed, setCollapsed] = useState(false);     // true when user has scrolled down
  const scrollRef = useRef(null);

  // Fetch entry data when slug changes
  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setAnimateBars(false);
    setEntry(null);
    setCollapsed(false);
    fetch('/api/entries/' + slug)
      .then(r => r.json())
      .then(data => {
        setEntry(data.entry || data);
        setLoading(false);
        // Wait two animation frames before triggering bar animation
        // so the bars are in the DOM before we animate them
        requestAnimationFrame(() => requestAnimationFrame(() => setAnimateBars(true)));
      })
      .catch(() => setLoading(false));
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
    const onKey = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Prevent page scrolling while modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Show the sticky bar when the user scrolls more than 40px into the notes
  const handleScroll = useCallback(() => {
    if (scrollRef.current) setCollapsed(scrollRef.current.scrollTop > 40);
  }, []);

  // Parse tags — stored as array or comma string in the DB
  const tags = entry?.tags
    ? (Array.isArray(entry.tags) ? entry.tags : entry.tags.split(',').map(t => t.trim()).filter(Boolean))
    : [];

  const { albumNotes, trackNotes } = splitNotes(entry?.notes);
  const tracks = parseTracksFromNotes(entry?.notes);
  const masterpiece = entry?.masterpiece === true;
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
        @keyframes ln-modal-in {
          from{opacity:0;transform:translate(-50%,calc(-50% + 12px))}
          to{opacity:1;transform:translate(-50%,-50%)}
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
        .ln-horizon-bar{transition:background 0.2s}
        .ln-horizon-bar-wrap:hover .ln-horizon-bar{background:#dce88a}
        .ln-horizon-tooltip{
          position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);
          background:rgba(8,6,14,0.9);border:1px solid rgba(255,255,255,0.12);
          border-radius:6px;padding:4px 8px;white-space:nowrap;
          font-family:${FONT};font-size:10px;color:rgba(232,228,220,0.9);
          opacity:0;pointer-events:none;transition:opacity 0.15s;z-index:10;
          backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
        }
        .ln-horizon-bar-wrap:hover .ln-horizon-tooltip{opacity:1}
        .ln-notes-scroll::-webkit-scrollbar{width:4px}
        .ln-notes-scroll::-webkit-scrollbar-track{background:transparent}
        .ln-notes-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:2px}
        .ln-notes-scroll::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,0.2)}
      `}</style>

      {/* Invisible backdrop — clicking closes the modal */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 500 }} />

      {/* Modal container */}
      <div
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()} // prevent clicks inside from closing
        style={{
          position: 'fixed', top: '50%', left: '50%',
          transform: 'translate(-50%,-50%)',
          width: '78vw', maxWidth: 940, height: '86vh',
          borderRadius: 16, overflow: 'hidden',
          border: '1px solid ' + WIDGET_BORDER,
          zIndex: 501,
          animation: 'ln-modal-in 0.3s cubic-bezier(0.34,1.2,0.64,1) forwards',
        }}
      >
        {/* Full-bleed album art — fills the entire modal background */}
        {entry?.album_art && (
          <img src={entry.album_art} alt={entry.album} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        )}
        {/* Dark tint over the art so text is readable */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(6,4,12,0.18)' }} />

        {/* Close button */}
        <button
          onClick={onClose}
          aria-label="Close"
          style={{
            position: 'absolute', top: 14, right: 14, zIndex: 20,
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(0,0,0,0.4)', border: '1px solid ' + WIDGET_BORDER,
            color: 'rgba(255,255,255,0.45)', fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT,
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
          <StickyBar entry={entry} visible={collapsed} />

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
            <div style={{ padding: '20px 22px', width: 270, flexShrink: 0, borderRight: '1px solid ' + DIVIDER, fontFamily: FONT, display: 'flex', flexDirection: 'column' }}>
              {loading ? (
                // Skeleton loading bars
                [70, 50, 40].map((w, i) => <div key={i} style={{ height: 10, width: w + '%', background: 'rgba(255,255,255,0.08)', borderRadius: 3, marginBottom: 8 }} />)
              ) : entry ? (
                <>
                  <div style={{ fontSize: 26, fontWeight: 700, color: '#f0ece4', lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 3 }}>{entry.album}</div>
                  <div style={{ fontSize: 13, fontWeight: 400, color: 'rgba(255,255,255,0.42)', marginBottom: 14 }}>
                    {entry.artist}
                    {entry.year && <><span style={{ color: 'rgba(255,255,255,0.2)' }}> · </span>{entry.year}</>}
                  </div>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', marginBottom: 12 }} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                    <Stars rating={entry.rating} size={18} glow={masterpiece} />
                    {masterpiece && (
                      <>
                        <span style={{ color: 'rgba(255,255,255,0.18)', fontFamily: MONO, fontSize: 9 }}>·</span>
                        <span className="ln-masterpiece-shine" style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 500 }}>Masterpiece</span>
                      </>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    {entry.relationship && <span style={{ color: 'rgba(255,255,255,0.3)' }}>{entry.relationship}</span>}
                    {isSubmission && (
                      <>
                        <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>
                        <span style={{ color: 'rgba(200,212,122,0.6)' }}>Submission</span>
                      </>
                    )}
                  </div>
                </>
              ) : null}
            </div>

            {/* Right column: background text */}
            <div style={{ flex: 1, padding: '20px 22px', minWidth: 0, fontFamily: FONT }}>
              {loading ? (
                [100, 90, 95, 85, 88].map((w, i) => <div key={i} style={{ height: 9, width: w + '%', background: 'rgba(255,255,255,0.08)', borderRadius: 3, marginBottom: 8 }} />)
              ) : entry?.background ? (
                <>
                  <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 10 }}>Background</div>
                  <div style={{ fontSize: 12.5, fontWeight: 300, lineHeight: 1.8, color: 'rgba(200,196,192,0.78)' }}>{entry.background}</div>
                </>
              ) : null}
            </div>
          </div>
          </div>

          {/* Scrollable notes section */}
          <div ref={scrollRef} className="ln-notes-scroll" onScroll={handleScroll} style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', fontFamily: FONT }}>
            {loading ? (
              // Skeleton loading bars
              [100, 92, 97, 85, 90, 88, 95, 78].map((w, i) => <div key={i} style={{ height: 9, width: w + '%', background: 'rgba(255,255,255,0.08)', borderRadius: 3, marginBottom: 10 }} />)
            ) : entry ? (
              <>
                {albumNotes && (
                  <>
                    <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 12 }}>Album Notes</div>
                    <div style={{ fontSize: 14, fontWeight: 400, lineHeight: 1.88, color: 'rgba(232,228,220,0.92)', whiteSpace: 'pre-wrap' }}>{albumNotes}</div>
                  </>
                )}

                {/* Horizon bar — shown between album notes and track notes */}
                {(tracks.length > 0 || entry.horizon) && (
                  <HorizonDivider horizon={entry.horizon} tracks={tracks} animate={animateBars} />
                )}

                {trackNotes && (
                  <>
                    <div style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.2)', marginBottom: 12 }}>Track Notes</div>
                    <div style={{ fontSize: 13.5, fontWeight: 400, lineHeight: 1.88, color: 'rgba(210,206,200,0.85)', whiteSpace: 'pre-wrap' }}>{trackNotes}</div>
                  </>
                )}

                {tags.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 28, paddingTop: 20, borderTop: '1px solid ' + DIVIDER }}>
                    {tags.map((tag, i) => (
                      <span key={i} style={{ fontFamily: MONO, fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.28)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 4, padding: '3px 8px' }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div style={{ height: 16 }} />
              </>
            ) : (
              <div style={{ color: 'rgba(255,255,255,0.3)', fontFamily: MONO, fontSize: 11 }}>entry not found</div>
            )}
          </div>
        </div>

        {/* Footer bar — first 3 tags on the left, full page link on the right */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 44,
          background: 'rgba(6,4,12,0.55)', borderTop: '1px solid rgba(255,255,255,0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px',
        }}>
          <div style={{ display: 'flex', gap: 6, fontFamily: MONO, alignItems: 'center' }}>
            {tags.slice(0, 3).map((tag, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && <span style={{ color: 'rgba(255,255,255,0.15)' }}>·</span>}
                <span style={{ fontSize: 8, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.25)' }}>{tag}</span>
              </span>
            ))}
          </div>
          {/* Link to the full public entry page with comments */}
          {entry && (
            <a href={'/entries/' + entry.slug} style={{ fontFamily: MONO, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#c8d47a', textDecoration: 'none' }}>
              Full page + comments ↗
            </a>
          )}
        </div>
      </div>
    </>
  );
}