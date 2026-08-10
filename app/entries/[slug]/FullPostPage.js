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

  // Screen one is a full viewport of album art and metadata; scrolling off it
  // is what swaps the phone header over to screen two's look — the dot nav
  // goes away and the album's own blurred art takes over the band behind the
  // logo. Same 24px trigger the sitewide nav uses, so the two move together.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Snapping has to be set on the document, since the document is what
  // scrolls here — so it goes on and comes back off with this page rather
  // than living in globals.css where it would follow you to other routes.
  useEffect(() => {
    document.documentElement.classList.add('ln-snap');
    return () => document.documentElement.classList.remove('ln-snap');
  }, []);

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
    <div
      className={'ln-entry' + (scrolled ? ' ln-entry--scrolled' : '')}
      style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--ink)', fontFamily: fonts.sans }}
    >

      <style>{`
        @keyframes ln-pulse {
          0%,100% { box-shadow: 0 0 0 0 var(--accent); }
          50% { box-shadow: 0 0 0 5px transparent; }
        }
        @keyframes ln-breathe {
          0%,100% { opacity:1; } 50% { opacity:0.6; }
        }

        @keyframes ln-cue-bob {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(5px); }
        }
        /* Wipes each star's gold in from the left; StarRating staggers the
           delay so the rating counts itself up 1-2-3-4-5 on arrival. */
        @keyframes ln-star-fill {
          from { clip-path: inset(0 100% 0 0); }
          to   { clip-path: inset(0 0 0 0); }
        }
        .ln-star-fill {
          animation: ln-star-fill 0.34s cubic-bezier(0.22, 1, 0.36, 1) backwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .ln-star-fill { animation: none; }
        }

        /* Layout — base (desktop). The phone layout is separate markup below,
           swapped in by display, the same way the homepage splits
           .hp-desktop-layout from .hp-mobile-screens. Desktop is untouched. */
        .ln-hero        { position: relative; height: 390px; overflow: hidden; }
        .ln-hero-pad    { position: absolute; bottom: 0; left: 0; right: 0; padding: 0 48px 36px; }
        .ln-hero-row    { display: flex; align-items: flex-end; gap: 24px; }
        .ln-content     { padding: 48px 48px 100px; }
        .ln-screen-one  { display: none; }
        .ln-topblur     { display: none; }

        @media (max-width: 768px) {
          /* ── SCREEN ONE ── a full viewport of album: art on top, everything
             we know about it centred underneath, and a cue to scroll on. */
          .ln-hero { display: none; }

          /* proximity, not mandatory: screen two is long-form notes and tracks,
             and a mandatory snap area taller than the screen fights you the
             whole way down it. proximity still pulls screen one and the top of
             the notes into place, then leaves you alone to read. */
          html.ln-snap { scroll-snap-type: y proximity; }
          /* The snap target for screen two is a zero-height marker rather than
             the content block itself. A snap area taller than the scrollport
             is the classic way to end up fighting the scroll on the way down,
             and .ln-content runs thousands of pixels; a marker has no height
             to argue about. Its scroll-margin lands the notes exactly where
             the scroll cue puts them, clear of the blur band. */
          .ln-screen-one { scroll-snap-align: start; }
          .ln-snap-point {
            height: 0;
            scroll-snap-align: start;
            scroll-margin-top: max(150px, 18vh);
          }

          .ln-screen-one {
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            min-height: 100dvh;
            box-sizing: border-box;
            /* clears the fixed logo row and the dot labels beneath it */
            padding: 172px 24px 0;
            gap: 16px;
          }
          .ln-screen-one-art {
            width: min(78vw, 320px);
            aspect-ratio: 1 / 1;
            border-radius: 16px;
            overflow: hidden;
            flex-shrink: 0;
            border: 1px solid var(--panel-border);
            box-shadow: var(--shadow-lift);
          }
          .ln-screen-one-art img {
            width: 100%; height: 100%; object-fit: cover; display: block;
          }
          .ln-screen-one-title {
            font-family: var(--font-display);
            font-size: clamp(1.6rem, 7vw, 2.3rem);
            font-weight: 400;
            line-height: 1.1;
            color: var(--ink);
          }
          .ln-screen-one-artist {
            font-family: var(--font-label);
            font-size: 11px;
            letter-spacing: 0.14em;
            text-transform: uppercase;
            color: var(--ink-soft);
            margin-top: -8px;
          }
          .ln-screen-one-chips {
            display: flex; flex-wrap: wrap; gap: 8px; justify-content: center;
          }
          /* margin-top:auto pins the cue to the bottom of the screen however
             tall the metadata above it runs. */
          .ln-scroll-cue {
            margin-top: auto;
            margin-bottom: max(20px, env(safe-area-inset-bottom));
            width: 44px; height: 44px;
            display: flex; align-items: center; justify-content: center;
            color: var(--ink-faint);
            touch-action: manipulation;
            animation: ln-cue-bob 2.2s ease-in-out infinite;
          }

          /* ── SCREEN TWO ── the dots go away once you've scrolled in, and the
             flat sitewide nav band is replaced by the album's own art, blurred.
             The band is masked at the bottom so text dissolves into the page
             rather than being cut off on a line. */
          .ln-entry .sitenav-row::before { display: none; }
          .ln-entry--scrolled .hp-dotnav {
            opacity: 0;
            pointer-events: none;
          }
          .hp-dotnav { transition: opacity 0.25s ease; }

          .ln-topblur {
            display: block;
            position: fixed;
            top: 0; left: 0; right: 0;
            height: max(150px, 18vh);
            z-index: 99; /* under the nav row (100), over the page */
            pointer-events: none;
            overflow: hidden;
            opacity: 0;
            transition: opacity 0.3s ease;
            /* Opaque base so the band always hides what scrolls under it, even
               where the blurred art above it goes soft. */
            background: var(--bg);
            -webkit-mask-image: linear-gradient(to bottom, #000 76%, transparent 100%);
            mask-image: linear-gradient(to bottom, #000 76%, transparent 100%);
          }
          .ln-entry--scrolled .ln-topblur { opacity: 1; }
          .ln-topblur-art {
            position: absolute;
            /* Generous overhang: blur() softens an element's own edges, so the
               art has to start well outside the band or page text shows
               through the top of it. The --bg underneath is the backstop. */
            inset: -90px -40%;
            background-size: cover;
            background-position: center;
            filter: blur(38px) saturate(1.3) brightness(1.05);
            transform: scale(1.1);
            /* Held back over the --bg base so the band lands mid-tone whatever
               the sleeve looks like. At full strength a black cover turned the
               band near-black and swallowed the logo and toggle, which are
               plain --ink; a white cover did the same in dark mode. This keeps
               the album's colour without letting it set the contrast. */
            opacity: 0.38;
          }
          .ln-topblur-wash {
            position: absolute; inset: 0;
            background: linear-gradient(to bottom, transparent 30%, var(--bg) 100%);
          }

          .ln-content {
            padding: 28px 24px 80px;
            scroll-margin-top: max(150px, 18vh);
          }
        }
      `}</style>

      {/* ── NAV ── shared site nav (logo + dot nav), identical to every other public page */}
      <SiteNav />
      <DotNav />

      {/* Screen two's header on phones: the album's own art, blown up and
          blurred, sitting behind the logo row once you've scrolled in. */}
      {entry.album_art && (
        <div className="ln-topblur" aria-hidden="true">
          <div className="ln-topblur-art" style={{ backgroundImage: 'url(' + entry.album_art + ')' }} />
          <div className="ln-topblur-wash" />
        </div>
      )}

      {/* ── SCREEN ONE (phones) ── a full screen of album: art up top, then the
          title, artist, year, rating and qualifiers centred beneath it. The
          desktop hero below is the same information in a different shape. */}
      <section className="ln-screen-one">
        {entry.album_art && (
          <div className="ln-screen-one-art">
            <img src={entry.album_art} alt={entry.album} />
          </div>
        )}
        <h1 className="ln-screen-one-title">{entry.album}</h1>
        <div className="ln-screen-one-artist">
          {entry.artist}{entry.year ? ' · ' + entry.year : ''}
        </div>
        {displayRating > 0 && (
          <StarRating rating={displayRating} size={24} glow={isMasterpiece} animate />
        )}
        <div className="ln-screen-one-chips">
          {entry.relationship && <Chip>{entry.relationship}</Chip>}
          {entry.entry_type && <Chip>{entry.entry_type}</Chip>}
          {(entry.favorite === true || entry.favorite === 'true') && <Chip accent>Favorite</Chip>}
          {isMasterpiece && <Chip accent>Masterpiece</Chip>}
        </div>
        <div
          className="ln-scroll-cue"
          role="button"
          tabIndex={0}
          aria-label="Scroll to the notes"
          onClick={() => document.getElementById('ln-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') document.getElementById('ln-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </section>

      {/* ── HERO ── Blurred album art background with metadata overlay.
          Sizing lives in .ln-hero above: a fixed 390px on desktop (390 not
          360 — the bottom-anchored thumbnail/title need the extra room to
          clear SiteNav + DotNav), and content-sized on phones, where the
          block stacks and would otherwise run up behind the nav. */}
      <div className="ln-hero">
        {entry.album_art && (
          <div style={{ position: 'absolute', inset: '-40px', backgroundImage: 'url(' + entry.album_art + ')', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(50px) saturate(1.3) brightness(1.05)', transform: 'scale(1.2)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg) 20%, transparent 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, var(--bg) 0%, transparent 38%)' }} />

        <div className="ln-hero-pad" style={{ maxWidth: '860px', margin: '0 auto' }}>
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
      <div className="ln-snap-point" aria-hidden="true" />

      <div id="ln-content" className="ln-content" style={{ maxWidth: '860px', margin: '0 auto' }}>

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
