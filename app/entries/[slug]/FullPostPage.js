// app/entries/[slug]/PostClient.js
// The interactive UI for a single entry page.
// This is a CLIENT component — it runs in the browser and handles all interactivity:
// comments, upvotes, the horizon bar, track threads, and the live listening beacon.
// It receives the entry data from page.js which fetched it server-side.

'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { fonts } from '../../../library/sitewide_visuals';
import { parseHorizon, entryTracks, splitNotes, entryTypeLabel } from '../../../library/entry_formatter';
import { kept_receipts } from '../../../library/receipts';
import { buildReferenceIndex, createReferenceLinker } from '../../../library/cross_references';
import DotNav from '../../../components/main_components/DotNav';
import SiteNav from '../../../components/main_components/SiteNav';
import HorizonBar from '../../../components/main_components/Slug_Page/HorizonBar';
import TrackThread from '../../../components/main_components/Slug_Page/TrackThread';
import CommentBubble from '../../../components/main_components/Slug_Page/CommentBubble';
import MetadataLabel from '../../../components/main_components/Slug_Page/MetadataLabel';
import Chip from '../../../components/main_components/Slug_Page/Chip';
import StarRating from '../../../components/main_components/StarRating';


// The pair of actions that close the entry out used to share a local style
// object; it's .ln-pill in globals.css now, so the same button reads the
// same way at the foot of every page on the site.

