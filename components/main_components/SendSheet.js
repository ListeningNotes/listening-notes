// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// components/main_components/SendSheet.js
// One send sheet: a thing, an arrow, a person.
//
// ── Why one ───────────────────────────────────────────────────────────────
// There were four or five send screens and they all looked different — a
// sheet from a record's tools, a sheet from a friend's doors, each a two-step
// wizard rising from the foot with a chooser of its own. Miyel's brief of
// 2026-09-26 replaces them with one popup and three doors: an entry's tools,
// a track row in the middle of a listen, and a person in the book. Nothing
// about the sheet varies by door except which square starts full — which is
// also what absorbed the friends-tab send bug: under this shape a send from
// a person is just "the right square arrives full", not a screen of its own
// with a pre-filled state of its own.
//
// ── The shape ─────────────────────────────────────────────────────────────
// Two squares with an arrow between them, centred on the screen:
//
//     [ thing ]  →  [ person ]
//
// The order never flips — thing left, person right, the arrow pointing right —
// so it reads as the sentence it is: Shrines → Lacey. Person-first would read
// as Lacey sending it. Whichever square is empty is the instruction; there is
// no title and no mode name, which is why the sheet needs no explaining from
// any door. A blank square borrows the corner radius of what it is waiting
// for (8, sharp like a sleeve; 18, soft like the rounded-square face), so it
// says what goes in it before the label is read. A song arrives already
// dog-eared, the same folded-corner page the wall uses for a track note. The
// arrow is the readiness signal: faint while either square is empty, ink when
// both are full — instead of a disabled button, which would have to explain
// itself. Tap a filled square to empty it; the shelf swaps back to that
// square's chooser, and it is the same tap as filling a blank one.
//
// ── Why a popup, when almost nothing here is one ──────────────────────────
// DECISIONS has controls opening where they belong rather than over a dimmed
// screen. This is the one popup in the app, and that is deliberate: it is the
// only screen about two things meeting rather than one thing you are doing,
// and neither of the two has a place on the page the other could unfold in.
// A centred popup rather than a sheet rising from the bottom, and an × in its
// corner rather than a pull: a pull is a sheet's gesture, and this is not one.
//
// ── The shelf ─────────────────────────────────────────────────────────────
// The bottom half, and it holds no chooser of its own. Left square blank: the
// session's own picker — search, recent, albums, tracks — so a song is
// sendable from every door, the friends pane included; restricting songs in
// one place would be the inconsistency this whole change deletes. Right
// square blank: the book as a grid of faces, four across, scrolling when it
// is long, a count line at its foot. Both full: the message, the quiet
// switch and the button — the existing pieces, reused rather than rebuilt.
//
// ── The letter ────────────────────────────────────────────────────────────
// Pressing Send replaces the popup with a letter seen from the front: the
// record as a perforated stamp, the address block, and no way to dismiss it.
// It holds for a beat and slides down off the screen on its own. **No
// journal address ever appears on it** — the shape will invite one forever,
// and it does not get one (DECISIONS, 2026-09-12: no address is ever printed
// on a page). This is the only place the envelope appears in the flow: during
// the choosing it would be decoration; at the moment of sending it is true.
//
// ── Nothing typed is ever lost ────────────────────────────────────────────
// The message is kept in the browser and put back when the sheet opens again,
// under its own key; a send that fails keeps everything and says so. Nothing
// is confirmed on the way out — a dialog asking whether you meant it taxes
// every deliberate dismiss to catch a rare accident.

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, EnvelopeSimple, Plus, User, X } from '@phosphor-icons/react';
import AlbumPicker from '../session_components/AlbumPicker';
import MiniAddressBook from './MiniAddressBook';
import { journalUrl } from '../../library/return_address';

// Its own key, beside the send page's `ln-send-draft`. Separate on purpose:
// they are two different messages to two different people, and one standing
// in for the other would be worse than losing either.
const DRAFT_KEY = 'ln-outbox-draft';

