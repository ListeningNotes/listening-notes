// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

// components/main_components/Friends.js
// The journals this keeper reads, as faces.
//
// From Miyel's friends brief of 2026-09-17, mock-ups f1, f2 and f4. It
// replaces the list of rows the address book has drawn since 2026-09-13: the
// same people, the same three things you can do about each of them, arranged
// so that the page is who you read rather than a table of addresses.
//
// ── Why faces and not rows ────────────────────────────────────────────────
// A row spends its width on controls — an envelope, Visit, remove — and gives
// the person whatever is left, which on a phone was 54px for a face and a
// name. A grid gives every person the same square and puts the controls away
// until one is chosen. It also scales: the brief's number is thirty people,
// and thirty rows is a scroll where thirty faces is a page.
//
// ── One open at a time, and it opens in place ─────────────────────────────
// Pressing a face does not navigate. The three doors unfold directly under
// the row that face is in, between two hairlines, and pressing the same face
// again closes them. Under *its* row rather than under the whole grid: the
// brief says under the pinned row and there is no pinned row yet, and a door
// twelve faces away from the face that opened it is a door about nothing.
//
// ── No pinning yet ────────────────────────────────────────────────────────
// The brief puts pinned people above everyone else, on a nullable timestamp
// and a migration. Miyel, 2026-09-19: "let's not add pinning friends yet,
// mostly just beta testers, we don't need it yet." So there is no column, no
// migration and no PINNED row, and the grid is everyone. When it arrives it
// is a second grid above this one and nothing here has to move.
//
// ── The address is never printed ──────────────────────────────────────────
// A person is a face and a name, which is the rule from 2026-09-12 and the
// one thing the old rows nearly broke. The one place an address shows is the
// offer below, where it is the fact being confirmed.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BookOpen, Camera, MagnifyingGlass, PaperPlaneTilt, Plus, Shuffle, User, X } from '@phosphor-icons/react';
import CodeScanner from './CodeScanner';
import SendSheet from './SendSheet';
import { carrySender, journalUrl, tidyJournal } from '../../library/return_address';
import { useBookplate } from './Bookplate';

// The order the server keeps: by name, or by address for anyone without one.
function inOrder(people) {
  const called = p => (p.name || p.address).toLowerCase();
  return [...people].sort((a, b) => called(a).localeCompare(called(b)));
}

// ── How many across ───────────────────────────────────────────────────────
// "Roughly: four across up to a dozen people, five across beyond that" (the
// brief). A dozen is where a grid stops being a glance.
//
// The brief hung the find field on this number too, and it does not any more:
// searching is the top of the page from the first person (Miyel, 2026-09-19),
// because the field is also where the + puts the address box, and a slot that
// only exists past twelve people is a slot the + has nowhere to open into.
const A_DOZEN = 12;

// ── A shelf, not the library ──────────────────────────────────────────────
// Miyel, 2026-09-19: "as many others as fit on one screen, then a quiet line:
// See all 100." The floor is one screen because the feed has to be exactly
// one scroll away whether the book holds six people or a hundred — the same
// bargain the beacon makes, where the cover and three recents stand for a
// journal of four hundred records.
//
// What fits is measured rather than assumed: the shelf is a box of fixed
// height and a row costs whatever a row costs on this phone, with this
// person's name in it. The number below is only the first guess, used for the
// one frame before anything has been drawn to measure — 62px of face, 9 of
// gap and a line of name.
// A row of faces costs its own height plus the air the grid keeps above and
// below it — 62 of face, 9 of gap, a line of name, and 18 either side. It is
// measured off a real row as soon as there is one; this is the guess used for
// the single frame before there is.
const A_ROW = 123;

// How long the doors take to open and close. The site's number for a thing
// unfolding in place, and the same one the head's two fields cross on, so
// pressing a face and pressing the + cost the same.
const DOORS_MS = 340;

