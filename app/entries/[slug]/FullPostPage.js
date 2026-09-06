// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/entries/[slug]/PostClient.js
// The interactive UI for a single entry page.
// This is a CLIENT component — it runs in the browser and handles all interactivity:
// comments, upvotes, the horizon bar, track threads, and the live listening beacon.
// It receives the entry data from page.js which fetched it server-side.

'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CaretUp, Check, X } from '@phosphor-icons/react';
import { BookOpen } from '@phosphor-icons/react';
import { fonts } from '../../../library/sitewide_visuals';
import { sizedAlbumArt, fetchAlbumArtUrl } from '../../../library/music_data_api';
import { parseHorizon, entryTracks, splitNotes, entryTypeLabel, parseRating } from '../../../library/entry_formatter';
import { kept_receipts } from '../../../library/receipts';
import { buildReferenceIndex, createReferenceLinker } from '../../../library/cross_references';
import SiteNav from '../../../components/main_components/SiteNav';
import { createPortal } from 'react-dom';
import { useLayerHeaderSlot } from '../../../components/main_components/LayerEntry';
import EdgeCaret from '../../../components/main_components/EdgeCaret';
import KeeperTools from '../../../components/main_components/KeeperTools';
import HorizonBar from '../../../components/main_components/Slug_Page/HorizonBar';
import TrackThread from '../../../components/main_components/Slug_Page/TrackThread';
import CommentBubble from '../../../components/main_components/Slug_Page/CommentBubble';
import MetadataLabel from '../../../components/main_components/Slug_Page/MetadataLabel';
import Chip from '../../../components/main_components/Slug_Page/Chip';
import MiniCard from '../../../components/main_components/Slug_Page/MiniCard';
import { handedOver } from '../../../library/handoff';
import StarRating from '../../../components/main_components/StarRating';
import StarPicker from '../../../components/session_components/StarRating';
import { editStamp } from '../../../library/entry_formatter';
import { useEntryEditor } from '../../../hooks/useEntryEditor';


// The pair of actions that close the entry out used to share a local style
// object; it's .ln-pill in styles/base.css now, so the same button reads the
// same way at the foot of every page on the site.

// The hero's thumbnail, sized here rather than inline because the element it
// sizes changes tag while a correction is open — a picture when there is
// nothing to do to it, a button when there is — and the two have to come out
// exactly the same size or the hero row moves when you press Edit.
const HERO_COVER = {
  width: '110px', height: '110px', borderRadius: '12px', overflow: 'hidden', flexShrink: 0,
  boxShadow: 'var(--shadow-lift)', border: '1px solid var(--panel-border)',
};