// How long the letter holds before it goes, and how long the going takes —
// .sn-letter--going in forms.css keeps the second number.
const LETTER_HOLD_MS = 1500;
const LETTER_GO_MS = 520;

// A thing to send, read into one shape from wherever it came — an entry's
// row, the session's record, or either of the picker's two answers — rather
// than in four places below.
function asThing(record) {
  if (!record) return null;
  return {
    album: record.album || '',
    artist: record.artist || '',
    year: record.year || '',
    art: record.album_art || record.artUrl || record.art || '',
    collectionId: record.collection_id || record.collectionId || '',
    // A song rather than a record: the sheet draws it dog-eared, and the send
    // carries the word (migrations/026_track_sends.sql).
    song: record.song || '',
    // Only when the send started on a record's own page. A record found by
    // searching is not an entry and has no slug to carry.
    slug: record.slug || '',
  };
}

function asPerson(person) {
  if (!person) return null;
  return { id: person.id, name: person.name || '', address: person.address || '' };
}

// ── The letter ─────────────────────────────────────────────────────────────
// A landscape envelope, roughly 330 by 238 — paper proportions, not app
// proportions, so the change of shape is itself the confirmation. The record
// is the stamp, top right: a paper square a touch brighter than the envelope
// so it reads as stuck on, with real scallops cut into its edge — nine
// semicircular notches a side, cut by a mask so they are crisp at any
// density, not a dashed border — and the art printed inside the paper margin
// with square corners. The address block is written across the middle left,
// stacked the way an address is: ON ITS WAY TO, the name large, the record.
// Nothing to press; it leaves on its own.
function SentLetter({ to, thing, going }) {
  // A mask needs an id and React's carry punctuation a `url(#…)` cannot.
  const maskId = 'sn-stamp-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  // Nine notches a side on a 104-unit square: one every 104/9 units, the
  // radius about a third of that, so they read as scallops rather than a
  // dotted line. The corners are left whole.
  const pitch = 104 / 9;
  const notches = [];
  for (let i = 0; i < 9; i++) {
    const c = pitch * (i + 0.5);
    notches.push([c, 0], [c, 104], [0, c], [104, c]);
  }
  return (
    <div className={'sn-letter' + (going ? ' sn-letter--going' : '')} role="status" aria-live="polite">
      <div className="sn-stamp" aria-hidden="true">
        <svg className="sn-stamp-paper" viewBox="0 0 104 104">
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse">
              <rect width="104" height="104" fill="#fff" />
              {notches.map(([x, y], k) => <circle key={k} cx={x} cy={y} r={3.7} fill="#000" />)}
            </mask>
          </defs>
          <rect width="104" height="104" fill="currentColor" mask={`url(#${maskId})`} />
        </svg>
        {thing.art
          ? <img className="sn-stamp-art" src={thing.art} alt="" />
          : <span className="sn-stamp-art sn-stamp-art--none" />}
      </div>
      <div className="sn-address">
        <span className="sn-address-way">On its way to</span>
        <span className="sn-address-name">{to}</span>
        <span className="sn-address-what">{thing.song || thing.album} &middot; {thing.artist}</span>
      </div>
    </div>
  );
}