// `shelf` is the floor of the friends pane: one screen, as many faces as fit,
// and a line out to the whole book. Without it this is the whole book — the
// standalone address, and the view that line opens.
//
// `onCount` is how the cross learns whether there is a book at all, which it
// needs before it can decide whether this pane has a second floor. The count
// is this component's to know: it is the one that asks for the people.
export default function Friends({ shelf = false, onCount = null }) {
  // Who this copy belongs to, carried on every link out to another journal so
  // the form there knows who is sending. See carrySender.
  const { keeper_name: myName, site_address: myAddress } = useBookplate();
  const me = { name: myName, address: myAddress };

  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);      // the id of the person showing their doors
  // ── And the one on its way out ──────────────────────────────────────────
  // The doors have to be in the DOM to collapse, and the person they belong
  // to has to still be known while they do it, or the panel empties halfway
  // through closing. So the outgoing id is held for the length of the
  // movement and then let go. Switching straight from one face to another in
  // a different row is the case this exists for: without it the first row's
  // doors would vanish in a frame while the second row's opened properly.
  const [leaving, setLeaving] = useState(null);
  const leaveTimer = useRef(null);
  const [adding, setAdding] = useState(false); // the + pressed: the field and the scanner
  const [scanning, setScanning] = useState(false);
  const [typed, setTyped] = useState('');
  const [finding, setFinding] = useState('');
  const [filing, setFiling] = useState(false);
  const [said, setSaid] = useState('');
  const [sendingTo, setSendingTo] = useState(null);
  // An address that arrived in a link, held rather than filed — see the note
  // in the offer below.
  const [offered, setOffered] = useState('');
  // Whether the bin has been pressed once. Miyel, 2026-09-19: "we can use the
  // trashcan and remove with the double check that we do for deleting an
  // entry." That is KeeperTools' shape exactly — the first press arms it and
  // the word turns into the question, the second press does it — and it is
  // also how a draft is discarded in the picker, so it is not a third thing
  // to learn.
  const [sure, setSure] = useState(false);
  const fieldRef = useRef(null);
  const binRef = useRef(null);
  const paneRef = useRef(null);
  // The box the faces are clipped to on the floor. Its height is fixed by the
  // layout and does not move when the number of faces in it does, which is
  // what keeps the measuring below from chasing its own tail.
  const shelfRef = useRef(null);
  const [fits, setFits] = useState(0);

  // Up to whoever is drawing this, once it is known and whenever it changes.
  useEffect(() => { if (!loading) onCount?.(people.length); }, [loading, people.length, onCount]);

  useEffect(() => {
    fetch('/api/people').then(r => r.json()).then(d => {
      const had = d.people || [];
      setPeople(had);
      setLoading(false);
      // Anyone filed without a name is asked for it again now — the same
      // write as adding them, which is not an error the second time and keeps
      // the name if one comes back.
      for (const p of had.filter(q => !q.name)) {
        fetch('/api/people', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address: p.address }),
        }).then(r => (r.ok ? r.json() : null)).then(a => {
          if (a?.person?.name) setPeople(prev => inOrder(prev.map(q => (q.id === a.person.id ? a.person : q))));
        }).catch(() => {});
      }
    }).catch(() => setLoading(false));
  }, []);

  // ── An address that arrived in the link ─────────────────────────────────
  // Somebody reading another journal pressed Add there. That journal cannot
  // write to this copy, so it sends the reader home with the address in hand
  // and this files it. See CallingCard.js for the other end.
  //
  // Offered, not filed: a link that writes the moment it opens is a link
  // anybody could send you, and the one promise this book makes is that a
  // person is written down by the keeper and nobody else.
  //
  // Read after mount so the server and the browser agree on the first frame,
  // and taken back off the address bar at once, as every other address this
  // project carries in a link is (see noteArrival).
  useEffect(() => {
    let asked = '';
    try { asked = new URLSearchParams(window.location.search).get('add') || ''; } catch { /* no URL to read */ }
    const address = tidyJournal(asked);
    if (!address) return;
    setOffered(address);
    try {
      window.history.replaceState(window.history.state, '', window.location.pathname + window.location.hash);
    } catch { /* a browser that will not rewrite its own bar is no reason to fail */ }
  }, []);

  // Files an address, however it arrived — a paste, a scanned code, an
  // entry's whole link, or the offer above. The server tidies it again and
  // reads the name off the journal; the check here only saves a round trip
  // for a name typed into the wrong box.
  const file = useCallback(async (value) => {
    const address = tidyJournal(value);
    if (!address) { setSaid("That doesn't look like a web address."); return; }
    setFiling(true);
    setSaid('');
    try {
      const r = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setSaid(d.error || 'That could not be added.'); return; }
      setPeople(prev => inOrder([...prev.filter(p => p.id !== d.person.id), d.person]));
      setTyped('');
      setAdding(false);
      setSaid(d.reached ? '' : "Added, but that journal isn't answering just now, so there's no name yet.");
    } catch {
      setSaid('That could not be added.');
    } finally {
      setFiling(false);
    }
  }, []);

  const read = useCallback((text) => { setScanning(false); file(text); }, [file]);

  // Pressing a face opens it, pressing it again closes it, and pressing a
  // different one moves. Whatever was open goes on the way-out list for the
  // length of the movement so it can be watched leaving.
  function choose(id) {
    const was = open;
    const next = was === id ? null : id;
    setOpen(next);
    if (was !== null && was !== next) {
      setLeaving(was);
      clearTimeout(leaveTimer.current);
      leaveTimer.current = setTimeout(() => setLeaving(null), DOORS_MS + 80);
    }
  }
  useEffect(() => () => clearTimeout(leaveTimer.current), []);

  async function cross(id) {
    setSure(false);
    setOpen(null);
    await fetch(`/api/people/${id}`, { method: 'DELETE' });
    setPeople(prev => prev.filter(p => p.id !== id));
  }

  // ── The + does not open the keyboard ────────────────────────────────────
  // It did, on the reasoning that a + which opens a box you then have to tap
  // is two presses for one act. Miyel, 2026-09-19, off a real phone: "this can
  // open not in typing mode. most people will scan."
  //
  // She is right twice. Typing a journal's address out is the fallback — the
  // camera is the way in, and Scan a code is sitting right there — so the
  // keyboard was answering the rarer half. And on iOS it did more than
  // appear: focusing a field near the top of a pane makes the system scroll
  // the page to clear the keyboard, which lifted the whole floor up behind
  // the status bar. Her "the placement is off" is that scroll, and this is
  // what was causing it.
  //
  // The field is still the first thing under your thumb if you do want to
  // type. It just waits to be asked.

  // ── Anywhere else puts the bin back ─────────────────────────────────────
  // Once the word has become the question there is no un-armed control left
  // to press, so the way back cannot be the control itself — the same answer
  // the entry's tools and the picker's drafts give. Captured at the document
  // so the state is clear before the press reaches whatever it landed on,
  // with the bin excepted, because a press there is the yes.
  useEffect(() => {
    if (!sure) return undefined;
    const away = event => { if (!binRef.current?.contains(event.target)) setSure(false); };
    document.addEventListener('pointerdown', away, true);
    return () => document.removeEventListener('pointerdown', away, true);
  }, [sure]);

  // And choosing somebody else, or closing the doors, puts it back too: an
  // armed bin that outlived the face it belonged to would be pointing at
  // whoever is open next.
  useEffect(() => { setSure(false); }, [open]);

  // ── Doors opened off the bottom of the shelf ────────────────────────────
  // Miyel, 2026-09-19: "opening bottom row of friends is cut off." On the
  // floor the faces are clipped to a box, and pressing somebody in the last
  // row unfolds 150px of doors below them — past the edge of it. The shelf
  // has always been able to scroll to them; nothing said so, which is the
  // same as not being able to.
  //
  // So the shelf goes to them, once they have finished opening, and only by
  // as much as it takes. Nothing moves when the doors were already in view,
  // which is every row but the last.
  useEffect(() => {
    if (!shelf || open === null) return undefined;
    const box = shelfRef.current;
    if (!box) return undefined;
    const settle = setTimeout(() => {
      const doors = box.querySelector('.fr-doors--open');
      if (!doors) return;
      const over = doors.getBoundingClientRect().bottom - box.getBoundingClientRect().bottom;
      if (over > 1) box.scrollTo({ top: box.scrollTop + over + 10, behavior: 'smooth' });
    }, DOORS_MS + 30);
    return () => clearTimeout(settle);
  }, [shelf, open]);

  // ── Anywhere else closes the doors ──────────────────────────────────────
  // Miyel, 2026-09-19: "clicking away should close." Pressing the face again
  // closes it and always did, but that asks you to find the thing you
  // pressed; everywhere else on this site a press outside an open thing puts
  // it away, and this was the exception.
  //
  // A face and the doors themselves are excepted — one is how you move to
  // somebody else, the other is the thing you opened. Everything outside,
  // including the search field above and the empty floor below, closes.
  useEffect(() => {
    if (open === null) return undefined;
    const away = event => {
      if (event.target.closest?.('.fr-one, .fr-doors')) return;
      choose(open);
    };
    document.addEventListener('pointerdown', away, true);
    return () => document.removeEventListener('pointerdown', away, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Narrowing ───────────────────────────────────────────────────────────
  // Over the name alone — the address is not printed here, so it is not
  // searched here either. A journal that has not answered has no name to
  // search, so it is matched on the address it was filed under, which is the
  // only string that person has.
  const shown = finding.trim()
    ? people.filter(p => (p.name || p.address).toLowerCase().includes(finding.trim().toLowerCase()))
    : people;
  const across = people.length > A_DOZEN ? 5 : 4;

  // ── How many fit ────────────────────────────────────────────────────────
  // Measured, not counted out: a row costs a different number of pixels on a
  // phone with a notch than on one without, and a name that wraps to two
  // lines costs more again. The shelf is a box of settled height with the
  // faces clipped inside it, so the sum is room ÷ row and nothing about the
  // answer depends on how many faces are currently drawn.
  //
  // It settles in two passes and cannot oscillate: the first uses the guess
  // above because there is nothing on screen to measure yet, the second uses
  // the real row, and the guard means a third never happens.
  useLayoutEffect(() => {
    if (!shelf) return undefined;
    const box = shelfRef.current;
    if (!box) return undefined;
    const reckon = () => {
      const room = box.clientHeight;
      if (!room) return;
      // A whole row, not a face: each row is its own grid with its own air
      // above and below it, and measuring the face alone lost 36px a row —
      // enough that the fourth row came back cut in half at five across.
      const tall = box.querySelector('.fr-row')?.offsetHeight || A_ROW;
      const lines = Math.max(1, Math.floor(room / tall));
      const next = lines * across;
      setFits(was => (was === next ? was : next));
    };
    reckon();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const watch = new ResizeObserver(reckon);
    watch.observe(box);
    return () => watch.disconnect();
  }, [shelf, across, people.length, fits]);

  // What the floor actually draws. The whole book everywhere else, and on the
  // floor whatever fits — but never while a search is narrowing it, because a
  // shelf that hides the person you just typed the name of is a search that
  // does not work.
  const narrowed = Boolean(finding.trim());
  const onShow = useMemo(
    () => (shelf && !narrowed && fits > 0 ? shown.slice(0, fits) : shown),
    [shelf, narrowed, fits, shown]
  );
  const held = shelf && !narrowed && people.length > onShow.length;

  // ── Where the search field lives ────────────────────────────────────────
  // Miyel, 2026-09-19: "the search field lives in the full view. On the floor
  // it appears only once the book passes about a dozen." Which is the brief's
  // original rule, reinstated: a field over eight faces you can already see
  // is a box asking you to type the name of somebody you are looking at.
  //
  // Never over an empty book, in either view. A search box on a page with
  // nothing to search is the emptiest thing you can put on a first screen,
  // and the first screen of every new install is this one.
  const searchable = people.length > 0 && (!shelf || people.length > A_DOZEN);

  // ── The rows ────────────────────────────────────────────────────────────
  // Built here rather than left to the grid, because the doors have to open
  // *between* two rows and CSS grid has no way to say "after whichever row
  // that item landed in". Chunking is what turns that into an ordinary list
  // of rows with a panel that can sit after one of them.
  const rows = [];
  for (let i = 0; i < onShow.length; i += across) rows.push(onShow.slice(i, i + across));

  const who = people.find(p => p.id === open) || null;

  return (
    <>
      <div className={'fr' + (who ? ' fr--open' : '')}>
        {/* ── One slot at the top, two fields ─────────────────────────────
            Miyel, 2026-09-19: "there should be a search feature at the top,
            search address book instead of EVERYONE 9. When clicking add, the
            search can replace the search bar with address bar and add / scan
            a code."

            So the head is a field and a +, and the + swaps which field it
            is. Not two boxes stacked — a page whose top is a search box and
            an address box at the same time is a page asking you which one
            you meant before you have done anything.

            The count went with the label. It was a fact about the page
            rather than something you needed, and a number beside a search
            box reads as a result rather than a total. The faces are the
            count: you can see how many there are. */}
        {/* ── One slot, two fields, and they cross ────────────────────────
            Miyel, 2026-09-19: "there should be a search feature at the top,
            search address book instead of EVERYONE 9. When clicking add, the
            search can replace the search bar with address bar and add / scan
            a code" — and then: "I want an animation, like the search bar
            disappears left as the journal search opens right from the x, and
            make the + turn into the x. Every animation fluid and moves, not
            just appears."

            So both fields are always here, in one grid cell, and the swap is
            the two of them passing: the search leaves to the left while the
            address arrives from the right, out of the button that asked for
            it. Neither is mounted or unmounted — a thing that appears cannot
            move, and React would give us the appearing version for free.

            `inert` on whichever one is away, so the keyboard and a screen
            reader only ever meet the field that is actually there. */}
        <div className="fr-head">
          <div className="fr-slot">
            {/* ── What the book is called, when nothing is being typed ─────
                Miyel, 2026-09-20: "let's bring back the address book title at
                the top and a count of how many people you have in your book."

                In the slot rather than on a row of its own, because a row of
                its own is 48px of header over a page whose whole argument is
                that it is faces and not furniture. The slot already holds two
                things and shows one; this is the third, and it leaves the
                same way the search does — clipped off to the left as the
                address field arrives from the right. */}
            <p className={'fr-book' + (adding || searchable ? ' fr-field--gone' : '')} aria-hidden={adding || searchable ? true : undefined}>
              Address book
              {!loading && people.length > 0 && <span> &middot; {people.length}</span>}
            </p>
            <label className={'fr-field fr-field--find' + (adding || !searchable ? ' fr-field--gone' : '')} inert={adding || !searchable ? true : undefined}>
              <MagnifyingGlass size={15} weight="regular" aria-hidden="true" />
              <input
                value={finding}
                onChange={e => setFinding(e.target.value)}
                placeholder="Search your address book"
                aria-label="Find somebody in your book"
                spellCheck={false}
              />
            </label>
            <label className={'fr-field fr-field--address' + (adding ? '' : ' fr-field--waiting')} inert={adding ? undefined : true}>
              <input
                ref={fieldRef}
                value={typed}
                onChange={e => setTyped(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); file(typed); } }}
                placeholder="Enter journal address"
                aria-label="The address of a journal to add"
                autoComplete="url"
                inputMode="url"
                spellCheck={false}
              />
            </label>
          </div>
          {/* ── The + turns into the × ───────────────────────────────────
              One glyph, not two. A plus rotated forty-five degrees *is* a
              cross, so the control can turn into the other thing rather than
              being replaced by it — which is the difference between a mark
              that moves and a mark that blinks. The same trick the session's
              × does on its way to becoming END.

              And the search is dropped on the way in: the two fields share
              one slot, so a book still narrowed to one person while you type
              an address into the box above it is a page quietly lying about
              how many people are in it. */}
          <button
            type="button"
            className={'fr-plus' + (adding ? ' fr-plus--shut' : '')}
            onClick={() => { setAdding(a => !a); setSaid(''); setTyped(''); setFinding(''); }}
            aria-expanded={adding}
            aria-label={adding ? 'Never mind' : 'Add a journal'}
            title={adding ? 'Never mind' : 'Add a journal'}
          >
            <Plus size={18} weight="regular" aria-hidden="true" />
          </button>
        </div>

        {/* Centred under the address field, and collapsed rather than taken
            away, so the row opens and closes rather than blinking. */}
        <div className={'fr-add-acts' + (adding && !scanning ? ' fr-add-acts--open' : '')} inert={adding && !scanning ? undefined : true}>
          <button type="button" className="own-act own-act--solid" onClick={() => file(typed)} disabled={filing || !typed.trim()}>
            {filing ? 'Adding…' : 'Add'}
          </button>
          <button type="button" className="own-act" onClick={() => setScanning(true)} title="Point the camera at a code">
            <Camera size={14} aria-hidden="true" /> Scan a code
          </button>
        </div>
        {scanning && <CodeScanner onRead={read} onClose={() => setScanning(false)} />}

        {offered && !scanning && (
          <div className="bk-offer">
            <p className="bk-offer-said">Add <strong>{offered}</strong> to your book?</p>
            <div className="bk-offer-acts">
              <button
                type="button"
                className="own-act own-act--solid"
                disabled={filing}
                onClick={() => { const a = offered; setOffered(''); file(a); }}
              >
                {filing ? 'Adding…' : 'Add them'}
              </button>
              <button type="button" className="own-act" onClick={() => setOffered('')}>Not now</button>
            </div>
          </div>
        )}

        <p className="bk-said" role="status">{said}</p>

        {/* ── The shelf ───────────────────────────────────────────────────
            A box of settled height with the faces clipped inside it, which is
            what makes "as many as fit" a fact about the screen rather than a
            number somebody chose. Off the floor it is a plain wrapper and the
            whole book runs down it. */}
        <div className={'fr-shelf' + (shelf ? ' fr-shelf--floor' : '')} ref={shelfRef}>
        {loading ? (
          <div className="fr-grid" style={{ '--fr-across': across }}>
            {[...Array(8)].map((_, i) => <div key={i} className="fr-one"><span className="own-skeleton fr-face" /></div>)}
          </div>
        ) : people.length === 0 ? (
          /* ── Nobody filed ──────────────────────────────────────────────
             The first screen of every new install, and the only one of the
             empty states that is about the software rather than about a
             quiet week. So it says what this page is for and both ways in,
             and it points at the + rather than repeating it as a button: the
             control is four inches away and a second one would be two doors
             into one room.

             No count, no search, no caret, and no feed underneath — see the
             cross, which is told there is no book and draws one floor. A
             caret pointing down at a feed of nobody's records is a promise
             the page cannot keep. */
          <div className="fr-nobody">
            <p className="fr-nobody-said">Nobody in your book yet.</p>
            <p className="fr-nobody-how">
              Add a journal by its address, or point the camera at somebody&rsquo;s code.
              What they log shows up here.
            </p>
          </div>
        ) : shown.length === 0 ? (
          <div className="own-empty">Nobody in your book by that name.</div>
        ) : (
          rows.map((row, i) => {
            const holdsOpen = who && row.some(p => p.id === who.id);
            // The row's doors, and who they belong to: the open person, or
            // the one still on their way out of this row.
            const mine = row.find(p => p.id === open) || row.find(p => p.id === leaving) || null;
            return (
              <div key={i} className={'fr-row' + (holdsOpen ? ' fr-row--open' : '')}>
                <div className="fr-grid" style={{ '--fr-across': across }}>
                  {row.map(p => {
                    const called = p.name || 'Not answering yet';
                    const isOpen = who?.id === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        className={'fr-one' + (isOpen ? ' fr-one--open' : '')}
                        onClick={() => choose(p.id)}
                        aria-expanded={isOpen}
                        title={called}
                      >
                        {/* Their journal's own portrait, read straight off it
                            and never stored; a journal without one, or one
                            that is out, leaves the plain mark showing. */}
                        <span className="fr-face" aria-hidden="true">
                          <User size={22} weight="regular" />
                          <img
                            src={`${journalUrl(p.address)}/api/portrait`}
                            alt=""
                            loading="lazy"
                            onError={e => { e.currentTarget.style.display = 'none'; }}
                          />
                        </span>
                        <span className={'fr-name' + (p.name ? '' : ' fr-name--none')}>{called}</span>
                      </button>
                    );
                  })}
                </div>

                {/* ── The three doors ──────────────────────────────────────
                    Under the row the face is in, between two hairlines, in
                    the band's pattern: glyph over word. Journal leaves the
                    site, Compare is your page about them — which *is* the
                    compare, so it needs no second link — and Send is the
                    sheet with the person already chosen.

                    Remove is the fourth of them and not a footnote under
                    them. It sat on its own line for an hour, on the grounds
                    that the mock-up draws three and the brief says a fourth
                    is where this row starts needing a rethink — and Miyel's
                    answer, 2026-09-19, is that it "can be the same as all
                    the other glyphs on the row, not a separate entity."

                    Which is the better reading of her own rule: the four are
                    everything you can do about one person, and singling one
                    out by drawing it differently makes the row three things
                    and a warning. What keeps it from being pressed by
                    accident is the second press, not a smaller typeface —
                    that is the whole reason the second press exists. It goes
                    red only once it has been asked. */}
                {/* Always here, collapsed to nothing, in every row. That is
                    what lets it open and close rather than appear: a panel
                    mounted with its open state already on it has no frame to
                    start the movement from, and React would hand us exactly
                    that. An empty collapsed one costs a div. */}
                <div className={'fr-doors' + (holdsOpen ? ' fr-doors--open' : '')} inert={holdsOpen ? undefined : true}>
                  {mine && (
                  <div className="fr-doors-row">
                    <a
                      className="fr-door"
                      href={carrySender(journalUrl(mine.address), me, { known: true })}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <BookOpen size={22} weight="regular" aria-hidden="true" />
                      Journal
                    </a>
                    <Link className="fr-door" href={`/dashboard/people/${mine.id}`}>
                      {/* Shuffle, settled 2026-09-20 (Miyel). It was
                          ArrowsDownUp for a day — my stand-in for the two
                          arrows her mock-up left hand-drawn — and two arrows
                          running past each other is a sort order, which is
                          the one thing this door is not.

                          Shuffle is two paths that cross and come out the
                          other side, which is what comparing two people's
                          shelves looks like: the same records, taken in a
                          different order, by somebody else. Still not
                          ArrowsLeftRight — this site already uses that for
                          turning the spine. */}
                      <Shuffle size={22} weight="regular" aria-hidden="true" />
                      Compare
                    </Link>
                    <button type="button" className="fr-door" onClick={() => setSendingTo(who)}>
                      <PaperPlaneTilt size={22} weight="regular" aria-hidden="true" />
                      Send
                    </button>
                  </div>
                  )}

                  {/* ── And Remove, which is not one of them ──────────────
                      Miyel, 2026-09-19, changing her own earlier call: it
                      "sits below as a quiet mono line, in muted ink. It
                      undoes the relationship and shouldn't be one mis-tap
                      from Send."

                      She is right and it is the stronger rule: the three
                      above are things you do *with* somebody, and this is the
                      end of there being a somebody. A row of four evenly
                      spaced doors says they are four of a kind, and the
                      thumb believes the row.

                      Still two presses, still red on the second, still put
                      back by a press anywhere else — the shape the entry's
                      Delete and the picker's discard already have. What
                      changed is where it sits, not how it behaves. */}
                  {mine && (
                    <button
                      ref={binRef}
                      type="button"
                      className={'fr-cut' + (sure ? ' fr-cut--sure' : '')}
                      onClick={() => { if (!sure) { setSure(true); return; } cross(mine.id); }}
                      title={sure
                        ? `Press again to take ${mine.name || 'them'} out of your book`
                        : `Take ${mine.name || 'them'} out of your book`}
                    >
                      {sure ? 'Remove from journal?' : 'Remove from journal'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        </div>

        {/* ── The line out to the whole book ──────────────────────────────
            Miyel, 2026-09-19: "a quiet line: See all 100." It is the only
            thing on the floor that is a number, and it earns it — the point
            of the line is that there are more of them than this.

            A link and not a state, so it opens the book as its own view at
            its own address: the cross catches it and it arrives as a layer
            over this pane, with the search at the top and everybody in it.
            Closing it puts you back on the shelf, where you were. */}
        {held && (
          <Link href="/dashboard/people" className="fr-all">
            See all {people.length}
          </Link>
        )}
      </div>

      {/* One sheet for the page, told who it is for. Mounted outside the grid
          so that closing it does not depend on the face surviving a refresh
          of the book. */}
      <SendSheet open={Boolean(sendingTo)} person={sendingTo} onClose={() => setSendingTo(null)} />
    </>
  );
}