// ── There is no pin here ────────────────────────────────────────────────────
// There was, for a week: a Pin chip in the row under the rating, on the
// argument that you pick a record where you *recognise* it rather than where
// you have to remember it. That argument was right and did not survive what it
// cost. pinned_entry_id is a settings column, so it belongs with the other
// settings fields behind the card's own pencil — and a control for it here is
// an admin button in the middle of somebody's reading, on a line otherwise
// made of facts about the record.
//
// So it is chosen from the card, through a search over the journal. From an
// entry there is now no "pin this one": you go to the card and look it up.
// More steps for the rarer action, which is the right way round.
// `layered` is true when this is drawn on the layer over the journal rather
// than as its own page. The only thing it changes is what the way out does:
// on the layer the journal is one step back through history and still holding
// its scroll position, and on its own page there is no history to go back to.
// `preview` draws an entry that does not exist yet — the session shows the
// listen in progress exactly as the page will print it. Nothing is fetched
// for it (there is no slug to fetch by), nothing can be commented on, and the
// footer's ways out are left off: the session is the way out.
export default function FullPostPage({ entry, references = [], authed = false, layered = false, preview = false }) {
  const router = useRouter();
  // ── Correcting what is written ────────────────────────────────────────────
  // The fields are drawn where the writing is, not in a form somewhere else:
  // the album note becomes a textarea in the album note's place, and a track's
  // note becomes one under that track. Same argument as the card's editor —
  // a field for something you cannot see while you type into it is a field you
  // fill in blind.
  const edit = useEntryEditor(entry);

  // ── The cover ─────────────────────────────────────────────────────────────
  // Whether the address under the art is showing. The art is the button: press
  // it while a correction is open and it becomes the field for its own
  // address, which is the rule the whole editor follows — you press the thing
  // you are changing, and there is nowhere else to go and look for it.
  //
  // Closed again whenever the correction closes, so it is never found already
  // open by somebody who came back to fix a typo.
  const [coverOpen, setCoverOpen] = useState(false);
  const [finding, setFinding] = useState(false);
  const [coverNote, setCoverNote] = useState('');
  useEffect(() => { if (!edit.editing) { setCoverOpen(false); setCoverNote(''); } }, [edit.editing]);

  // Asking Apple again, which is what a wrong cover almost always wants. The
  // art arrives from a search on album and artist, so a cover that is wrong is
  // nearly always a search that matched the wrong record — and by the time
  // somebody is in here the album and artist have usually just been corrected,
  // which is exactly what makes the second ask land where the first did not.
  async function findCover() {
    if (finding) return;
    setFinding(true);
    setCoverNote('');
    try {
      const found = await fetchAlbumArtUrl(edit.draft.album, edit.draft.artist, edit.draft.year);
      if (found) edit.set('album_art', found);
      else setCoverNote('Apple has nothing under that album and artist.');
    } finally {
      setFinding(false);
    }
  }

  // What the page draws. album_art holds the master, which is up to 3000px
  // square, and the largest this is ever printed is 110 — so the draft is
  // sized on the way to the screen for the same reason the served copy is.
  const coverSrc = edit.editing
    ? (edit.draft.album_art ? sizedAlbumArt(edit.draft.album_art, 900) : '')
    : entry.album_art;

  const coverField = edit.editing && coverOpen && (
    <div className="ln-cover-swap">
      <input
        className="ln-field ln-cover-url"
        value={edit.draft.album_art}
        onChange={e => edit.set('album_art', e.target.value)}
        placeholder="Image address"
        aria-label="Album art address"
        spellCheck={false}
      />
      <span className="ln-flags-row">
        <button type="button" className="ln-flag" onClick={findCover} disabled={finding}>
          {finding ? 'Looking' : 'Find it again'}
        </button>
        {edit.draft.album_art && (
          <button type="button" className="ln-flag" onClick={() => edit.set('album_art', '')}>Clear</button>
        )}
        <button type="button" className="ln-flag" onClick={() => setCoverOpen(false)}>Done</button>
      </span>
      {coverNote && <p className="ln-cover-note">{coverNote}</p>}
    </div>
  );

  // ── Which shelf it came off ───────────────────────────────────────────────
  // Whether this is something from the library or something somebody sent.
  // It is the Submission chip, set rather than read, and it was one of the two
  // things /dashboard/entries could do that this page could not.
  //
  // The other legacy field on that form was `relationship` — First Listen,
  // Revisit, Study. It is not here and does not come back: DECISIONS retired
  // it, every value having dissolved into something that says it better (a
  // revisit is the listen number, a submission is `received_from`, formative
  // is a flag). Old rows keep their values as legacy data. Retiring that route
  // is what finally takes the last picker off the site.
  //
  // Two pills rather than a dropdown, and the reason is not taste. Every input,
  // textarea and select on this site is forced to 16px on a phone, because iOS
  // zooms the whole page in when you focus anything smaller — so a select here
  // came out half again the size of the Favorite and Masterpiece chips sitting
  // beside it, in a different colour, in a row that is otherwise one object
  // repeated. A field with two possible answers was never a dropdown anyway.
  //
  // Pressing the one that is already on turns it off, because "neither" is a
  // real answer: an entry from before the column existed has no shelf, and
  // being unable to put it back would make this a one-way door.
  const SHELVES = [
    { value: 'Personal Library', label: 'Library' },
    { value: 'Submission', label: 'Submission' },
  ];

  const typeField = (
    <span className="ln-flags-row">
      {SHELVES.map(shelf => (
        <button
          key={shelf.value}
          type="button"
          className={'ln-flag' + (edit.draft.entry_type === shelf.value ? ' ln-flag--on' : '')}
          onClick={() => edit.set('entry_type', edit.draft.entry_type === shelf.value ? '' : shelf.value)}
          aria-pressed={edit.draft.entry_type === shelf.value}
        >
          {shelf.label}
        </button>
      ))}
    </span>
  );

  // Only the way in. Save and Cancel used to sit here too, and then again in
  // the bar at the foot of the page — the same pair twice on one screen, and
  // the one that matters is the one that follows you down to the note you are
  // actually fixing. This is what opens a correction; the bar is what closes
  // it.
  //
  // It used to be a pill in the chip row under the rating, beside Favorite and
  // Masterpiece — which put an admin control in the middle of the reading, on
  // a line otherwise made of facts about the record. It is a glyph in the
  // header now, top left, where the card keeps its own pencil. Drawn only for
  // the owner, and drawn on the server: a visitor's copy of this page does not
  // contain it.
  const keeperTools = authed && !edit.editing && (
    <KeeperTools onEdit={edit.begin} />
  );

  // ── The fields at the head of the entry ───────────────────────────────────
  // Album, artist, year, genre, the score and the three flags. They print in
  // two places — the phone's first screen and the desktop hero — so like the
  // pin they are written once here and mounted in both, rather than kept as
  // two copies to drift apart.
  const titleField = (
    <input
      className="ln-field ln-field--title"
      value={edit.draft.album}
      onChange={e => edit.set('album', e.target.value)}
      placeholder="Album"
      aria-label="Album"
    />
  );

  const bylineField = (
    <span className="ln-byline-fields">
      <input
        className="ln-field"
        value={edit.draft.artist}
        onChange={e => edit.set('artist', e.target.value)}
        placeholder="Artist"
        aria-label="Artist"
      />
      <input
        className="ln-field ln-field--year"
        value={edit.draft.year}
        onChange={e => edit.set('year', e.target.value)}
        placeholder="Year"
        inputMode="numeric"
        aria-label="Year"
      />
    </span>
  );

  const flagFields = (
    <span className="ln-flags">
      {/* One thing per line rather than five wrapping into each other: the
          score, then the genre, then the flags. A row that reflows as you
          widen a genre is a row you cannot aim at. */}
      <span className="ln-flags-row">
        <StarPicker
          value={parseRating(edit.draft.rating) || 0}
          onChange={v => edit.set('rating', String(v))}
          size={22}
        />
      </span>
      <input
        className="ln-field ln-field--genre"
        value={edit.draft.genre}
        onChange={e => edit.set('genre', e.target.value)}
        placeholder="Genre"
        aria-label="Genre"
      />
      <span className="ln-flags-row">
      {[
        { key: 'favorite', label: 'Favorite' },
        { key: 'masterpiece', label: 'Masterpiece' },
        { key: 'formative', label: 'Formative' },
      ].map(flag => (
        <button
          key={flag.key}
          type="button"
          className={'ln-flag' + (edit.draft[flag.key] ? ' ln-flag--on' : '')}
          onClick={() => edit.set(flag.key, !edit.draft[flag.key])}
          aria-pressed={!!edit.draft[flag.key]}
        >
          {flag.label}
        </button>
      ))}
      </span>
      {typeField}
    </span>
  );

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
    if (preview) return undefined;
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
  // The layer's header slot, if this is drawn on one. The band behind the
  // nav row is styled off .ln-entry / .ln-entry--scrolled, which the row is
  // no longer inside, so the slot is given the same two classes.
  const headerSlot = useLayerHeaderSlot();
  useEffect(() => {
    if (!headerSlot) return;
    headerSlot.setAttribute('class', 'lay-header ln-entry' + (scrolled ? ' ln-entry--scrolled' : ''));
  }, [headerSlot, scrolled]);
  // Whether the first screen was already on the layer before this rendered —
  // drawn by LayerWaiting from what the wall handed over. Read once, on the
  // first render, because the handoff is about the moment of arrival.
  const [alreadyShown] = useState(() => layered && Boolean(handedOver(entry.slug)));

  // Says "Posted" because the artist line right above it already carries the
  // album's own year — a second bare date there would just read as a second
  // release year.
  const postedOn = new Date(entry.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  // A stamp sits next to the thing that changed, never at the top of the page.
  // One date on a post says only that something moved; a date under a track's
  // note says what — and an entry carrying five of them looks different from
  // one carrying a single typo fix, which is the difference that keeps this
  // from being a quiet rewrite tool.
  //
  // Short, because it prints inline under prose rather than as a field.
  const editedOn = entry.edited_at ? editStamp(entry.edited_at) : null;

  // A textarea that grows instead of scrolling, so a note is written at the
  // length it will be read at. Runs on mount as well as on every keystroke, or
  // a note already six lines long opens showing one.
  const grow = event => {
    const el = event.currentTarget;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };
  const growOnMount = el => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  };

  const allTracksFive = parsedTracks.length > 0 && parsedTracks.every(t => t.stars === 5);
  const isMasterpiece = allTracksFive || entry.rating === 'Masterpiece';
  // Everything here is the library. A submission is a note about where a
  // record came from, so it's worth adding when true and worth nothing when
  // false — "Library" on every other entry was labelling the default.
  // Where this listen sits in the record's history. Listen 1 says so in words
  // rather than as a number — "First listen" is what anyone would call it, and
  // "1 of 1" is a fact about a database. Later listens carry the count, since
  // the interesting part of a fourth listen is that there were three before it.
  //
  // Nothing shows on an album played once: "First listen · 1 of 1" is noise on
  // an entry that has no sequence to be part of.
  const listenLabel = entry.listen_total > 1
    ? (entry.listen_number === 1
        ? `First listen · 1 of ${entry.listen_total}`
        : `Listen ${entry.listen_number} of ${entry.listen_total}`)
    : null;

  const isSubmission = entry.entry_type === 'Submission';
  // The flag is the only source now. Nine older entries carried this as
  // relationship = 'Formative'; they were migrated onto the flag and the
  // column is gone, so there is nothing else left to read.
  const isFormative = entry.formative === true || entry.formative === 'true';
  const displayRating = isMasterpiece ? 5 : parseFloat(entry.rating) || 0;

  // Back to the top of the record. Was written inline on the up-caret and is
  // named now because the mini card at the head of the notes does the same
  // thing, and two copies of a scroll dance that has to know about both
  // scrollers is two things to keep in step.
  //
  // Which scroller depends on the width: on a phone .ln-screens holds the two
  // snap screens and is what moves, and on a desktop the document does. The
  // test is whether .ln-screens actually overflows rather than a breakpoint,
  // so it answers the question it is really asking.
  function backToTheRecord() {
    const screens = document.querySelector('.ln-screens');
    const inner = document.querySelector('.ln-screen-two-scroll');
    const paged = screens && screens.scrollHeight > screens.clientHeight;
    if (paged) {
      screens.scrollTo({ top: 0, behavior: 'smooth' });
      // Reset the notes once screen one is covering them, so they start from
      // the top next time rather than mid-tracklist.
      setTimeout(() => { if (inner) inner.scrollTop = 0; }, 600);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <div
      className={'ln-entry' + (scrolled ? ' ln-entry--scrolled' : '')}
      style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--ink)', fontFamily: fonts.sans }}
    >

      {/* ── NAV ── shared site nav (logo + tools + lights), identical to
          every other public page. On the layer it is rendered into the
          layer's own header slot, outside the content that turns with a
          swipe, so the mark and the tools hold still while the record
          beneath them changes. The slot wears this page's classes so the
          band behind the row keeps working — see the effect below. */}
      {headerSlot ? createPortal(<SiteNav tools={keeperTools} />, headerSlot) : <SiteNav tools={keeperTools} />}

      {/* A correction is open, and the page is long. The controls that started
          it are at the top of the entry, which is a screen and a half away by
          the time you are fixing a note on track nine — so they come with you.
          It is also the only thing on the page that says you are editing at
          all once the hero has scrolled off. */}
      {edit.editing && (
        <div className="ln-editing-bar">
          <span className="ln-editing-label">Editing</span>
          <button type="button" className="ln-pin ln-pin--on" onClick={edit.save} disabled={edit.saving}>
            <Check size={13} weight="bold" aria-hidden="true" />
            <span>{edit.saving ? 'Saving' : 'Save'}</span>
          </button>
          <button type="button" className="ln-pin" onClick={edit.cancel} disabled={edit.saving}>
            <X size={13} weight="bold" aria-hidden="true" />
            <span>Cancel</span>
          </button>
        </div>
      )}
      {edit.trouble && <p className="ln-trouble">{edit.trouble}</p>}

      {/* On phones this is the scroll container the two screens snap inside —
          the same arrangement as .hp-mobile-screens on the homepage. On
          desktop it has no height or overflow of its own, so everything below
          just falls back into normal document flow. */}
      <div className={'ln-screens' + (edit.editing ? ' ln-editing' : '')}>

      {/* ── SCREEN ONE (phones) ── a full screen of album: art up top, then the
          title, artist, year, rating and qualifiers centred beneath it. The
          desktop hero below is the same information in a different shape. */}
      <section className="ln-screen-one">
        {edit.editing ? (
          <button
            type="button"
            className="ln-screen-one-art ln-cover ln-cover--live"
            onClick={() => setCoverOpen(o => !o)}
            aria-expanded={coverOpen}
            aria-label="Replace the cover"
          >
            {coverSrc && <img src={coverSrc} alt="" />}
            <span className="ln-cover-hint">{coverSrc ? 'Replace' : 'Add a cover'}</span>
          </button>
        ) : entry.album_art && (
          <div className="ln-screen-one-art">
            {/* decoding="sync": on the layer this image replaces an identical
                one the wait state drew, and an async decode of a new element
                is a frame with no cover in it — the blink at the moment the
                entry lands. Synchronous, from the cache, it paints in the
                same frame the old one leaves. */}
            <img src={entry.album_art} alt={entry.album} decoding="sync" fetchPriority="high" />
          </div>
        )}
        {coverField}
        {edit.editing
          ? <div className="ln-screen-one-title" style={{ fontSize: titleSize }}>{titleField}</div>
          : <h1 className="ln-screen-one-title" style={{ fontSize: titleSize }}>{entry.album}</h1>}
        <div className="ln-screen-one-artist">
          {edit.editing ? bylineField : <>{entry.artist}{entry.year ? ' · ' + entry.year : ''}</>}
        </div>
        {/* The score and the chips are what the flags below edit, so while a
            correction is open they stand down rather than sit beside their own
            controls saying the same thing twice. */}
        {/* The stars light up on arrival — unless they were already on
            screen. On the layer the wait state drew this exact score from
            what the wall handed over, so the score has not arrived, it has
            been there all along; replaying the fill starts every star empty
            for a beat, which is the blink at the moment the entry lands. */}
        {!edit.editing && displayRating > 0 && (
          <StarRating rating={displayRating} size={24} glow={isMasterpiece} animate={!alreadyShown} burst={isMasterpiece && !alreadyShown} />
        )}
        {edit.editing && flagFields}
        <div className="ln-screen-one-chips">
          {!edit.editing && listenLabel && <Chip>{listenLabel}</Chip>}
          {!edit.editing && isSubmission && <Chip>Submission</Chip>}
          {!edit.editing && (entry.favorite === true || entry.favorite === 'true') && <Chip tone="fav">Favorite</Chip>}
          {!edit.editing && isMasterpiece && <Chip tone="mp">Masterpiece</Chip>}
          {/* The third flag, missing from this row since the row was written.
              Chip has carried a formative tone the whole time and nothing ever
              passed it. */}
          {!edit.editing && isFormative && <Chip tone="formative">Formative</Chip>}
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
        {coverSrc && (
          <div style={{ position: 'absolute', inset: '-40px', backgroundImage: 'url(' + coverSrc + ')', backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(50px) saturate(1.3) brightness(1.05)', transform: 'scale(1.2)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, var(--bg) 20%, transparent 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, var(--bg) 0%, transparent 38%)' }} />

        <div className="ln-hero-pad" style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div className="ln-hero-row">
            {edit.editing ? (
              <button
                type="button"
                className="ln-cover ln-cover--live"
                style={HERO_COVER}
                onClick={() => setCoverOpen(o => !o)}
                aria-expanded={coverOpen}
                aria-label="Replace the cover"
              >
                {coverSrc && <img src={coverSrc} alt="" />}
                <span className="ln-cover-hint">{coverSrc ? 'Replace' : 'Add'}</span>
              </button>
            ) : entry.album_art && (
              <div className="ln-cover" style={HERO_COVER}>
                <img src={entry.album_art} alt={entry.album} />
              </div>
            )}
            <div style={{ flex: 1, paddingBottom: '4px' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 'var(--font-display-weight)', lineHeight: 1.05, letterSpacing: '-0.015em', color: 'var(--ink)', marginBottom: '6px' }}>
                {edit.editing ? titleField : entry.album}
                {!edit.editing && isMasterpiece && <span style={{ fontFamily: 'var(--font-label)', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginLeft: '12px', verticalAlign: 'middle', animation: 'ln-breathe 2.8s ease-in-out infinite' }}>Masterpiece</span>}
              </h1>
              <div style={{ fontFamily: 'var(--font-label)', fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: '12px' }}>
                {edit.editing ? bylineField : <>{entry.artist}{entry.year ? ' · ' + entry.year : ''}</>}
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                {edit.editing
                  ? flagFields
                  : displayRating > 0 && <StarRating rating={displayRating} size={15} glow={isMasterpiece} style={{ verticalAlign: 'middle' }} />}
                {!edit.editing && listenLabel && <Chip>{listenLabel}</Chip>}
                {!edit.editing && isSubmission && <Chip>Submission</Chip>}
                {!edit.editing && (entry.favorite === true || entry.favorite === 'true') && <Chip tone="fav">Favorite</Chip>}
              </div>
              <div style={{ fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginTop: '12px' }}>
                Posted {postedOn}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Under the hero rather than inside it. .ln-hero is a fixed 390px with
          its content anchored to the bottom, so a panel added in there grows
          upward and pushes the album title up behind the header — which is
          exactly what it did. Phones use the copy on screen one; this one is
          hidden there, or both would show. */}
      <div className="ln-cover-hero">{coverField}</div>

      {/* ── SCREEN TWO ── on phones this is the second snap screen: the header
          stays put at the top while everything below scrolls inside it, the
          way Recent Listens does on the homepage. On desktop it is a plain
          wrapper and the page scrolls normally. */}
      <section className="ln-screen-two">
      {/* Between the header band and the notes, and outside the scroller, so
          it holds still while the writing moves under it. Hidden on desktop by
          .ln-mini's own display rule — screen two only exists on a phone, and
          the hero above the notes is already doing this job on a wide window.
          Stood down while a correction is open: the fields being edited are
          the same facts, and a small copy of them repeating the answers next
          to their own controls is the same argument that takes the score and
          the chips off screen one. */}
      {!edit.editing && (
        <MiniCard
          entry={entry}
          coverSrc={coverSrc}
          rating={displayRating}
          masterpiece={isMasterpiece}
          onReturn={backToTheRecord}
        />
      )}
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
            {edit.editing ? (
              <textarea
                className="ln-write"
                value={edit.draft.notes}
                onChange={e => edit.set('notes', e.target.value)}
                ref={growOnMount}
                onInput={grow}
                aria-label="Album notes"
              />
            ) : (
              <div style={{ lineHeight: 1.95, fontSize: '15px', whiteSpace: 'pre-wrap', color: 'var(--ink)', marginBottom: '6px' }}>{linkedAlbumNotes}</div>
            )}
            {editedOn && !edit.editing && <p className="ln-edited">Edited {editedOn}</p>}
            {!preview && (
              <CommentBubble
                slug={entry.slug}
                trackIndex={-1}
                comments={albumComments}
                label={entry.album}
                onRefresh={loadComments}
              />
            )}
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
                  note={edit.editing ? null : linkedTrackNotes[i]}
                  trackIndex={i}
                  slug={entry.slug}
                  commentsByTrack={commentsByTrack}
                  onRefresh={loadComments}
                  editing={edit.editing}
                  draft={edit.draft.tracks[i]}
                  onField={(key, value) => edit.setTrack(i, key, value)}
                  preview={preview}
                />
              ))}
            </div>
          </section>
        )}

        {/* Footer — the two ways out, as a matching pair. The posted date used
            to sit here; it lives up in the album's metadata now. */}
        {/* The way back leads, and the way up follows. It was a pair of
            worded pills — "← All entries" and "↑ Back to top" — and the first
            of them had stopped leading anywhere: the journal is where you came
            from now, not a separate page you go to.

            So it is the same control the rest of the site uses for this, the
            mark of where you land over the arrow for which way that is. It can
            sit here without crowding anything because it only exists at the
            very bottom of the reading, which is the one place nothing else
            wants. */}
        {!preview && <div style={{ borderTop: '1px solid var(--border)', paddingTop: '28px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* The way out of the entry, and — while a correction is open — the
              way to end it. Delete sits at the very foot rather than in the bar
              with Save: they are not the same weight, and a destructive control
              beside the one you press every time is a control you will
              eventually press by accident. */}
          <EdgeCaret
            direction="left"
            onClick={() => (layered ? router.back() : router.push('/archive'))}
            label="Back to the journal"
            icon={BookOpen}
          />
          <button
            onClick={backToTheRecord}
            className="ln-totop"
            aria-label="Back to the top"
            title="Back to the top"
          >
            {/* An arrow and nothing else. Every other control in this family
                carries a mark for where it lands, and this one lands where you
                already are — the top of the thing you are reading. There is no
                second place to name. */}
            <CaretUp size={14} weight="bold" aria-hidden="true" />
          </button>
        </div>}

        {/* ── Where this came from ─────────────────────────────────────────
            Private, and the only part of an entry a visitor never sees —
            withoutChain strips all three before the page is rendered, which is
            why they arrive by their own fetch when an edit opens rather than
            with the entry.
            The source is the sender's entry for *this same album*, so the
            picker offers exactly that and nothing else: walking the column
            upward is what gives the history of one record, and it only holds
            while every hop is the same album. */}
        {edit.editing && (
          <div className="ln-chain">
            <p className="ln-chain-head">Where this came from · only you see this</p>
            <label className="ln-chain-row">
              <span className="ln-chain-label">Sent by</span>
              <input
                className="ln-field"
                value={edit.draft.received_from ?? ''}
                onChange={e => edit.set('received_from', e.target.value)}
                placeholder="Nobody — I found it"
              />
            </label>
            <label className="ln-chain-row">
              <span className="ln-chain-label">Received</span>
              <input
                className="ln-field"
                type="date"
                value={edit.draft.received_date ?? ''}
                onChange={e => edit.set('received_date', e.target.value)}
              />
            </label>
            {/* Written once. Where an entry sits in the tree is not an
                opinion — either their entry led to yours or it did not — so it
                can be set while it is empty and never again. Once it points
                somewhere the picker is gone and the line simply says where.
                See the note in update_entry, which enforces the same thing
                where it cannot be got around. */}
            {edit.draft.source_entry_id ? (
              <div className="ln-chain-row">
                <span className="ln-chain-label">Their entry</span>
                <span className="ln-chain-fixed">
                  {edit.kin.find(k => String(k.id) === String(edit.draft.source_entry_id))?.album
                    ?? 'Another entry for this album'}
                  <span className="ln-chain-locked"> · set once, not editable</span>
                </span>
              </div>
            ) : (
              <label className="ln-chain-row">
                <span className="ln-chain-label">Their entry</span>
                <select
                  className="ln-field"
                  value={edit.draft.source_entry_id ?? ''}
                  onChange={e => edit.set('source_entry_id', e.target.value)}
                  disabled={edit.kin.length === 0}
                >
                  <option value="">
                    {edit.kin.length === 0 ? 'No other entry for this album' : 'None — this is the origin'}
                  </option>
                  {edit.kin.map(k => (
                    <option key={k.id} value={k.id}>
                      {k.album} · listen {k.listen_number}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
        )}

        {edit.editing && (
          <div className="ln-danger">
            {!edit.asking ? (
              <button type="button" className="ln-danger-open" onClick={edit.ask}>
                Delete this entry
              </button>
            ) : (
              <div className="ln-danger-ask">
                {/* Two sentences. It said four, and the other two were true
                    of the database rather than of anything a reader would
                    recognise — what happens to comment rows, and what a broken
                    source link means. Nobody should have to understand the
                    schema to be warned about losing an album.
                    Both of those are handled by delete_entry now anyway, which
                    is the better place for a consequence than a paragraph. */}
                <p className="ln-danger-warn">
                  This deletes <strong>{entry.album}</strong> permanently. It can only be
                  undone by restoring a backed up copy.
                </p>
                <div className="ln-danger-row">
                  <button
                    type="button"
                    className="ln-danger-go"
                    onClick={edit.remove}
                    disabled={edit.removing}
                  >
                    {edit.removing ? 'Deleting…' : 'Delete permanently'}
                  </button>
                  <button type="button" className="ln-pill" onClick={edit.unask} disabled={edit.removing}>
                    Keep it
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>

      </div>{/* .ln-screen-two-scroll */}
      </section>{/* .ln-screen-two */}

      </div>{/* .ln-screens */}
    </div>
  );
}