// `record` is the thing already chosen, in an entry's vocabulary (album_art,
// collection_id, slug, and `song` for a track note or a track row);
// `person` is the person already chosen, as /api/people returns them. Either,
// neither, never both. `foot` is one line under the shelf — the session says
// "Your session stays open behind this".
export default function SendSheet({ open, onClose, person = null, record = null, foot = '' }) {
  const [people, setPeople] = useState(null);   // null until the book has answered
  const [thing, setThing] = useState(null);     // the left square
  const [who, setWho] = useState(null);         // the right square
  // Which blank the shelf answers while both are blank. The left is lit by
  // default and pressing the right blank lights that one instead; once one
  // is filled the other is the only question and this is not read.
  const [asking, setAsking] = useState('what');
  const [note, setNote] = useState('');
  const [quiet, setQuiet] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(null);       // { to, thing } once it has gone
  const [going, setGoing] = useState(false);    // the letter on its way off the screen
  const noteRef = useRef(null);
  const roomRef = useRef(null);
  const shelfRef = useRef(null);
  // How many faces are below the fold of the book's shelf, for the count
  // line at the popup's foot; 0 while they all fit.
  const [past, setPast] = useState(0);
  // The cursor lands in the note once per opening, the moment the sheet stops
  // asking — see the layout effect below.
  const wrote = useRef(false);
  // The parent hands a fresh arrow function every render, and the letter's
  // timers must not restart because the session behind this autosaved.
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  // ── What the door handed in ─────────────────────────────────────────────
  // Read on the way in, and only then: the squares are state from here so a
  // handed-in thing can be tapped away like any other. Quiet starts off every
  // time (Miyel, 2026-09-19: a quiet send that remembered itself made every
  // later send quiet until it was noticed) — public credit is the default and
  // quiet is a decision about one send. The note is work, and is kept.
  useEffect(() => {
    if (!open) return;
    setThing(asThing(record));
    setWho(asPerson(person));
    setAsking('what');
    let kept = null;
    try { kept = JSON.parse(window.localStorage.getItem(DRAFT_KEY) || 'null'); } catch { /* private window */ }
    setNote(kept?.note || '');
    setQuiet(false);
    setSent(null);
    setGoing(false);
    setError('');
    setSending(false);
    // The door's props are read once, when it opens; a re-render of the door
    // must not put a tapped-away square back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // The book, once, the first time the sheet is opened. It is the owner's own
  // route and a few hundred bytes; asking on every open would be a read per
  // press of a glyph that gets pressed a lot.
  useEffect(() => {
    if (!open || people !== null) return;
    fetch('/api/people')
      .then(r => (r.ok ? r.json() : null))
      .then(d => setPeople(Array.isArray(d?.people) ? d.people : []))
      .catch(() => setPeople([]));
  }, [open, people]);

  // Written on every change rather than on the way out, because there is no
  // reliable way out to hang it on — a tab can be killed, a phone can lock.
  // The note and nothing else: the squares come from a press, and quiet is a
  // decision about this send rather than a setting.
  useEffect(() => {
    if (!open) return;
    try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ note })); } catch { /* private window */ }
  }, [open, note]);

  const shut = useCallback(() => { setError(''); closeRef.current?.(); }, []);

  // Which chooser the shelf holds: '' once nothing is left to ask. Read here,
  // above the hooks that depend on it.
  const picking = !thing && !who ? asking : !thing ? 'what' : !who ? 'who' : '';
  const book = people || [];

  // ── The count at the foot of a long book ────────────────────────────────
  // Measured rather than assumed: the line says how many faces are past the
  // shelf's fold, and says nothing while they all fit — a count of "more"
  // above a grid you can see the whole of would be a lie. Rows cost what a
  // row costs on this phone, read off a real face.
  useLayoutEffect(() => {
    if (!open || picking !== 'who') { setPast(0); return undefined; }
    const shelf = shelfRef.current;
    if (!shelf) return undefined;
    const reckon = () => {
      const grid = shelf.querySelector('.ln-sender-book');
      const face = grid?.querySelector('.ln-sender-face');
      if (!grid || !face || shelf.scrollHeight - shelf.clientHeight <= 4) { setPast(0); return; }
      const gap = parseFloat(getComputedStyle(grid).rowGap) || 0;
      const row = face.offsetHeight + gap;
      const above = grid.getBoundingClientRect().top - shelf.getBoundingClientRect().top + shelf.scrollTop;
      const rows = Math.max(1, Math.floor((shelf.clientHeight - above + gap) / row));
      setPast(Math.max(0, book.length - rows * 4));
    };
    reckon();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const watch = new ResizeObserver(reckon);
    watch.observe(shelf);
    return () => watch.disconnect();
  }, [open, picking, book.length]);

  // ── The band steps down while this is up ────────────────────────────────
  // The cross sizes itself to the part of the window you can see, so a
  // keyboard walks the four doors up the screen until they are sitting between
  // this and the keys. An attribute and not a class: the cross's class
  // attribute is React's and is rewritten whole on every render of HomeNav
  // (2026-09-21); an attribute React does not render is never touched.
  useEffect(() => {
    if (!open) return undefined;
    const cross = document.querySelector('.hn');
    cross?.toggleAttribute('data-sending', true);
    return () => cross?.removeAttribute('data-sending');
  }, [open]);

  // ── The keyboard, and where the visible window actually is ──────────────
  // A fixed box is fixed to the layout viewport, which on iOS does not move
  // when the keyboard comes up; the part you can see does. So the room the
  // popup is centred in is inset to visualViewport every time, with no test
  // for whether a keyboard is up: the insets are zero whenever nothing is
  // covering the screen, so applying them always is the same as never, right
  // up until it matters. LayerEntry's note has what a threshold costs.
  useEffect(() => {
    if (!open) return undefined;
    const vv = window.visualViewport;
    const room = roomRef.current;
    if (!vv || !room) return undefined;
    const sync = () => {
      room.style.setProperty('--sn-top', `${Math.max(0, Math.round(vv.offsetTop))}px`);
      room.style.setProperty('--sn-room', `${Math.round(vv.height)}px`);
    };
    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
    };
  }, [open]);

  // Escape closes, like every other layer here — and only this. The entry and
  // the session under it close on Escape too (LayerEntry), so the key is
  // taken here first, in the capture phase, and goes no further: one press
  // closes the thing on top, not everything at once.
  useEffect(() => {
    if (!open) return undefined;
    const key = e => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      if (!sent) shut();
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [open, sent, shut]);

  // ── The cursor follows the step ─────────────────────────────────────────
  // Both squares full is the end of choosing, so the next thing to do is
  // write. A layout effect, because iOS only raises the keyboard for a focus
  // that happens inside the tap that caused it — press a face and the browser
  // allows the page a moment; an ordinary effect runs after the paint, which
  // is outside it (Miyel, 2026-09-21: the keyboard should already be ready).
  // Once per opening, so tapping a square away and refilling it does not
  // steal the cursor while you are still looking at the covers.
  useLayoutEffect(() => {
    if (!open) { wrote.current = false; return; }
    if (!(thing && who) || sent || wrote.current) return;
    wrote.current = true;
    noteRef.current?.focus({ preventScroll: true });
  }, [open, thing, who, sent]);

  // ── The letter's clock ──────────────────────────────────────────────────
  // It holds, goes, and closes the sheet behind it. Somebody who has asked for
  // less motion gets the hold and then the close, with no slide between.
  useEffect(() => {
    if (!sent) return undefined;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const hold = setTimeout(() => setGoing(true), LETTER_HOLD_MS);
    const gone = setTimeout(() => closeRef.current?.(), LETTER_HOLD_MS + (still ? 0 : LETTER_GO_MS));
    return () => { clearTimeout(hold); clearTimeout(gone); };
  }, [sent]);

  async function send(event) {
    event.preventDefault();
    if (!thing || !who) return;
    // The message is the reason somebody is being handed a record at all,
    // and every copy's inbox refuses a send without one. The label asks it
    // as a question; this is the answer when the question was skipped.
    if (!note.trim()) { setError('Say something about it — that is the part that matters.'); return; }
    setError('');
    setSending(true);
    try {
      const answer = await fetch('/api/outbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_id: who.id,
          album: thing.album, artist: thing.artist, year: thing.year,
          album_art: thing.art, collection_id: thing.collectionId,
          note, quiet,
          sender_entry: thing.slug,
          song: thing.song,
        }),
      });
      const data = await answer.json().catch(() => null);
      if (!data?.ok) {
        // Their copy said no, or never answered. Everything typed stays where
        // it is and the sheet stays open: this is the moment the whole
        // never-eat-a-message rule was written for.
        setError(data?.error || 'Something went wrong. Nothing was sent.');
        return;
      }
      try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* private window */ }
      setNote('');
      setSent({ to: who.name || 'them', thing });
    } catch {
      setError('Something went wrong here, not at their end. Nothing was sent.');
    } finally {
      setSending(false);
    }
  }

  if (!open || typeof document === 'undefined') return null;

  const ready = Boolean(thing && who);
  const hidePortrait = e => { e.currentTarget.style.display = 'none'; };

  // Through a portal onto the body, so the popup is centred on the screen and
  // not on whichever pane, layer or session opened it — a fixed box inside a
  // transformed ancestor is fixed to that ancestor, and the cross has several.
  return createPortal(
    <>
      {/* touch-action: none in the stylesheet, so a drag on the dim cannot pan
          the page behind it. A tap on it closes the popup; not the letter,
          which has no dismiss and is already leaving. */}
      <div className={'sn-scrim' + (going ? ' sn-scrim--going' : '')} onClick={sent ? undefined : shut} aria-hidden="true" />
      <div className="sn-room" ref={roomRef}>
        {sent ? (
          <SentLetter to={sent.to} thing={sent.thing} going={going} />
        ) : (
          <section
            className={'sn-popup' + (picking ? ' sn-popup--picking' : '')}
            role="dialog"
            aria-modal="true"
            aria-label="Send this to somebody"
          >
            <button type="button" className="sn-shut" onClick={shut} aria-label="Close">
              <X size={18} weight="regular" aria-hidden="true" />
            </button>

            {/* ── The two squares and the arrow ───────────────────────────
                Each square is one control that does both jobs: blank, it
                says what it is waiting for and lights the shelf that fills
                it; full, it shows what is in it and a tap empties it. */}
            <div className="sn-pair">
              <button
                type="button"
                className={'sn-slot sn-slot--what' + (thing ? ' sn-slot--full' : picking === 'what' ? ' sn-slot--lit' : '')}
                onClick={() => { if (thing) { setThing(null); setError(''); } else setAsking('what'); }}
                aria-label={thing ? `${thing.song || thing.album} — tap to choose something else` : 'Choose an album or song'}
              >
                <span className={'sn-slot-box' + (thing?.song && thing.art ? ' ln-fold' : '')}>
                  {thing
                    ? (thing.art ? <img src={thing.art} alt="" onError={hidePortrait} /> : <span className="sn-slot-none" aria-hidden="true" />)
                    : <Plus size={26} weight="light" aria-hidden="true" />}
                  {/* The fold, for a song: the same flap a track note wears
                      on the wall, in the cover's own colour (.ln-fold-flap). */}
                  {thing?.song && thing.art && (
                    <span className="ln-fold-flap" aria-hidden="true"><img src={thing.art} alt="" /></span>
                  )}
                </span>
                {thing ? (
                  <>
                    <span className="sn-slot-name">{thing.song || thing.album}</span>
                    <span className="sn-slot-sub">{thing.artist}</span>
                  </>
                ) : (
                  <span className="sn-slot-ask">Album<br />or song</span>
                )}
              </button>

              <ArrowRight
                className={'sn-arrow' + (ready ? ' sn-arrow--ready' : '')}
                size={22}
                weight={ready ? 'bold' : 'regular'}
                aria-hidden="true"
              />

              <button
                type="button"
                className={'sn-slot sn-slot--who' + (who ? ' sn-slot--full' : picking === 'who' ? ' sn-slot--lit' : '')}
                onClick={() => { if (who) { setWho(null); setError(''); } else setAsking('who'); }}
                aria-label={who ? `${who.name || who.address} — tap to choose somebody else` : 'Choose who it is for'}
              >
                <span className="sn-slot-box">
                  {who ? (
                    <>
                      {/* The plain mark behind the picture, for a journal
                          with none or one that is out — as the book draws it. */}
                      <User size={26} weight="regular" aria-hidden="true" />
                      <img src={`${journalUrl(who.address)}/api/portrait`} alt="" onError={hidePortrait} />
                    </>
                  ) : <Plus size={26} weight="light" aria-hidden="true" />}
                </span>
                {who ? (
                  <>
                    <span className="sn-slot-name">{who.name || who.address}</span>
                    <span className="sn-slot-sub">In your book</span>
                  </>
                ) : (
                  <span className="sn-slot-ask">Choose who</span>
                )}
              </button>
            </div>

            <div className="sn-rule" aria-hidden="true" />

            {picking === 'what' ? (
              // ── The picker, borrowed whole ──────────────────────────────
              // The session's own: search, recent, albums, tracks. Without
              // its drafts, which are unfinished listens and nothing to do
              // with a send. A tap on a cover or a song fills the square.
              <div className="sn-shelf sn-shelf--what">
                <AlbumPicker
                  inline
                  noDrafts
                  onPick={album => { setThing(asThing(album)); setError(''); }}
                  onResume={() => {}}
                  onPickSong={song => { setThing(asThing(song)); setError(''); }}
                />
              </div>
            ) : picking === 'who' ? (
              // ── The book, as a grid ─────────────────────────────────────
              // The same faces the entry's Sent by draws, four across with
              // names, scrolling when the book is long. A press is the
              // answer that ends the step; it does not toggle.
              <div className="sn-shelf sn-shelf--who" ref={shelfRef}>
                <span className="sn-ask">Your book</span>
                {people === null ? null : book.length === 0 ? (
                  <p className="sn-empty">Nobody in your address book yet. Add somebody first — then you can send to them from here.</p>
                ) : (
                  <MiniAddressBook
                    people={book}
                    linked=""
                    onPick={p => { setWho(asPerson(p)); setError(''); }}
                    label="Who it is for"
                    verb="send"
                  />
                )}
              </div>
            ) : (
              // ── Both full: the message, the switch, the button ──────────
              // Miyel's wording, 2026-09-26. The switch and the button are
              // the pieces that already existed (.ln-switch, .sn-send) and
              // stay exactly as built: full width, black, an envelope, the
              // name in it.
              <form className="sn-form" onSubmit={send}>
                <label className="sn-group">
                  <span className="sn-ask">Add a message?</span>
                  <textarea
                    ref={noteRef}
                    className="sn-note"
                    rows={2}
                    value={note}
                    onChange={e => setNote(e.target.value)}
                    placeholder="Type your message here."
                    aria-label="A message to go with it"
                  />
                </label>
                <div className="sn-rule" aria-hidden="true" />
                <label className="sn-quiet">
                  <span>Send quietly so their entry won&rsquo;t credit you</span>
                  {/* The sender's choice, not the keeper's, and off by default:
                      public credit is the default and quiet is the choice
                      (DECISIONS). role="switch" on a real checkbox, so the
                      label and the keyboard still work. */}
                  <input
                    type="checkbox"
                    role="switch"
                    className="ln-switch"
                    checked={quiet}
                    onChange={e => setQuiet(e.target.checked)}
                  />
                </label>
                {error && <p className="sn-error">{error}</p>}
                <button type="submit" className="sn-send" disabled={sending}>
                  <EnvelopeSimple size={18} weight="fill" />
                  <span>{sending ? 'Sending…' : `Send to ${who.name || 'them'}`}</span>
                </button>
              </form>
            )}

            {/* At the popup's foot, under the shelf rather than at the end of
                its scroll: how many faces are past the fold, or the session's
                line, which wins when both apply. */}
            {picking && foot
              ? <p className="sn-foot-say">{foot}</p>
              : picking === 'who' && past > 0
                ? <p className="sn-more">{past} more in the book</p>
                : null}
          </section>
        )}
      </div>
    </>,
    document.body
  );
}