export default function FullPostPage({ entry, references = [] }) {
  const [commentsByTrack, setCommentsByTrack] = useState({});
  const [commentsLoaded, setCommentsLoaded] = useState(false);

  // Screen one is a full viewport of album art and metadata; scrolling off it
  // is what swaps the phone header over to screen two's look — the dot nav
  // goes away and the album's own blurred art takes over the band behind the
  // logo. Same 24px trigger the sitewide nav uses, so the two move together.
  // On phones the container scrolls, not the document, so window.scrollY stays
  // at 0 the whole time and can't be what drives this. Watch both: .ln-screens
  // is the scroller on a phone, the window is the scroller on desktop.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const screens = document.querySelector('.ln-screens');
    const read = () => setScrolled(Math.max(screens ? screens.scrollTop : 0, window.scrollY) > 24);
    read();
    window.addEventListener('scroll', read, { passive: true });
    if (screens) screens.addEventListener('scroll', read, { passive: true });
    return () => {
      window.removeEventListener('scroll', read);
      if (screens) screens.removeEventListener('scroll', read);
    };
  }, []);

  const { albumNotes } = splitNotes(entry.notes);
  const parsedTracks = entryTracks(entry);
  const horizonBars = parseHorizon(entry.horizon);

  // The index only changes when the archive does; the linker is rebuilt every
  // render on purpose. It carries the "first mention on this page" tally, so
  // reusing one across renders would spend every link on the first pass and
  // leave the prose bare on the second, once the comments arrive.
  //
  // Linking happens here rather than inside TrackThread for the same reason:
  // the album notes and every track note are one page sharing one tally, and
  // that only holds if they're linked in a known order by whoever owns it.
  const referenceIndex = useMemo(() => buildReferenceIndex(references), [references]);
  const link = createReferenceLinker(referenceIndex, { selfSlug: entry.slug, selfArtist: entry.artist });
  const linkedAlbumNotes = link(albumNotes, 'album');
  const linkedTrackNotes = parsedTracks.map((t, i) => link(t.note, 'track' + i));

  // Comments about the album rather than any one track. save_comment has
  // always filed a track-less comment under -1, and nest_comments has always
  // handed the bucket back — until now nothing on the page ever asked for it,
  // so there was no way to leave one and nothing would have shown it.
  const albumComments = commentsByTrack['-1'] || [];

  // Load the thread for this entry. Posts rather than gets, and sends along
  // whatever receipts this browser is holding: the reply carries the approved
  // comments as always, plus any still waiting to be read that this browser can
  // prove it wrote. Someone else's held comment is never in here.
  async function fetchComments() {
    const res = await fetch('/api/comments/receipts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: entry.slug, receipts: kept_receipts() }),
    });
    const data = await res.json();
    return data.comments || {};
  }

  async function loadComments() {
    try {
      setCommentsByTrack(await fetchComments());
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
        const comments = await fetchComments();
        if (cancelled) return;
        setCommentsByTrack(comments);
        setCommentsLoaded(true);
      } catch {}
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.slug]);

  // Smooth scroll to a track section when clicking a horizon bar
  function handleBarClick(i) {
    const el = document.getElementById('track-' + i);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  // The largest size at which the title still lands inside two rows, rather
  // than a set of fixed steps — stepping meant a 30-character title dropped to
  // the same size as a 56-character one and looked shrunken for no reason.
  // The 300 is measured, not derived: at this display face two rows hold about
  // 300/length in vw before the clamp starts eating the end of the name.
  // Anything up to ~35 characters hits the 2.1rem ceiling and never shrinks,
  // so only genuinely long titles give up any size, and only as much as they
  // have to.
  const titleLength = (entry.album || '').length || 1;
  const titleSize = `clamp(1.25rem, ${(300 / titleLength).toFixed(2)}vw, 2.1rem)`;

  // Says "Posted" because the artist line right above it already carries the
  // album's own year — a second bare date there would just read as a second
  // release year.
  const postedOn = new Date(entry.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

  const allTracksFive = parsedTracks.length > 0 && parsedTracks.every(t => t.stars === 5);
  const isMasterpiece = allTracksFive || entry.rating === 'Masterpiece';
  // Everything here is the library. A submission is a note about where a
  // record came from, so it's worth adding when true and worth nothing when
  // false — "Library" on every other entry was labelling the default.
  const isSubmission = entry.entry_type === 'Submission';
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
        /* Each star lights up whole, rather than the gold sliding across it —
           StarRating staggers the delay so the rating counts itself out
           one, two, three, four, five. The per-star fade is quick so each one
           reads as switching on; the pacing lives in the stagger. On a
           masterpiece the sparkle then fires once the fifth has landed, which
           is the whole point of the count — it arrives somewhere. */
        @keyframes ln-star-fill {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .ln-star-fill {
          animation: ln-star-fill 0.18s ease-out backwards;
        }
        @media (prefers-reduced-motion: reduce) {
          .ln-star-fill { animation: none; }
        }

        /* The masterpiece glow, lifted from EntryModal so it works here too.
           StarRating has always asked for it on a masterpiece, but the
           keyframes only existed inside the modal's own style block, so on
           this page the class landed on nothing. A masterpiece should not look
           like any other five stars. */
        @keyframes ln-star-glow-kf {
          0%,100% { filter: brightness(1.15) drop-shadow(0 0 3px rgba(255,210,60,0.5)) drop-shadow(0 0 6px rgba(255,180,30,0.3)); }
          50%     { filter: brightness(1.45) drop-shadow(0 0 6px rgba(255,210,60,0.9)) drop-shadow(0 0 12px rgba(255,180,30,0.5)); }
        }
        /* All five breathe together. The per-star delays made the glow travel
           along the row forever, which is the directional reading a
           masterpiece shouldn't have — it's one state, not a sequence. */
        .ln-star-glow { animation: ln-star-glow-kf 2.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ln-star-glow { animation: none; }
        }

        /* Layout — base (desktop). The phone layout is separate markup below,
           swapped in by display, the same way the homepage splits
           .hp-desktop-layout from .hp-mobile-screens. Desktop is untouched. */
        .ln-hero        { position: relative; height: 390px; overflow: hidden; }
        .ln-hero-pad    { position: absolute; bottom: 0; left: 0; right: 0; padding: 0 48px 36px; }
        .ln-hero-row    { display: flex; align-items: flex-end; gap: 24px; }
        .ln-content     { padding: 48px 48px 100px; }
        .ln-screen-one  { display: none; }
        /* How much of the top the header occupies on screen two. The dot nav
           is hidden by then, so this only has to clear the logo row (which
           ends at 58px) — not the 150px the labelled dots needed. The band
           height, the snap position and the scroll cue all read this. */
        .ln-entry       { --ln-band: 96px; }

        @media (max-width: 768px) {
          /* ── SCREEN ONE ── a full viewport of album: art on top, everything
             we know about it centred underneath, and a cue to scroll on. */
          .ln-hero { display: none; }

          /* The two screens snap inside their own container rather than the
             document. This is the whole trick, and it is why the homepage
             feels solid where earlier versions of this page did not: because
             the long content lives in an inner scroller, both screens stay
             exactly one viewport tall, and a mandatory snap over
             viewport-sized areas can commit hard without ever trapping the
             reading. scroll-snap-stop stops a fast flick skipping past. */
          .ln-screens {
            height: 100dvh;
            overflow-y: auto;
            scroll-snap-type: y mandatory;
            -webkit-overflow-scrolling: touch;
            touch-action: pan-y;
            overscroll-behavior-y: none;
          }
          .ln-screen-one,
          .ln-screen-two {
            height: 100dvh;
            scroll-snap-align: start;
            scroll-snap-stop: always;
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
            /* Sized off viewport HEIGHT as well as width. A width-only size
               overflowed once Safari's chrome was showing — the chips and the
               scroll cue ended up under the address bar — and a long title
               pushed it further still. Squaring to the smaller of the two
               shrinks the art on a short screen instead of losing the bottom
               of the page, and flex-shrink lets it give up more if it has to. */
            height: min(40dvh, 78vw);
            width: auto;
            aspect-ratio: 1 / 1;
            flex-shrink: 1;
            min-height: 0;
            border-radius: 16px;
            overflow: hidden;
            border: 1px solid var(--panel-border);
            box-shadow: var(--shadow-lift);
          }
          .ln-screen-one-art img {
            width: 100%; height: 100%; object-fit: cover; display: block;
          }
          .ln-screen-one-title {
            font-family: var(--font-display);
            font-size: clamp(1.6rem, 6.6vw, 2.1rem);
            font-weight: var(--font-display-weight);
            /* 1.1 packed the two rows so tightly that overflow:hidden sliced
               the bottom off the second one — parentheses and descenders sit
               below the line box at this size, and "TV Animation BLEACH
               (Original Soundtrack 3)" lost the underside of its brackets.
               The extra leading plus a little padding gives them somewhere to
               go without letting a third row through. */
            line-height: 1.22;
            padding-bottom: 0.1em;
            color: var(--ink);
            /* Two rows at most. "Salvation Laughs in the Face of a Grieving
               Mother" ran to three at full size and shoved the rating, the
               chips and the scroll cue off the bottom of the screen. */
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            overflow: hidden;
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

          /* ── SCREEN TWO ── the dots go away once you've scrolled in, so the
             header is only the logo row and the sitewide --bg band can shrink
             to match. The 180px it uses elsewhere is sized for the labelled
             dots, and at that height it covered the notes this page snaps to.
             Solid down to --ln-band, then a short fade so text dissolves out
             rather than ending on a line. */
          .ln-entry .sitenav-row::before {
            height: calc(var(--ln-band) + 34px);
            background: linear-gradient(to bottom, var(--bg) 0%, var(--bg) var(--ln-band), transparent 100%);
          }
          /* SiteNav fades its own band in off window.scrollY, which never moves
             now that the container is what scrolls — so this page drives it. */
          .ln-entry--scrolled .sitenav-row::before { opacity: 1; }
          .ln-entry--scrolled .hp-dotnav {
            opacity: 0;
            pointer-events: none;
          }
          .hp-dotnav { transition: opacity 0.25s ease; }

          /* Screen two: the header band holds the top, everything below it
             scrolls inside. Padding rather than margin so the inner scroller
             starts below the band — that puts sticky labels at top:0 right
             underneath the header instead of behind it. */
          .ln-screen-two {
            padding-top: var(--ln-band);
            box-sizing: border-box;
            display: flex;
            flex-direction: column;
          }
          .ln-screen-two-scroll {
            flex: 1;
            min-height: 0;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
            /* Deliberately auto, not contain. Containing it is what made
               screen one unreachable: with the notes filling the whole screen,
               refusing to hand the scroll back meant pulling down at the top
               of the notes did nothing at all, however hard you pulled.
               Letting it chain is what carries you back up to the album. */
            overscroll-behavior-y: auto;
          }

          /* Section headings pin themselves while their section is what you
             are reading, and get pushed out by the next one. They need an
             opaque background or the text runs underneath them. */
          .ln-meta-label--sticky {
            position: sticky;
            top: 0;
            z-index: 2;
            background: var(--bg);
            margin-bottom: 0 !important;
            padding-top: 14px;
            /* Tap it to get back to the top of its own section. */
            cursor: pointer;
            -webkit-tap-highlight-color: transparent;
          }
          .ln-meta-label--sticky + * { margin-top: 16px; }

          /* Track names cut off well before they'd push the stars and the
             comment pill around. ch is the useful unit here because the ask
             was in characters — roughly "Daddy Lessons" and no longer, so
             "Freedom (feat. Kendrick Lamar)" ends at the ellipsis instead of
             taking the row for itself. Phones only; desktop rows have the
             width to show a full name. */
          /* Takes whatever the row has left and clips only when it genuinely
             runs out. This was capped at 15ch, which truncated titles with
             half the row still empty — "I'm Not In Your Mind" became "I'm Not
             In Your Mi…" nowhere near the stars. flex:1 with min-width:0 is
             what lets a flex item shrink below its content and ellipsis at
             the real boundary instead of a guessed one. */
          .ln-track-name {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex: 1;
            min-width: 0;
          }

          .ln-content {
            padding: 0 24px 80px;
          }
        }
      `}</style>

      {/* ── NAV ── shared site nav (logo + dot nav), identical to every other public page */}
      <SiteNav />
      <DotNav />

      {/* On phones this is the scroll container the two screens snap inside —
          the same arrangement as .hp-mobile-screens on the homepage. On
          desktop it has no height or overflow of its own, so everything below
          just falls back into normal document flow. */}
      <div className="ln-screens">

      {/* ── SCREEN ONE (phones) ── a full screen of album: art up top, then the
          title, artist, year, rating and qualifiers centred beneath it. The
          desktop hero below is the same information in a different shape. */}
      <section className="ln-screen-one">
        {entry.album_art && (
          <div className="ln-screen-one-art">
            <img src={entry.album_art} alt={entry.album} />
          </div>
        )}
        <h1 className="ln-screen-one-title" style={{ fontSize: titleSize }}>{entry.album}</h1>
        <div className="ln-screen-one-artist">
          {entry.artist}{entry.year ? ' · ' + entry.year : ''}
        </div>
        {displayRating > 0 && (
          <StarRating rating={displayRating} size={24} glow={isMasterpiece} animate burst={isMasterpiece} />
        )}
        <div className="ln-screen-one-chips">
          {entry.relationship && <Chip>{entry.relationship}</Chip>}
          {isSubmission && <Chip>Submission</Chip>}
          {(entry.favorite === true || entry.favorite === 'true') && <Chip tone="fav">Favorite</Chip>}
          {isMasterpiece && <Chip tone="mp">Masterpiece</Chip>}
        </div>
        <div style={{ fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
          Posted {postedOn}
        </div>
        <div
          className="ln-scroll-cue"
          role="button"
          tabIndex={0}
          aria-label="Scroll to the notes"
          onClick={() => document.querySelector('.ln-screen-two')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') document.querySelector('.ln-screen-two')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
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
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 'var(--font-display-weight)', lineHeight: 1.05, letterSpacing: '-0.015em', color: 'var(--ink)', marginBottom: '6px' }}>
                {entry.album}
                {isMasterpiece && <span style={{ fontFamily: 'var(--font-label)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginLeft: '12px', verticalAlign: 'middle', animation: 'ln-breathe 2.8s ease-in-out infinite' }}>Masterpiece</span>}
              </h1>
              <div style={{ fontFamily: 'var(--font-label)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: '12px' }}>
                {entry.artist}{entry.year ? ' · ' + entry.year : ''}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {displayRating > 0 && <StarRating rating={displayRating} size={15} glow={isMasterpiece} style={{ verticalAlign: 'middle' }} />}
                {entry.relationship && <Chip>{entry.relationship}</Chip>}
                {isSubmission && <Chip>Submission</Chip>}
                {(entry.favorite === true || entry.favorite === 'true') && <Chip tone="fav">Favorite</Chip>}
              </div>
              <div style={{ fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginTop: '12px' }}>
                Posted {postedOn}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── SCREEN TWO ── on phones this is the second snap screen: the header
          stays put at the top while everything below scrolls inside it, the
          way Recent Listens does on the homepage. On desktop it is a plain
          wrapper and the page scrolls normally. */}
      <section className="ln-screen-two">
      <div className="ln-screen-two-scroll">

      <div id="ln-content" className="ln-content" style={{ maxWidth: '860px', margin: '0 auto' }}>

        {/* The album's own thread hangs here, on the notes about the album,
            exactly as a track's hangs on the note about the track. Rendered
            when there are comments even if the notes are empty: an approved
            comment going invisible because the writing above it changed is the
            failure this whole section exists to fix. */}
        {(albumNotes || albumComments.length > 0) && (
          <section style={{ marginBottom: '48px' }}>
            <MetadataLabel sticky>Album Notes</MetadataLabel>
            {/* 6px, the same gap a track note leaves under itself before its
                own bubble. */}
            <div style={{ lineHeight: 1.95, fontSize: '15px', whiteSpace: 'pre-wrap', color: 'var(--ink)', marginBottom: '6px' }}>{linkedAlbumNotes}</div>
            <CommentBubble
              slug={entry.slug}
              trackIndex={-1}
              comments={albumComments}
              label={entry.album}
              onRefresh={loadComments}
            />
          </section>
        )}

        {/* Horizon lives under the Track Notes heading rather than on its own:
            it is a map of the tracks, and clicking a bar jumps to one, so it
            belongs to the same stretch of page they do. */}
        {(parsedTracks.length > 0 || horizonBars.length > 0) && (
          <section style={{ marginBottom: '48px' }}>
            <MetadataLabel sticky>Track Notes</MetadataLabel>

            {/* The hint sits with the bars rather than in the heading: the
                heading is sticky, and "click a bar to jump" makes no sense
                still sitting there once you've scrolled the bars away. */}
            {horizonBars.length > 0 && (
              <div style={{ marginBottom: '40px' }}>
                <div style={{ fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', textAlign: 'right', marginBottom: '10px' }}>
                  click a bar to jump to track
                </div>
                <HorizonBar
                  horizon={entry.horizon}
                  tracks={parsedTracks}
                  commentsByTrack={commentsByTrack}
                  onBarClick={handleBarClick}
                />
              </div>
            )}

            <div>
              {parsedTracks.map((t, i) => (
                <TrackThread
                  key={i}
                  track={t}
                  note={linkedTrackNotes[i]}
                  trackIndex={i}
                  slug={entry.slug}
                  commentsByTrack={commentsByTrack}
                  onRefresh={loadComments}
                />
              ))}
            </div>
          </section>
        )}

        {/* Footer — the two ways out, as a matching pair. The posted date used
            to sit here; it lives up in the album's metadata now. */}
        {/* All Entries leads: its arrow points back the way you came, and the
            up arrow reads better second. */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '28px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Link href="/" className="ln-pill">← All entries</Link>
          <button
            onClick={() => {
              const screens = document.querySelector('.ln-screens');
              const inner = document.querySelector('.ln-screen-two-scroll');
              const paged = screens && screens.scrollHeight > screens.clientHeight;
              if (paged) {
                screens.scrollTo({ top: 0, behavior: 'smooth' });
                // Reset the notes once screen one is covering them, so they
                // start from the top next time rather than mid-tracklist.
                setTimeout(() => { if (inner) inner.scrollTop = 0; }, 600);
              } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="ln-pill"
          >
            ↑ Back to top
          </button>
        </div>

      </div>

      </div>{/* .ln-screen-two-scroll */}
      </section>{/* .ln-screen-two */}

      </div>{/* .ln-screens */}
    </div>
  );
}
