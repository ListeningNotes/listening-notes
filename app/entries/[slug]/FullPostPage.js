// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/entries/[slug]/PostClient.js
// The interactive UI for a single entry page.
// This is a CLIENT component — it runs in the browser and handles all interactivity:
// comments, upvotes, the horizon bar, track threads, and the live listening beacon.
// It receives the entry data from page.js which fetched it server-side.

'use client';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Check, Fingerprint, Heart, SketchLogo, VinylRecord, X } from '@phosphor-icons/react';
import { fonts } from '../../../library/sitewide_visuals';
import { sizedAlbumArt, fetchAlbumArtUrl } from '../../../library/music_data_api';
import { parseHorizon, entryTracks, splitNotes, entryTypeLabel, parseRating, flawless } from '../../../library/entry_formatter';
import { kept_receipts } from '../../../library/receipts';
import { buildReferenceIndex, createReferenceLinker } from '../../../library/cross_references';
import SiteNav from '../../../components/main_components/SiteNav';
import { createPortal } from 'react-dom';
import { useLayerHeaderSlot } from '../../../components/main_components/LayerEntry';
import KeeperTools from '../../../components/main_components/KeeperTools';
import { entryPlate } from '../../../components/main_components/EntryPlate';
import { usePress } from '../../../hooks/usePress';
import { FRAMES, FRAME_ORDER } from '../../../components/main_components/SharePrinter';
import HorizonBar from '../../../components/main_components/Slug_Page/HorizonBar';
import TrackThread from '../../../components/main_components/Slug_Page/TrackThread';
import CommentBubble from '../../../components/main_components/Slug_Page/CommentBubble';
import MetadataLabel from '../../../components/main_components/Slug_Page/MetadataLabel';
import Chip from '../../../components/main_components/Slug_Page/Chip';
import SentBy, { creditOn, useTrail } from '../../../components/main_components/Slug_Page/SentBy';
import SenderTool from '../../../components/main_components/Slug_Page/SenderTool';
import SendSheet from '../../../components/main_components/SendSheet';
import MiniAddressBook from '../../../components/main_components/MiniAddressBook';
import PrintBar from '../../../components/main_components/Slug_Page/PrintBar';
import HorizonChart from '../../../components/main_components/HorizonChart';
import MiniCard from '../../../components/main_components/Slug_Page/MiniCard';
import MarqueeTitle from '../../../components/main_components/MarqueeTitle';
import { handedOver, cameReadingOn } from '../../../library/handoff';
import { tidyAddress, tidyJournal } from '../../../library/return_address';
import { useBookplate } from '../../../components/main_components/Bookplate';
import { useTheme } from '../../../components/main_components/Lightswitch';
import CodeSlot from '../../../components/main_components/CodeSlot';
import StarRating from '../../../components/main_components/StarRating';
import StarPicker from '../../../components/session_components/StarRating';
import { editStamp } from '../../../library/entry_formatter';
import { useEntryEditor } from '../../../hooks/useEntryEditor';

// ── Printing, 2026-09-13 ──────────────────────────────────────────────────
// The printer is a mode of this page, the way correcting is: press the
// printer glyph and the first screen becomes the flyer. Tap a line to leave
// it off (it fades where it stands, and comes back on a second tap); the
// marks go chips, then symbols, then gone; a sideways swipe turns the ground
// under the card — the record blurred across the screen, plain day, plain
// night. The paper on screen takes the size picked in the bar, fitted
// between the nav and the bar with the card scaled to fit inside it; Save
// or Send makes that size with the plate that mirrors this screen's own
// numbers (EntryPlate.js), through hooks/usePress.js. Choices are kept for
// the session, per browser.
const PRINT_STORE = 'ln-printing';
// Reflect is Miyel's word for the cover blurred behind the card.
const GROUNDS = [
  { key: 'record', label: 'Reflect' },
  { key: 'day', label: 'Day' },
  { key: 'night', label: 'Night' },
];
// Said under the bar each time the printer opens, until the first tap of
// that opening — nobody would know a line can be tapped off otherwise
// (Miyel, 2026-09-13; once-ever was too little).
const PRINT_HINT = 'Tap an element to remove or add it.';


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
// The same box while it is showing the code, 2026-09-12: a code the size of
// the thumbnail is too fine to point a phone at, so the box grows to the
// portrait's scale and the row makes room — the title moves over, the way
// content is allowed to on this site. Grown from the thumbnail rather than
// floated over the row, so the code visibly comes out of the cover.
const HERO_COVER_CODE = { ...HERO_COVER, width: '220px', height: '220px' };
const HERO_COVER_EASE = { transition: 'width 0.26s ease, height 0.26s ease' };

