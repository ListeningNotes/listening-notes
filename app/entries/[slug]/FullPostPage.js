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
import { CaretUp, Check, Fingerprint, Heart, SketchLogo, VinylRecord, X } from '@phosphor-icons/react';
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
import { entryPlate } from '../../../components/main_components/EntryPlate';
import { usePress } from '../../../hooks/usePress';
import { FRAMES, FRAME_ORDER } from '../../../components/main_components/SharePrinter';
import HorizonBar from '../../../components/main_components/Slug_Page/HorizonBar';
import TrackThread from '../../../components/main_components/Slug_Page/TrackThread';
import CommentBubble from '../../../components/main_components/Slug_Page/CommentBubble';
import MetadataLabel from '../../../components/main_components/Slug_Page/MetadataLabel';
import Chip from '../../../components/main_components/Slug_Page/Chip';
import SentBy, { creditOn, useTrail } from '../../../components/main_components/Slug_Page/SentBy';
import MiniAddressBook from '../../../components/main_components/MiniAddressBook';
import PrintBar from '../../../components/main_components/Slug_Page/PrintBar';
import HorizonChart from '../../../components/main_components/HorizonChart';
import MiniCard from '../../../components/main_components/Slug_Page/MiniCard';
import { handedOver } from '../../../library/handoff';
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

  // ── Who sent it ───────────────────────────────────────────────────────────
  // A fact about the record, so it sits up here with the title and the
  // flags rather than at the foot of the page (it was there until
  // 2026-09-14, under a heading that called it private — it is not, any
  // more: a Submission entry says "from Zach" to everyone).
  //
  // The name is picked off the address book where the sender is in it, so
  // the credit resolves to their journal and not only to a spelling: the
  // book's people are faces under the field — the portrait their journal
  // serves, the address book's rounded square, the name beneath — in one
  // row that scrolls sideways once there are more than fit, the way the
  // album strip does. A face is what a friend is recognised by (Miyel,
  // 2026-09-14: a pill saying Kai was not obviously Kailea), and one row
  // is what forty friends look like — a strip, not a wall. Typing narrows
  // it; the lit one is the journal the entry links to. Free text stays for
  // somebody who sent a record and keeps no copy.
  //
  // Typing does not unlink. His journal calls him Zachin_Off and the entry
  // can still say from Zach — tap his face, then write the name you use.
  // Tapping the lit face takes the link off and leaves the name; emptying
  // the name takes both off. And a record with a sender is a submission,
  // so naming one turns that shelf on if it was not already.
  const linkedTo = tidyJournal(edit.draft.received_from_url || '');
  const senderText = String(edit.draft.received_from ?? '');
  const sendBy = p => {
    if (p.address === linkedTo) {
      edit.set('received_from_url', '');
      return;
    }
    edit.set('received_from', p.name || p.address);
    edit.set('received_from_url', p.address);
    if (edit.draft.entry_type !== 'Submission') edit.set('entry_type', 'Submission');
  };
  const writeSender = value => {
    edit.set('received_from', value);
    if (!value.trim()) {
      edit.set('received_from_url', '');
    } else if (!senderText.trim() && edit.draft.entry_type !== 'Submission') {
      edit.set('entry_type', 'Submission');
    }
  };
  // Absent until the private fetch lands (useEntryEditor): a field drawn
  // before then would show empty and save empty over what is stored.
  const senderField = 'received_from' in edit.draft && (
    <span className="ln-sender">
      <label className="ln-sender-row">
        <span className="ln-sender-label">Sent by</span>
        <input
          className="ln-field ln-field--sender"
          value={senderText}
          onChange={e => writeSender(e.target.value)}
          placeholder="Nobody — I found it"
          autoComplete="off"
          aria-label="Sent by"
        />
      </label>
      <MiniAddressBook people={edit.book} linked={linkedTo} narrow={senderText} onPick={sendBy} />
      {/* Whether to publish who it came from. The sender answers this on the
          send form and it arrives already set (migrations/012), so this is
          for the case the form could not reach: a credit added by hand from
          the address book names somebody who was never asked, and somebody
          may have said so in person. Off means credited, because public
          credit is the default and quiet is the choice. */}
      {senderText.trim() && (
        <button
          type="button"
          className={'ln-flag' + (edit.draft.credit_private ? ' ln-flag--on' : '')}
          onClick={() => edit.set('credit_private', !edit.draft.credit_private)}
          aria-pressed={!!edit.draft.credit_private}
          title={edit.draft.credit_private
            ? 'Their name is kept off this record everywhere it is read'
            : 'Their name is published on this record, as credit'}
        >
          Don&rsquo;t credit them
        </button>
      )}
    </span>
  );

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
  const keeperTools = authed && !edit.editing && !printing && (
    <KeeperTools onEdit={edit.begin} slug={entry.slug} onPrint={() => { setPrinting(true); setLearned(false); }} />
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
      {senderField}
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
  const sentLine = credit && !edit.editing && !printing && (
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
      <div
        className={'ln-screens' + (edit.editing ? ' ln-editing' : '') + (printing ? ' ln-printing' : '') + (trailOpen ? ' ln-sent-open' : '')}
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

        {/* No lineage picker here, and since 2026-09-15 no lineage rules
            behind it either: the column is parked, because an entry id
            means nothing in another copy's database. Who sent a record is
            the credit at the head of this page, and the trail a reader
            walks is SentBy.js. See database_actions.js, above the slugs. */}
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