// A short mark for the art's address, stamped onto the code's address so a
// corrected cover asks for a fresh picture rather than the one the browser
// cached for the old one. Not a fingerprint of anything: any change is enough.
function artMark(text) {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

const COVER_LABELS = { toCode: 'Show the code for this entry', toPicture: 'Show the cover' };

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
  //
  // `layered` goes in because deleting has to leave by the door it came in
  // through: a sheet over the journal closes with back, and a push would hold
  // the sheet up with nothing in it. See the note in `remove`.
  const edit = useEntryEditor(entry, { layered });

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

  // ── The cover as the code ─────────────────────────────────────────────────
  // Outside a correction the art is a CodeSlot — the square the card's
  // portrait turns in: press it and it becomes a scannable code for this
  // entry's address, the address goes on the clipboard, the pill says so.
  // Available to anyone: an address travels freely; only the contents
  // don't. On a home screen there is no address bar, so this is not hiding
  // the address, it is the only form the address takes.
  //
  // The picture is pressed on the server the first time it is asked for
  // (app/api/entries/[slug]/code) and never on entry save: most entries are
  // never tapped, and Apple's art cannot be read in a browser anyway. The
  // slot breathes the cover until it arrives.
  const { site_address, keeper_name } = useBookplate();
  const { theme } = useTheme();
  const host = tidyAddress(site_address);
  const entryUrl = host && entry.slug ? `https://${host}/entries/${entry.slug}` : '';
  const canTurnCover = Boolean(entryUrl && entry.album_art && !preview);
  const [coverCode, setCoverCode] = useState(false);
  // Whether the trail behind a sent record is open under the Sent by line —
  // see SentBy.js. Closed on arrival, and closed again on a swipe to the next
  // record, like the code.
  const [trailOpen, setTrailOpen] = useState(false);
  // And the trail itself, walked once here rather than once in each of the
  // two copies of the card — the phone's first screen and the desk's hero —
  // which would be the sender's journal, and every journal behind it, fetched
  // twice for one reading. Nothing is walked for the session's preview: the
  // record does not exist yet and there is nobody to ask.
  const trail = useTrail(preview ? null : entry);
  // On the layer a swipe brings the next record into this same component,
  // and a record arrives on its cover, not on the last one's code. The slot
  // itself is keyed on the slug below, so its own state starts over too.
  const [codeFor, setCodeFor] = useState(entry.slug);
  if (codeFor !== entry.slug) {
    setCodeFor(entry.slug);
    setCoverCode(false);
    setTrailOpen(false);
  }
  // The dots are the page's ink, so the page asks for the file that matches
  // it. The art's mark rides along so a corrected cover is never a day stale.
  const codeSrc = `/api/entries/${encodeURIComponent(entry.slug)}/code?theme=${theme === 'dark' ? 'dark' : 'light'}`
    + `&v=${artMark(entry.album_art_source || entry.album_art || '')}`;
  const coverSlot = {
    address: entryUrl,
    codeSrc,
    turned: coverCode,
    onTurn: setCoverCode,
    backGlyph: <VinylRecord size={12} weight="bold" />,
    labels: COVER_LABELS,
  };

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

  // ── Which shelf it came off, and why it is not asked here ────────────────
  // The Library / Submission buttons left this form on 2026-09-17. They asked
  // a question the credit already answers: naming a sender has always forced
  // Submission, and an entry is a submission exactly when somebody sent it.
  // Two controls for one fact meant the two could disagree — and the shelf is
  // barely a fact a reader ever sees. **An entry never prints "Library" at
  // all**; the only shelf word on an entry is Submission, and only where no
  // credit line is naming the sender instead. The answer moved to where the
  // question is asked, in SenderTool, which sets the shelf from the name.
  //
  // The other legacy field on the old /dashboard/entries form was
  // `relationship` — First Listen, Revisit, Study. It is not here and does not
  // come back: DECISIONS retired it, every value having dissolved into
  // something that says it better (a revisit is the listen number, a
  // submission is `received_from`, formative is a flag). Old rows keep their
  // values as legacy data.

  // ── Who sent it ───────────────────────────────────────────────────────────
  // Sent by left this form on 2026-09-16 and is its own tool on the ···
  // (components/main_components/Slug_Page/SenderTool.js). It was a field
  // among fifteen, which filed the one thing on an entry that is about
  // somebody else under fixing your own typos — and it meant the page had to
  // become a form to answer a question with one answer. Everything that was
  // written here about *how* it works moved with it, including why the book
  // is faces and why typing does not unlink.

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
  //
  // The printer is a mode of this page (see PRINT_STORE at the top). It was
  // a route for a day, and on a phone the entry is itself a sheet over the
  // journal: the two shared the one layer slot, so the printer replaced the
  // entry underneath and closing it rebuilt the entry with the journal
  // flashing through. Then it was a sheet of its own over the entry, which
  // was the wrong shape for the front door. Now it is this page.
  const [printing, setPrinting] = useState(false);
  const [printChoices, setPrintChoices] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem(PRINT_STORE) || '{}') || {}; } catch { return {}; }
  });
  useEffect(() => {
    try { sessionStorage.setItem(PRINT_STORE, JSON.stringify(printChoices)); } catch { /* private mode */ }
  }, [printChoices]);
  const ground = GROUNDS.some(g => g.key === printChoices.ground) ? printChoices.ground : 'record';
  const shown = {
    keeper: printChoices.keeper !== false,
    title: printChoices.title !== false,
    artist: printChoices.artist !== false,
    stars: printChoices.stars !== false,
    chips: printChoices.chips !== false,
    symbols: printChoices.symbols === true,
    horizon: printChoices.horizon !== false,
    // The mark is not a switch — no print goes out without it — but its dot
    // is: a tap turns it live green or back to ink (Miyel, 2026-09-13).
    liveDot: printChoices.liveDot === true,
  };
  // Plain night is dark whatever the page's theme; the record's ground
  // follows it, the way the page does.
  const printDark = ground === 'night' || (ground === 'record' && theme === 'dark');
  const size = FRAME_ORDER.includes(printChoices.size) ? printChoices.size : 'story';
  // The paper on screen fits the room between the nav and the bar, and the
  // card is scaled to fit the paper: measured, never guessed, and only from
  // the observer (which fires once on observe), so no state is set in the
  // effect's own body.
  const printStackRef = useRef(null);
  const printCardRef = useRef(null);
  const [printScale, setPrintScale] = useState(1);
  useLayoutEffect(() => {
    if (!printing) return undefined;
    const stack = printStackRef.current;
    const card = printCardRef.current;
    if (!stack || !card) return undefined;
    const observer = new ResizeObserver(() => {
      // Against the room inside the paper's padding, not the paper: measured
      // against the whole paper, a card a little too tall scaled to nearly 1
      // and spilled out of both ends (Miyel's phone, 2026-09-13).
      const cs = getComputedStyle(stack);
      const roomH = stack.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const roomW = stack.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const k = Math.min(1, roomH / card.offsetHeight, roomW / card.offsetWidth);
      setPrintScale(Number.isFinite(k) && k > 0 ? k : 1);
    });
    observer.observe(stack);
    observer.observe(card);
    return () => observer.disconnect();
  }, [printing, size]);
  const keeperName = (keeper_name || '').trim();
  const plate = useMemo(() => entryPlate({ entry, keeper: keeperName }), [entry, keeperName]);
  const press = usePress({
    plate, shown, ground, isDark: printDark, link: entryUrl,
    fonts: { sans: '.ln-screen-one-title', mono: '.ln-screen-one-artist' },
  });
  const leaveOff = key => { learn(); setPrintChoices(c => ({ ...c, [key]: !shown[key] })); };
  const cycleMarks = () => { learn(); setPrintChoices(c => {
    const hasSymbols = entry.favorite === true || entry.favorite === 'true' || isMasterpiece || isFormative;
    if (shown.chips) return { ...c, chips: false, symbols: hasSymbols };
    if (shown.symbols) return { ...c, chips: false, symbols: false };
    return { ...c, chips: true, symbols: false };
  }); };
  const turnGround = step => setPrintChoices(c => {
    const i = GROUNDS.findIndex(g => g.key === ground);
    return { ...c, ground: GROUNDS[(i + step + GROUNDS.length) % GROUNDS.length].key };
  });
  // A sideways swipe on the screen turns the ground. The sheet's own
  // sideways swipe — the next record — stands down while printing; this is
  // a different mode (LayerEntry looks for .ln-printing).
  const groundSwipe = useRef(null);
  const onGroundTouchStart = e => {
    if (!printing || press.picture || e.touches.length !== 1) return;
    groundSwipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onGroundTouchEnd = e => {
    const from = groundSwipe.current;
    groundSwipe.current = null;
    if (!from || !printing || press.picture || !e.changedTouches?.length) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - from.x;
    const dy = t.clientY - from.y;
    if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy)) turnGround(dx < 0 ? 1 : -1);
  };
  // Stamped on <html> so the sheet's own furniture can stand down (entry.css
  // reaches the carets from the root). The grounds' colours are NOT stamped
  // there: a day or night paper must not turn the site's own theme — only
  // the card and its bar (Miyel, 2026-09-13), which carry their own mark.
  useEffect(() => {
    const root = document.documentElement;
    if (printing) root.dataset.printing = '1'; else delete root.dataset.printing;
    return () => { delete root.dataset.printing; };
  }, [printing]);
  const [learned, setLearned] = useState(false);
  const learn = () => { if (!learned) setLearned(true); };
  const finishPrinting = useCallback(() => { setPrinting(false); press.dismissPicture(); }, [press]);
  // Escape leaves the mode, and is stopped before the sheet under it hears
  // it and closes the entry too.
  useEffect(() => {
    if (!printing) return undefined;
    const onKey = event => { if (event.key === 'Escape') { event.stopPropagation(); finishPrinting(); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [printing, finishPrinting]);
  // Which of the two new tools is open. Separate flags rather than one mode:
  // they are different shapes — one unfolds in the page, one rises over it —
  // and nothing sensible happens if both are true at once anyway.
  const [sendering, setSendering] = useState(false);
  const [sending, setSending] = useState(false);
  // Where a panel of this entry's own hangs its footer bar. It has to be
  // *inside the layer*: z-index is per stacking context, the layer is fixed at
  // 200 and the bar is 140, so a bar rendered into the body competes with the
  // layer and loses — it draws underneath and is simply not there (found
  // 2026-09-17, after portalling it to document.body seemed to work on a page
  // with no layer over it). Rendered here it is a sibling of .ln-screens, the
  // same place the correction's bar is, where 140 means "above this layer's
  // own content" and the fixed position still resolves against the window
  // because nothing between here and the root is transformed while a panel is
  // open.
  const [barSlot, setBarSlot] = useState(null);
  // Which track is up on its own screen, or null. The index rather than the
  // row, so the dial always reads the live draft rather than a copy taken when
  // it opened — a rating set in the dial has to be the same one the row shows
  // behind it.
  const [dialTrack, setDialTrack] = useState(null);

  // ── Another listen of the same record ────────────────────────────────────
  // An album has many listens and they are numbered from the entries that
  // exist, never chosen; entries are never overwritten and a relisten is a new
  // one (DECISIONS). So this does not touch what is on screen — it puts the
  // record on the desk and opens a listen, which is exactly what the inbox
  // does when a send is picked up, through the same key.
  //
  // What it deliberately does not carry: the type and the credit. Where a
  // record is from is decided by how the listen started, and this one started
  // in the library — nobody sent it to you a second time. The art, the year,
  // the genre and the collection id do come, because they are facts about the
  // record and re-finding them would be asking Apple for what is already here.
  const revisit = () => {
    try {
      localStorage.setItem('ln_pending_session', JSON.stringify({
        album: entry.album,
        artist: entry.artist || '',
        year: entry.year || '',
        artUrl: entry.album_art || '',
        collectionId: entry.collection_id || null,
        genre: entry.genre || '',
      }));
    } catch { /* a private window still gets the picker, one tap further on */ }
    router.push('/session');
  };

  const keeperTools = authed && !edit.editing && !printing && (
    <KeeperTools
      onEdit={edit.begin}
      slug={entry.slug}
      onPrint={() => { setPrinting(true); setLearned(false); }}
      /* Sent by unfolds where its answer prints, in the slot under the chips,
         rather than turning the whole page into a form for one field. */
      onSender={() => setSendering(true)}
      /* And Send opens the same sheet a row in the address book opens, with
         this record already in it — the two ways in differ only in which
         half is answered before the sheet arrives. */
      onSend={() => setSending(true)}
      /* And another listen of the same record, which is a new entry and never
         an edit of this one. */
      onRelisten={revisit}
      /* Straight to it, because the tool does the asking itself now: the
         first press turns Delete into "Sure?" and the second one deletes
         (KeeperTools). It used to run `edit.begin(); edit.ask()` — open a
         correction with the warning waiting at the foot of it — so pressing
         Delete put you in edit mode on a page-long form with the thing you
         asked for below the fold. Miyel, 2026-09-18: "delete button on an
         entry post just takes you to edit." */
      onDelete={edit.remove}
    />
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
      {/* The flags wear their own marks here, 2026-09-17. They were three
          identical word-pills, which is the one shape this row should not be:
          the marks are the site's vocabulary — Heart in --fav, SketchLogo in
          --mp, Fingerprint in --formative, restated wherever a record is drawn
          — and a keeper setting a flag was the only place on the site that did
          not show the thing being set. The word stays beside the mark, because
          this is the surface where you are choosing rather than reading, and
          DECISIONS' "marks, not words" is about the strip where an album title
          needs the room. */}
      <span className="ln-flags-row">
      {[
        { key: 'favorite', label: 'Favorite', Icon: Heart, weight: 'fill', tone: 'fav' },
        { key: 'formative', label: 'Formative', Icon: Fingerprint, weight: 'bold', tone: 'formative' },
      ].map(flag => (
        <button
          key={flag.key}
          type="button"
          className={`ln-flag ln-flag--mark ln-flag--${flag.tone}` + (edit.draft[flag.key] ? ' ln-flag--on' : '')}
          onClick={() => edit.set(flag.key, !edit.draft[flag.key])}
          aria-pressed={!!edit.draft[flag.key]}
        >
          <flag.Icon size={13} weight={flag.weight} aria-hidden="true" />
          <span>{flag.label}</span>
        </button>
      ))}
      {/* Masterpiece is not pressed, and it is not there at all until it is
          true (Miyel, 2026-09-17). It is what the tracklist says: every track
          rated, every rating five. Shown greyed it read as a control somebody
          had disabled — a thing you would press if only you could — where the
          truth is that it is not a control and never was. Arriving is the
          whole gesture: a fact about your ratings rather than a judgement you
          award yourself, and the same way it behaves in a session.

          It moves while you correct, which is the point: take one track from
          five to four and it goes, here, before you save. */}
      {flawless(edit.draft.tracks) && (
        <span
          className="ln-flag ln-flag--mark ln-flag--mp ln-flag--said ln-flag--on"
          title="Every track is five stars"
        >
          <SketchLogo size={13} weight="fill" aria-hidden="true" />
          <span>Masterpiece</span>
        </span>
      )}
      </span>
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
  // ── What was said, against what is on the record ────────────────────────
  // An entry carries its whole tracklist from 2026-09-18, including the songs
  // nothing was written about — the record's own contents, which nothing else
  // holds. So the page has to draw the difference rather than the list.
  //
  // Reading, a row with no stars, no note and no heart is a row saying
  // nothing, and sixteen of them under a heading called Track Notes is a
  // wall of titles pretending to be writing. They are skipped.
  //
  // Correcting, they are exactly what you came for: Miyel opened a
  // correction on a record she had logged bare and found the bottom screen
  // "just fully blank". The whole list is there, the empty ones waiting to be
  // filled — her "ghost tracks".
  //
  // Counted rather than filtered, on purpose: the index into parsedTracks is
  // the track's identity everywhere on this page — its comments, its note,
  // its link — so a filtered copy would renumber every song after the first
  // unwritten one.
  const said = t => t.stars > 0 || (t.note || '').trim() || t.favorite;
  const saidTracks = parsedTracks.filter(said).length;

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
  // ── When there is nothing under the fold ────────────────────────────────
  // A listen can be a cover, a score and nothing else since 2026-09-18, and
  // Miyel logged one and found what it does: "it scrolls down to a header
  // with nothing. I don't even think there should be an option to scroll down
  // on those entries. Maybe it just shakes on the screen to let people know
  // there's no notes."
  //
  // Every section on screen two hides itself when it is empty, which was the
  // right instinct one section at a time and adds up to a screen that is
  // nothing but its own sticky header. So the screen itself goes, and the
  // caret that pointed at it stays and wobbles — an answer rather than a
  // journey to an empty room. Shown rather than removed, because a control
  // that vanishes on some records and not others is a control nobody trusts.
  //
  // Never while a correction is open: the note field lives down there, and an
  // entry with no note is exactly the one somebody would open a correction to
  // write one on.
  const nothingBelow = !edit.editing
    && !albumNotes
    && albumComments.length === 0
    && saidTracks === 0
    && horizonBars.length === 0;
  // The wobble. Held for as long as it plays and no longer.
  const [wobble, setWobble] = useState(false);


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
  // Whether the header is standing in for the record — see the collapse
  // further down, which is what turns it on.
  const [crowning, setCrowning] = useState(false);
  // ── Did this record arrive already reading, 2026-09-20 ──────────────────
  // Asked once, in the first render, and never again. It was asked in the
  // layout effect off the sheet's class, and that is a race: the class says
  // `swiped` only once the layer itself has remounted for the new address,
  // which on a real phone is a few hundred milliseconds after the record has
  // drawn. For that window the record did not know it had arrived at the
  // notes, so it stood its header down and the journal's mark came back at
  // full strength over the card — Miyel, twice: "the mini LN loads over the
  // mini card on swipe."
  //
  // Read here, the answer is true before the first frame and cannot change.
  // LayerWaiting has already looked without spending it.
  const [arrivesReading] = useState(cameReadingOn);
  // ── The mark is not drawn at all until it could be right ────────────────
  // Fading it was two evenings of the same bug wearing different clothes: a
  // number on the document, a number on the element, a class on the slot —
  // and every one of them had a window where the row had been drawn and the
  // number had not been said yet, so the journal's mark stood at full
  // strength over the record's own card.
  //
  // A record that arrives already reading does not draw the mark at all. Once
  // its collapse has measured itself, there is a true answer for every frame
  // and the fade takes over. Nothing to race.
  const [ledeDrawn, setLedeDrawn] = useState(!arrivesReading);
  // The mark's strength, said before this record's first frame and said
  // either way. Every later moment is a race with something: the record that
  // is leaving, and the collapse, which cannot speak until it has measured
  // and on a sheet still arriving has not. Between those two the row had the
  // journal's mark at full strength over the record's own card.
  //
  // In a layout effect and not in the initializer above: a state initializer
  // is called twice in development, so anything it touches outside itself is
  // done twice with two different answers.
  useLayoutEffect(() => {
    document.documentElement.style.setProperty('--ln-lede', arrivesReading ? '0' : '1');
  }, [arrivesReading, entry.slug]);
  useEffect(() => {
    if (!headerSlot) return;
    headerSlot.setAttribute('class', 'lay-header ln-entry'
      + (scrolled ? ' ln-entry--scrolled' : '')
      + (crowning ? ' ln-entry--crowning' : ''));
  }, [headerSlot, scrolled, crowning]);
  // Whether the first screen was already on the layer before this rendered —
  // drawn by LayerWaiting from what the wall handed over. Read once, on the
  // first render, because the handoff is about the moment of arrival.
  const [alreadyShown] = useState(() => layered && Boolean(handedOver(entry.slug)));

  // Says "Posted" because the artist line right above it already carries the
  // album's own year — a second bare date there would just read as a second
  // release year.
  const postedOn = new Date(entry.posted_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
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
  // Who sent a record is a line under the chips now rather than a panel
  // behind them (SentBy.js, 2026-09-15), so the chip's only remaining job is
  // the entries that line cannot draw: a credit the sender asked to keep
  // quiet, and the Submissions logged before the inbox began filling the
  // name in. Where a name is about to be printed, *Sent by Zach* already
  // says the record was one, and the chip would be a third pill on the
  // busiest row saying worse what the line below says. Both read the credit
  // through creditOn, so the chip and the line can never both show, or both
  // go missing and leave a sent record saying nothing.
  //
  // No envelope in it, on Miyel's call 2026-09-14: the chips on the first
  // screen are words, the marks are the strip's on screen two, and a chip
  // carrying a mark the others do not was also the one thing that moved
  // when an entry landed over the journal — the stand-in draws the chips
  // without it (LayerWaiting). No caret either, since 2026-09-15: the chip
  // no longer opens anything, and the one thing still behind a press is the
  // trail, which wears its own on the pill that opens it.
  const credit = creditOn(entry);
  const sentChip = isSubmission && !credit ? <Chip>Submission</Chip> : null;
  // Down while a correction or a print is open: the sender is a field being
  // edited in one, and is not the record in the other. In the session's
  // preview it draws but reads nobody's journal — there is no trail to find
  // for an entry that does not exist yet.
  //
  // Keyed on the slug so a swipe to the next record starts its own walk —
  // with a prefix, because the cover beside it is keyed on the bare slug
  // and two siblings on one key had React drawing the cover twice.
  // The slot under the chips: the line normally, the tool while it is open.
  // It takes the slot whether or not there is a line there yet, because the
  // place the answer prints is the place to answer it — and an entry with no
  // sender is exactly when somebody reaches for this.
  const sentLine = sendering && authed ? (
    <SenderTool key={`sender-${entry.slug}`} entry={entry} barSlot={barSlot} onDone={() => setSendering(false)} />
  ) : credit && !edit.editing && !printing && (
    <SentBy
      key={`sent-${entry.slug}`}
      entry={entry}
      keeper={keeperName}
      mine={authed}
      trail={trail}
      open={trailOpen}
      onOpen={setTrailOpen}
    />
  );
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
  // Down to the notes. Nothing there means nothing happens except the caret
  // saying so — a shake rather than a scroll to an empty room (Miyel,
  // 2026-09-18). Guarded on `wobble` so holding the key down does not restart
  // it into a permanent tremor.
  function down() {
    if (nothingBelow) { if (!wobble) setWobble(true); return; }
    document.querySelector('.ln-screen-two')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

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

  // ── The record collapses into the header, 2026-09-20 ────────────────────
  // Miyel: "the album transforms into the header — we don't need the
  // Listening Notes logo up there, it could just be the album, almost like
  // when you have the mini beacon in the session."
  //
  // The same morph the beacon's mark does, with one difference she picked
  // between: the mark up there holds still and everything passes behind an
  // opaque header, and the art down here is far too big for that — a header
  // reaching past it would be half the screen, and the title, the score and
  // the chips would be gone the moment you moved. So this one *lags*. It
  // drifts up at a fraction of the page's speed, keeps its size until the
  // notes are close, and then collapses into the row. Nothing is hidden;
  // everything scrolls past it the way it always did.
  //
  // Drawn by the header and not by the page, which is the lesson the beacon
  // cost four evenings: on a phone the content paints under the fixed row,
  // so anything that has to end up *in* that row has to start there too.
  // The page's own art goes invisible while this one stands in for it, and
  // keeps its box, which is what everything below it is positioned against.
  // A layout effect, not an effect: everything in it decides what the first
  // frame of a record looks like — where its scroller starts and how far
  // through the collapse its cover is. After paint, both of those are a
  // frame of the wrong thing first (Miyel: "no blink between swiping through
  // albums in mini header state, they all reload").
  useLayoutEffect(() => {
    // Not while the page is something else. Printing makes screen one a
    // sheet of paper and editing makes it a form; in both the art is a
    // control you are using, not a thing on its way somewhere.
    if (printing || edit.editing) { setCrowning(false); return undefined; }
    const screens = document.querySelector('.ln-screens');
    const art = document.querySelector('.ln-screen-one-art');
    const row = document.querySelector('.sitenav-row');
    const one = document.querySelector('.ln-screen-one');
    // ── Found again, never held, 2026-09-20 ──────────────────────────────
    // The header is a portal into a slot the layer owns, and on a swipe the
    // wait state's row is in that slot first and the record's replaces it.
    // Anything this effect grabbed on the way in is then a node that is no
    // longer on the page, and writing to it writes to nothing — which is why
    // the journal's mark was still at full strength over the record's own
    // card (Miyel, twice: "the mini LN loads over the mini card on swipe").
    //
    // So the row's pieces are looked up whenever there is something to say
    // about them, and the one thing that must be true before the first frame
    // is said to the document, which nothing replaces.
    let crown = null;
    const parts = () => {
      crown = document.querySelector('.ln-crown');
      return Boolean(crown);
    };
    // The mark's own strength, said on the root: .ln-entry .sitenav-logo
    // reads it, so whichever row is in the slot is already wearing the right
    // answer the moment it is drawn.
    const lede = amount => document.documentElement.style.setProperty('--ln-lede', amount);
    parts();
    if (!screens || !art || !crown || !row || !one) return undefined;

    // ── Nothing until the sheet has landed, 2026-09-20 ────────────────────
    // An entry rises from the foot of the screen now, and its header is held
    // where it is by running the inverse of that rise on it. Which means that
    // while the arrival is playing the header and the page are in different
    // frames — a whole screen apart — and anything measured across the two is
    // measured in neither. The first attempt read the art at 172 and the seat
    // at 172 minus a screen, and put the record off the top of the page.
    //
    // So the collapse does not exist until the sheet is still. Until then the
    // page's own art is the art, which is the thing rising anyway, and the
    // seat is not drawn. They are the same picture at the same place, so the
    // handover at the end is not something anybody can see.
    const sheet = row.closest('.lay');
    // By name, not just by "something is running". The caret at the foot of
    // the record bobs on a 2.2s loop that never ends, so asking the subtree
    // whether anything is playing is asking whether the page exists — and
    // the collapse never started.
    // A page turn is not one of them. `layFromLeft` and `layFromRight` move
    // the content sideways and leave the header alone, so nothing measured
    // across the two is wrong — and waiting them out is what made every
    // record swiped to in the mini state open at the top and then jump.
    const landing = () => {
      if (!sheet) return false;
      // The sheet's own animations, whatever they are: growing out of a tile
      // is run by the Web Animations API and has no name to match on, and
      // measuring anything while the whole surface is scaled to the size of
      // a cover gives numbers about a cover.
      if (sheet.getAnimations().some(a => a.playState === 'running')) return true;
      // And the named ones underneath — but not a page turn, which moves the
      // content sideways and leaves the header alone.
      return sheet.getAnimations({ subtree: true }).some(a => a.playState === 'running'
        && String(a.animationName || '').startsWith('lay')
        && !String(a.animationName || '').startsWith('layFrom'));
    };

    // How far the record takes to become the header. Not the whole album
    // screen — see the note beside `over` in measure().
    // Where this record has to start, when it starts at the notes. Kept
    // rather than set once: on the first frame the writing underneath may
    // not be laid out yet, and a scroller shorter than the number simply
    // ignores it — so it is asked for again until it takes, or until the
    // record turns out to be short enough that the top is the answer.
    let want = null;
    const settle = () => {
      if (want == null) return;
      const far = Math.max(0, screens.scrollHeight - screens.clientHeight);
      const aim = Math.min(want, far);
      if (screens.scrollTop < aim - 1) screens.scrollTop = aim;
      if (screens.scrollTop >= aim - 1) want = null;
    };
    let base = null;
    // Whether the record has finished becoming the header. Kept from the
    // last frame drawn, because the question gets asked at moments when
    // there is nothing measured to ask it of.
    let done = false;
    // ── A page turn takes the record with it, 2026-09-20 ──────────────────
    // Miyel: "in large card format, swiping albums takes the text away first
    // then the art — they should swipe at the same time." Of course it does:
    // the art is drawn by the header now, and the header is the one thing on
    // this screen that does not slide sideways. The title and the score are
    // in the content and leave with it; the cover stands there.
    //
    // So while a turn is in the air and the record is still the record, the
    // header stands down and the page's own art — which is in the content,
    // and slides — is the art again. They are the same picture at the same
    // place at that point in the collapse, so the handover either side of
    // the turn is not something anybody can see.
    //
    // Only while it is still the record. Once it is the header, the header
    // is where it belongs and holding still is what a header does.
    const middle = el => {
      const r = el.getBoundingClientRect();
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, h: r.height };
    };
    const measure = () => {
      settle();
      if (!parts()) return;
      if (!window.matchMedia('(max-width: 768px)').matches) {
        base = null;
        setCrowning(false);
        return;
      }
      if (landing()) { base = null; setCrowning(false); return; }
      const gone = screens.scrollTop;
      if (!middle(art).h) { base = null; setCrowning(false); return; }
      // The last words on the album screen: the posted line, or the chips if
      // a listen has no date on it.
      const last = document.querySelector('.ln-screen-one-posted')
        || document.querySelector('.ln-screen-one-chips');
      setCrowning(true);
      base = {
        // Where the notes come to rest: the album screen gone under the
        // header. It is what the caret lands on, what a swipe from one
        // record's notes lands on in the next, and where the changeover
        // finishes.
        ends: Math.max(1, one.getBoundingClientRect().bottom + gone - row.getBoundingClientRect().bottom),
        // And where the header changes over, which is earlier: the last of
        // the record's own words going under it. Miyel, on where it should
        // happen — "maybe when you hit the caret, or the submitted-by, or
        // that blank space." Past that line the album screen is a caret and
        // air, so there is nothing left up there for the header to be about.
        turns: Math.max(1, (last || one).getBoundingClientRect().bottom + gone - row.getBoundingClientRect().bottom),
      };
      draw();
    };
    const draw = () => {
      if (!base) return;
      // ── Nothing travels, 2026-09-20 ───────────────────────────────────
      // Miyel: "the image needs to pass under the header, not animate up."
      // Which is the rest of the sentence she started with — "it all
      // disappears under until it's all the way up there, it doesn't even
      // really need an animation, and by the time everything gets to the top
      // it just sticks and replaces the header."
      //
      // So the record does not move and does not shrink. The album screen
      // goes up and under the header the way any page goes under any header,
      // cover and all, and the header changes over as the last of it passes:
      // the journal's name out, the record in. A relay, not a morph. There
      // were two other answers before this one — a lag with a shrink, and a
      // hold with a floor reaching past the cover — and both were, in her
      // words, a little bit dramatic for the page.
      //
      // And it is a swap, not a fade. It ran over the last hundred and sixty
      // pixels for an hour, and Miyel's answer was the same one she gave the
      // listen's arrival a fortnight ago: "just not cross fade." Two things
      // half-drawn over each other in the middle of a row is not a header
      // becoming another header, it is a header nobody can read. So the
      // journal's name holds the middle for the whole of the album screen
      // and the record takes it the instant that screen has gone.
      const on = screens.scrollTop >= base.turns;
      // ── It arrives, it does not appear, 2026-09-20 ────────────────────
      // Miyel: "I need it to have some kind of way to get there that is not
      // just appearing, but also not so loud that your eye hits it. I don't
      // like crossfades, but there must be something."
      //
      // A wipe. The record is uncovered from its top edge down over a fifth
      // of a second — the shutter a departures board has — so there is
      // movement to follow and never two things drawn over each other. The
      // mark goes the instant it starts, because the whole point of not
      // fading is that they are never both there.
      if (on !== done && crown) {
        crown.classList.remove('ln-crown--in');
        if (on) { void crown.offsetWidth; crown.classList.add('ln-crown--in'); }
      }
      done = on;
      // Both said on the document rather than on the elements: the row is a
      // portal and its nodes are replaced out from under anything holding
      // one, and a number written here as an inline style would also beat
      // the rule that gets the record out of the tools' way.
      document.documentElement.style.setProperty('--ln-crown', on ? '1' : '0');
      lede(on ? '0' : '1');
      // And now it can be drawn: there is a number for it.
      setLedeDrawn(true);
    };

    // ── Reading on lands where you were, 2026-09-20 ───────────────────────
    // A thumb sideways is turning a page, not opening a book. If the record
    // you left had already gone up into the header, this one starts there:
    // at its own notes, its own cover already collapsed. Not the same scroll
    // position — albums have different amounts written about them, and 700px
    // into a short one is the end of it.
    //
    // Before the first measure, so the numbers it takes are the ones this
    // record is actually going to be drawn with.
    if (arrivesReading) {
      want = Math.max(0, one.getBoundingClientRect().bottom - row.getBoundingClientRect().bottom);
      settle();
      // And it arrives *as* the header, so the turn has nothing to stand the
      // header down for. Without this the collapse waited the turn out the
      // way it does when the record is still the record — and while it
      // waited, the journal's mark had never been told to give the row up:
      // Miyel, "the mini LN loads over the mini card on swipe."
      done = true;
      // Said before anything is drawn, because the row that will read it may
      // not be the row that is in the slot right now.
      lede('0');
    }

    measure();
    // And again the moment the arrival is over, which is the measurement
    // that counts.
    if (sheet) sheet.addEventListener('animationend', measure);
    // A finger on the sheet is the only one of the three that fires nothing
    // else. Asked while the record is still the record, which is the only
    // time the answer can change.
    const onTurn = () => { if (!done) measure(); };
    if (sheet) sheet.addEventListener('touchmove', onTurn, { passive: true });
    if (sheet) sheet.addEventListener('transitionend', measure);
    // The turn says so in the class list on its way in and on its way out,
    // and both ends of it want a fresh answer.
    const watchSheet = sheet ? new MutationObserver(measure) : null;
    if (watchSheet) watchSheet.observe(sheet, { attributes: true, attributeFilter: ['class'] });
    screens.addEventListener('scroll', draw, { passive: true });
    screens.addEventListener('load', measure, true);
    const narrow = window.matchMedia('(max-width: 768px)');
    narrow.addEventListener('change', measure);
    window.addEventListener('resize', measure);
    const watch = new ResizeObserver(measure);
    watch.observe(screens);
    watch.observe(one);
    watch.observe(row);
    return () => {
      if (sheet) sheet.removeEventListener('animationend', measure);
      if (sheet) sheet.removeEventListener('touchmove', onTurn);
      if (sheet) sheet.removeEventListener('transitionend', measure);
      if (watchSheet) watchSheet.disconnect();
      screens.removeEventListener('scroll', draw);
      screens.removeEventListener('load', measure, true);
      narrow.removeEventListener('change', measure);
      window.removeEventListener('resize', measure);
      watch.disconnect();
      document.documentElement.style.removeProperty('--ln-crown');
      if (crown) crown.classList.remove('ln-crown--in');
      // Not taken away. The record arriving sets it for itself, and a
      // leaving one that cleared it was clearing the new one's answer.
      setCrowning(false);
    };
  }, [printing, edit.editing, coverSrc, entry.slug, arrivesReading]);

  // What the header carries on this page. A press goes back to the record,
  // which is the job MiniCard used to do at the head of the notes — and the
  // reason that card is not drawn on a phone any more.
  const headerMark = (
    // The whole strip is the way back up to the record, which is the job the
    // mini card at the head of the notes used to do. The cover is not the
    // code up here: the record's own art is on the page and still is, and
    // pressing that is where the address comes from.
    <button
      type="button"
      className="ln-crown"
      onClick={backToTheRecord}
      aria-label={`Back to ${entry.album}`}
    >
      <span className="ln-crown-art" aria-hidden="true">
        {coverSrc ? <img src={coverSrc} alt="" /> : <span className="ln-crown-none">♪</span>}
      </span>
      <span className="ln-crown-hole" aria-hidden="true" />
      <span className="ln-crown-said">
        {/* A long record name scrolls rather than eating the row. There is a
            cover to its left and a score and three marks to its right, and
            past those the tools — so what is left for a title is about a
            hundred pixels, and a title that ellipsises at a hundred pixels
            is four letters and a full stop. The beacon's own marquee, which
            is where it came from. */}
        <MarqueeTitle text={entry.album} textClassName="ln-crown-album" />
        {entry.artist && <span className="ln-crown-artist">{entry.artist}</span>}
      </span>
      {/* The score and the marks come with it — Miyel, on losing them with
          the mini card: "maybe those can travel too." No glow and no burst:
          both belong to the score arriving on the album screen, and a
          firework going off beside somebody's reading on every scroll is the
          same argument that took them off the mini card. */}
      <span className="ln-crown-marks" aria-hidden="true">
        {displayRating > 0 && <StarRating rating={displayRating} size={11} glow={false} animate={false} />}
        <span className="ln-crown-flags">
          {(entry.favorite === true || entry.favorite === 'true') && (
            <span className="ln-crown-flag" style={{ color: 'var(--fav, #f0484f)' }}><Heart size={12} weight="fill" /></span>
          )}
          {isMasterpiece && (
            <span className="ln-crown-flag" style={{ color: 'var(--mp, #4a9bf0)' }}><SketchLogo size={12} weight="fill" /></span>
          )}
          {isFormative && (
            <span className="ln-crown-flag" style={{ color: 'var(--formative, #3fa96b)' }}><Fingerprint size={12} weight="bold" /></span>
          )}
        </span>
      </span>
    </button>
  );

  return (
    <div
      className={'ln-entry' + (scrolled ? ' ln-entry--scrolled' : '') + (crowning ? ' ln-entry--crowning' : '')}
      style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--ink)', fontFamily: fonts.sans }}
    >

      {/* ── NAV ── shared site nav (logo + tools + lights), identical to
          every other public page. On the layer it is rendered into the
          layer's own header slot, outside the content that turns with a
          swipe, so the mark and the tools hold still while the record
          beneath them changes. The slot wears this page's classes so the
          band behind the row keeps working — see the effect below. */}
      {headerSlot
        ? createPortal(<SiteNav tools={keeperTools} mark={headerMark} lede={ledeDrawn} />, headerSlot)
        : <SiteNav tools={keeperTools} mark={headerMark} lede={ledeDrawn} />}

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
      <div ref={setBarSlot} />

      {/* The dial itself unfolds inside the track row it belongs to
          (TrackThread → TrackDial). Nothing is rendered here for it — but the
          page still has to know one is open, because a drag across the stars
          is a horizontal gesture and the layer would read it as a swipe to the
          next record. That is the .ln-busy below. */}

      {/* On phones this is the scroll container the two screens snap inside —
          the same arrangement as .hp-mobile-screens on the homepage. On
          desktop it has no height or overflow of its own, so everything below
          just falls back into normal document flow. */}
      <div
        className={'ln-screens' + (edit.editing ? ' ln-editing' : '') + (printing ? ' ln-printing' : '') + (sendering || sending || dialTrack !== null ? ' ln-busy' : '') + (sendering ? ' ln-crediting' : '') + (trailOpen ? ' ln-sent-open' : '')}
        data-ground={printing ? ground : undefined}
        data-size={printing ? size : undefined}
        onTouchStart={printing ? onGroundTouchStart : undefined}
        onTouchEnd={printing ? onGroundTouchEnd : undefined}
      >
      {/* ── SCREEN ONE (phones) ── a full screen of album: art up top, then the
          title, artist, year, rating and qualifiers centred beneath it. The
          desktop hero below is the same information in a different shape.
          Printing, it is the paper: the shape of the size picked, the ground
          inside it, and the card scaled to fit (.ln-print-stack and
          .ln-print-card are display: contents until then). */}
      <section className="ln-screen-one" style={printing ? { '--print-ratio': FRAMES[size].w / FRAMES[size].h } : undefined}>
        {printing && (
          <div className={'ln-print-ground' + (ground === 'record' ? '' : ' ln-print-ground--plain')} aria-hidden="true">
            {ground === 'record' && entry.album_art && <img src={entry.album_art} alt="" />}
          </div>
        )}
        {printing && press.picture && (
          /* The finished picture, for a phone with no share sheet: hold it to
             add it to Photos (iOS's own callout), tap it to come back. */
          <img className="ln-print-out" src={press.picture} alt="Your print" onClick={press.dismissPicture} />
        )}
        <div className="ln-print-stack" ref={printStackRef}>
        <div className="ln-print-card" ref={printCardRef} style={printing ? { '--print-scale': printScale } : undefined}>
        {printing && (
          /* The card's own mark, at the head, as the print has it — the nav's
             is the page's furniture and outside the paper. The fourth copy
             of these paths on the site; each surface states its own. */
          <svg
            viewBox="76 96 241 140"
            className="ln-print-mark"
            xmlns="http://www.w3.org/2000/svg"
            role="button"
            tabIndex={0}
            aria-label={shown.liveDot ? 'The mark, its dot lit — tap for ink' : 'The mark — tap to light its dot'}
            onClick={() => { learn(); setPrintChoices(c => ({ ...c, liveDot: !shown.liveDot })); }}
          >
            <path transform="translate(73.734177, 220.794814)" d="M 44.65625 0 C 37.46875 0 31.160156 -1.601562 25.734375 -4.8125 C 20.304688 -8.019531 16.097656 -12.28125 13.109375 -17.59375 C 10.128906 -22.90625 8.640625 -28.773438 8.640625 -35.203125 L 8.640625 -116.21875 L 36.53125 -116.21875 L 36.53125 -33.203125 C 36.53125 -30.546875 37.46875 -28.222656 39.34375 -26.234375 C 41.226562 -24.242188 43.550781 -23.25 46.3125 -23.25 L 77.03125 -23.25 L 77.03125 0 Z M 44.65625 0 " />
            <path transform="translate(153.915942, 220.794814)" d="M 91.96875 2 C 85 2 78.742188 0.476562 73.203125 -2.5625 C 67.671875 -5.613281 63.300781 -9.847656 60.09375 -15.265625 C 56.882812 -20.691406 55.28125 -26.835938 55.28125 -33.703125 L 55.28125 -84.5 C 55.28125 -86.269531 54.835938 -87.875 53.953125 -89.3125 C 53.066406 -90.75 51.90625 -91.910156 50.46875 -92.796875 C 49.03125 -93.679688 47.425781 -94.125 45.65625 -94.125 C 43.882812 -94.125 42.28125 -93.679688 40.84375 -92.796875 C 39.40625 -91.910156 38.269531 -90.75 37.4375 -89.3125 C 36.601562 -87.875 36.1875 -86.269531 36.1875 -84.5 L 36.1875 0 L 8.96875 0 L 8.96875 -82.515625 C 8.96875 -89.484375 10.539062 -95.625 13.6875 -100.9375 C 16.84375 -106.25 21.21875 -110.453125 26.8125 -113.546875 C 32.40625 -116.648438 38.6875 -118.203125 45.65625 -118.203125 C 52.738281 -118.203125 59.046875 -116.648438 64.578125 -113.546875 C 70.109375 -110.453125 74.476562 -106.25 77.6875 -100.9375 C 80.90625 -95.625 82.515625 -89.484375 82.515625 -82.515625 L 82.515625 -31.703125 C 82.515625 -29.929688 82.957031 -28.300781 83.84375 -26.8125 C 84.726562 -25.320312 85.859375 -24.160156 87.234375 -23.328125 C 88.617188 -22.492188 90.144531 -22.078125 91.8125 -22.078125 C 93.582031 -22.078125 95.210938 -22.492188 96.703125 -23.328125 C 98.203125 -24.160156 99.394531 -25.320312 100.28125 -26.8125 C 101.164062 -28.300781 101.609375 -29.929688 101.609375 -31.703125 L 101.609375 -116.21875 L 128.65625 -116.21875 L 128.65625 -33.703125 C 128.65625 -26.835938 127.050781 -20.691406 123.84375 -15.265625 C 120.632812 -9.847656 116.265625 -5.613281 110.734375 -2.5625 C 105.203125 0.476562 98.945312 2 91.96875 2 Z M 91.96875 2 " />
            <circle cx="297.0547" cy="216.71875" r="14.1328" className={shown.liveDot ? 'ln-print-mark-dot--live' : undefined} />
          </svg>
        )}
        {printing && keeperName && (
          <div className={'ln-print-line ln-print-keeper' + (shown.keeper ? '' : ' ln-off')} onClick={() => leaveOff('keeper')} role="button" tabIndex={0} title="Tap to leave this off the print">
            {keeperName}
          </div>
        )}
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
        ) : entry.album_art && canTurnCover ? (
          /* decoding="sync": on the layer this image replaces an identical
             one the wait state drew, and an async decode of a new element
             is a frame with no cover in it — the blink at the moment the
             entry lands. Synchronous, from the cache, it paints in the
             same frame the old one leaves. */
          <CodeSlot
            key={entry.slug}
            className="ln-screen-one-art ln-cover"
            picture={<img src={entry.album_art} alt={entry.album} decoding="sync" fetchPriority="high" />}
            {...coverSlot}
          />
        ) : entry.album_art && (
          <div className="ln-screen-one-art">
            <img src={entry.album_art} alt={entry.album} decoding="sync" fetchPriority="high" />
          </div>
        )}
        {coverField}
        {edit.editing
          ? <div className="ln-screen-one-title" style={{ fontSize: titleSize }}>{titleField}</div>
          : (
            <h1
              className={'ln-screen-one-title' + (printing ? ' ln-print-line' : '') + (printing && !shown.title ? ' ln-off' : '')}
              style={{ fontSize: titleSize }}
              onClick={printing ? () => leaveOff('title') : undefined}
            >
              {entry.album}
            </h1>
          )}
        <div
          className={'ln-screen-one-artist' + (printing ? ' ln-print-line' : '') + (printing && !shown.artist ? ' ln-off' : '')}
          onClick={printing ? () => leaveOff('artist') : undefined}
        >
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
          /* display: flex, so the box is the stars' 24px and not a 38px text
             line with the stars sitting on it — the stand-in draws the
             stars bare, and the 14px of slack was the chips and the date
             dropping when the entry landed over the journal (2026-09-15). */
          <div className={(printing ? 'ln-print-line' : '') + (printing && !shown.stars ? ' ln-off' : '')} style={{ display: 'flex', justifyContent: 'center' }} onClick={printing ? () => leaveOff('stars') : undefined}>
            <StarRating rating={displayRating} size={24} glow={isMasterpiece} animate={!alreadyShown} burst={isMasterpiece && !alreadyShown} />
          </div>
        )}
        {edit.editing && flagFields}
        <div
          className={'ln-screen-one-chips' + (printing ? ' ln-print-line' : '') + (printing && !shown.chips && !shown.symbols ? ' ln-off' : '')}
          onClick={printing ? cycleMarks : undefined}
        >
          {printing && shown.symbols ? (
            /* The marks as the feed's symbols — the second of the three
               states a tap cycles through while printing. */
            <>
              {(entry.favorite === true || entry.favorite === 'true') && <span className="ln-print-symbol" style={{ color: 'var(--fav, #f0484f)' }}><Heart size={34} weight="fill" aria-label="Favorite" /></span>}
              {isMasterpiece && <span className="ln-print-symbol" style={{ color: 'var(--mp, #4a9bf0)' }}><SketchLogo size={34} weight="fill" aria-label="Masterpiece" /></span>}
              {isFormative && <span className="ln-print-symbol" style={{ color: 'var(--formative, #3fa96b)' }}><Fingerprint size={34} weight="bold" aria-label="Formative" /></span>}
              {listenLabel && <Chip>{listenLabel}</Chip>}
            </>
          ) : (
            <>
              {!edit.editing && listenLabel && <Chip>{listenLabel}</Chip>}
              {!edit.editing && !printing && sentChip}
              {!edit.editing && (entry.favorite === true || entry.favorite === 'true') && <Chip tone="fav">Favorite</Chip>}
              {!edit.editing && isMasterpiece && <Chip tone="mp">Masterpiece</Chip>}
              {/* The third flag, missing from this row since the row was
                  written. Chip has carried a formative tone the whole time
                  and nothing ever passed it. */}
              {!edit.editing && isFormative && <Chip tone="formative">Formative</Chip>}
            </>
          )}
        </div>
        {sentLine}
        <div className="ln-screen-one-posted" style={{ fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
          Posted {postedOn}
        </div>
        {printing && (horizonBars.length > 0 || parsedTracks.some(t => t.stars > 0)) && (
          <div className={'ln-print-line ln-print-horizon' + (shown.horizon ? '' : ' ln-off')} onClick={() => leaveOff('horizon')} title="Tap to leave this off the print">
            <HorizonChart
              tracks={parsedTracks.map(t => ({ title: t.name, number: t.num, favorite: t.favorite }))}
              trackRatings={parsedTracks.map(t => Number(t.stars) || 0)}
              height={52}
              color="color-mix(in srgb, var(--ink) 50%, transparent)"
              emptyColor="color-mix(in srgb, var(--ink) 12%, transparent)"
              animate={false}
            />
          </div>
        )}
        </div>
        </div>
        {/* Down to the notes — or, when there are none, a wobble in place.
            See `nothingBelow` above for why the screen it points at is not
            drawn at all in that case. The answer is the same to a finger and
            to a keyboard, so both go through `down`. */}
        <div
          className={'ln-scroll-cue' + (nothingBelow ? ' ln-scroll-cue--none' : '') + (wobble ? ' ln-scroll-cue--wobble' : '')}
          role="button"
          tabIndex={0}
          aria-label={nothingBelow ? 'Nothing written about this listen' : 'Scroll to the notes'}
          title={nothingBelow ? 'Nothing written about this listen' : undefined}
          onClick={down}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); down(); } }}
          onAnimationEnd={() => setWobble(false)}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
        {printing && (
          <PrintBar
            grounds={GROUNDS}
            ground={ground}
            onGround={key => setPrintChoices(c => ({ ...c, ground: key }))}
            size={size}
            onSize={key => setPrintChoices(c => ({ ...c, size: key }))}
            onSave={() => press.save(size)}
            onDone={finishPrinting}
            status={press.status || (learned || press.picture ? '' : PRINT_HINT)}
            final={Boolean(press.picture)}
            onBack={press.dismissPicture}
            onDeliver={press.deliver}
            canDeliver={press.canDeliver}
          />
        )}
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
            ) : entry.album_art && canTurnCover ? (
              /* Unclipped while the code shows: the Copied pill is wider
                 than the thumbnail, and the box's corners are kept by the
                 picture and the plate themselves. */
              <CodeSlot
                key={entry.slug}
                className="ln-cover"
                style={{ ...(coverCode ? { ...HERO_COVER_CODE, overflow: 'visible' } : HERO_COVER), ...HERO_COVER_EASE }}
                picture={<img src={entry.album_art} alt={entry.album} />}
                {...coverSlot}
              />
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
                {!edit.editing && sentChip}
                {!edit.editing && (entry.favorite === true || entry.favorite === 'true') && <Chip tone="fav">Favorite</Chip>}
              </div>
              {/* Under the chips here as on the phone. The panel this replaced
                  could not sit in the hero — .ln-hero is a fixed 390px with
                  its content anchored to the bottom and clipped, so a 90px
                  card added in here grew upward and pushed the album title
                  behind the mark, and it went under the hero instead. A line
                  is the weight of the posted date already below it, and the
                  column runs to about 150px of the 354 it has. */}
              <div className="ln-sent-desk">{sentLine}</div>
              <div style={{ fontFamily: fonts.mono, fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--ink-faint)', marginTop: '12px' }}>
                Posted {postedOn}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* The cover's address field, under the hero rather than inside it.
          .ln-hero is a fixed 390px with its content anchored to the bottom
          and clipped, so anything added in there grows upward and pushes the
          album title behind the header. Phones use the copy on screen one;
          this one is hidden there, or both would show. */}
      <div className="ln-cover-hero">{coverField}</div>

      {/* ── SCREEN TWO ── on phones this is the second snap screen: the header
          stays put at the top while everything below scrolls inside it, the
          way Recent Listens does on the homepage. On desktop it is a plain
          wrapper and the page scrolls normally. */}
      {!nothingBelow && (
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
            failure this whole section exists to fix.
            And always while a correction is open, from 2026-09-18 — "we need a
            place to add album notes if someone decides in edit when saved
            without any as well." A listen can be saved with nothing written
            since this morning, so the one section that only existed once there
            was writing had become the one you could never start. Same shape as
            the ghost tracks below it: reading shows what was said, correcting
            shows where it goes. */}
        {(albumNotes || albumComments.length > 0 || edit.editing) && (
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
        {(saidTracks > 0 || horizonBars.length > 0 || (edit.editing && parsedTracks.length > 0)) && (
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
              {parsedTracks.map((t, i) => {
                // Nothing said about it and nothing being corrected: the row
                // is not drawn, and the index it would have had stays with it.
                if (!edit.editing && !said(t)) return null;
                return (
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
                  onOpenDial={setDialTrack}
                  dialOpen={dialTrack === i}
                  preview={preview}
                />
                );
              })}
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
        {/* The foot of an entry is bare while it is being corrected too, from
            2026-09-18. It had a rule across it, a caret back to the journal
            and an arrow to the top — kept for editing on 2026-09-17 when they
            came off the reading view, on the reasoning that a correction
            needs a way to end it.

            It does not: the editing bar is fixed at the foot of the screen
            with Save and Cancel on it, and it follows you down the page, so
            those two were a second way out placed where you would only find
            it by scrolling past everything. Miyel, from her phone: "in edit
            mode there are some stale carats, glyphs, and extra lines at the
            bottom of the entry." Stale is the word — they were left behind by
            a decision that had already been made. */}

        {/* No lineage picker here, and since 2026-09-15 no lineage rules
            behind it either: the column is parked, because an entry id
            means nothing in another copy's database. Who sent a record is
            the credit at the head of this page, and the trail a reader
            walks is SentBy.js. See database_actions.js, above the slugs. */}
        {/* The delete warning stood here until 2026-09-18 and nothing raises
            it any more: Delete asks on the ··· itself now, in two presses,
            rather than opening a correction with this waiting at the foot of
            it (see onDelete above, and the note on the tool in
            KeeperTools.js). What went with it is the sentence — that the only
            way back is a restored backup. That is a real loss and it is
            recorded here rather than pretended away; what the two presses
            keep is the part that was doing the work, which is that the act
            cannot be reached by reflex. */}

      </div>

      </div>{/* .ln-screen-two-scroll */}
      </section>
      )}{/* .ln-screen-two */}

      </div>{/* .ln-screens */}

      {/* The send sheet, at the foot of the page rather than inside the tools
          that opened it: the ··· files itself away the moment one is pressed,
          and a sheet mounted inside it would go with it. */}
      <SendSheet
        open={sending}
        onClose={() => setSending(false)}
        record={{
          album: entry.album,
          artist: entry.artist,
          year: entry.year || '',
          album_art: entry.album_art || '',
          collection_id: entry.collection_id || '',
          slug: entry.slug,
        }}
      />
    </div>
  );
}
