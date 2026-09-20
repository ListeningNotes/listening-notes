// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// components/main_components/SendSheet.js
// Handing a record to somebody in your book, without leaving your journal.
//
// ── Why this exists next to the send page ─────────────────────────────────
// The form on somebody's card is how a person without a copy sends a record,
// and it is not going anywhere. But it is the wrong shape for a keeper: it
// asks for a name and a journal their own copy already knows, on a page their
// copy cannot see, and reaching it means walking to the person rather than
// opening the book. So a keeper sends from here and everybody else sends from
// there, and both arrive at the same door (library/outbox.js).
//
// ── One sheet, two ways in ────────────────────────────────────────────────
// It opens knowing one of the two things it needs and asks for the other:
//
//   from a row in the book   the person is chosen, so it opens on the search
//   from a record's tools    the record is chosen, so it opens on the faces
//
// Which is why neither half is a step. Both are on screen at once and one of
// them is already answered — a wizard would make the known half a page you
// press through.
//
// ── Why this one is allowed to be a sheet ─────────────────────────────────
// DECISIONS is clear that a control opens where it belongs rather than
// floating over a dimmed screen, and just as clear about the exception: a
// screenful of controls with nowhere in the flow to live. A record, a row of
// faces, a message and a toggle is a screenful, and the place it would
// otherwise unfold — a row in the address book, or an entry's toolbar — has
// nowhere to put it. Same call as the wall's filter sheet.
//
// ── Nothing typed is ever lost ────────────────────────────────────────────
// The sheet is one careless tap from gone and the message is the part that
// matters, so what has been written is kept in the browser and put back when
// it opens again — the same answer the send page gives, for the same reason,
// under its own key. Nothing is confirmed on the way out: a dialog asking
// whether you meant it taxes every deliberate dismiss to catch a rare
// accident. A send that fails keeps everything too, and says so.

import { useCallback, useEffect, useRef, useState } from 'react';
import { EnvelopeSimple } from '@phosphor-icons/react';
import AlbumFinder from './AlbumFinder';
import MiniAddressBook from './MiniAddressBook';

// Its own key, beside the send page's `ln-send-draft`. Separate on purpose:
// they are two different messages to two different people, and one standing in
// for the other would be worse than losing either.
const DRAFT_KEY = 'ln-outbox-draft';

const BLANK = { note: '', quiet: false, to: '' };

// What is worth keeping of a half-written send. The note, and nothing else:
// the record and the person come from the press that opened the sheet, and
// quiet is a decision about this send rather than a setting (see the note
// where the draft is read back).
const WORTH_KEEPING = ['note'];

// ── Putting it away with a finger ─────────────────────────────────────────
// Miyel, 2026-09-19: "the opening screen for send and compare can just open
// up from the bottom and close from dragging down." This one already opened
// from the bottom; what it had was a ×, Escape and a tap on the dim, all of
// which ask you to aim at something.
//
// The two numbers are the layer's, by name and by value, because a pull that
// means leave should cost the same everywhere — a fifth of the way, or a
// flick that is quick even if it is short (LayerEntry). A fifth *of the
// sheet* rather than of the screen: it is the sheet you have hold of, and on
// a short form a fifth of the window is most of the object.
const FAR_ENOUGH = 0.2;
const FAST_ENOUGH = 0.3;

export default function SendSheet({ open, onClose, person = null, record = null }) {
  const [people, setPeople] = useState([]);
  const [form, setForm] = useState(BLANK);
  const [pick, setPick] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState('');
  const [error, setError] = useState('');
  // Narrowing the book. The strip alone is fine for the three people a new
  // copy knows and gets painful at forty (Miyel, 2026-09-17) — it is one row
  // that scrolls sideways, so the shape never changes as the book grows and
  // neither does the work of getting to the end of it. Credit has always had a
  // way to narrow, because its name field doubles as one; this had none at
  // all. It appears only once there are more faces than fit, so a copy with
  // three friends is not handed a search box for three friends.
  const [findWho, setFindWho] = useState('');
  const noteRef = useRef(null);
  // ── And the cursor follows the step ─────────────────────────────────────
  // Choosing a record is the end of step one, so the thing you are going to
  // do next is write. Same request as the search field's, with the same
  // caveat: iOS grants a focus that came from a tap and may refuse one that
  // did not, and choosing a record *is* a tap, so this one has a better
  // chance than the first.
  const wrote = useRef(false);

  // The book, once, the first time the sheet is opened. It is the owner's own
  // route and a few hundred bytes; asking again on every open would be a read
  // per press of a glyph that gets pressed a lot.
  useEffect(() => {
    if (!open || people.length) return;
    fetch('/api/people')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setPeople(Array.isArray(d.people) ? d.people : []))
      .catch(() => {});
  }, [open, people.length]);

  // What was typed last time, put back. Read on the way in rather than held in
  // state across closes, so it survives a reload and a swiped-away tab too.
  useEffect(() => {
    if (!open) return;
    let kept = null;
    try { kept = JSON.parse(window.localStorage.getItem(DRAFT_KEY) || 'null'); } catch { /* private window */ }
    setForm(f => ({
      note: kept?.note || f.note || '',
      // ── Quiet starts off, every time ──────────────────────────────────
      // Miyel, 2026-09-19: "send quiet should always start untoggled." It
      // was being restored with the rest of the draft, so one quiet send
      // made every later send quiet until it was noticed — and the thing
      // not noticed is somebody's name missing from an entry that should
      // have carried it. Public credit is the default and quiet is the
      // choice (DECISIONS), and a choice that remembers itself is not
      // being made. The note is still kept; that is work, and this is a
      // decision about one send.
      quiet: false,
      // A person handed in wins over one remembered: pressing send on a row
      // says who, and the sheet should not argue with the press that opened it.
      to: person?.address || kept?.to || '',
    }));
    setSent('');
    setError('');
  }, [open, person?.address]);

  // Written on every change rather than on the way out, because there is no
  // reliable way out to hang it on — a tab can be killed, a phone can lock.
  useEffect(() => {
    if (!open) return;
    // Only the parts worth keeping. Writing the whole form put `quiet` in
    // the browser, where it came back next time as a setting nobody set —
    // see WORTH_KEEPING and the note where the draft is read.
    const keep = Object.fromEntries(WORTH_KEEPING.map(k => [k, form[k]]));
    try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify(keep)); } catch { /* private window */ }
  }, [open, form]);

  const shut = useCallback(() => { setError(''); onClose?.(); }, [onClose]);

  // ── The keyboard, and where the visible window actually is ──────────────
  // Miyel, 2026-09-19: "it's also doing that thing where when the keyboard
  // opens and closes the screen moves all over." It is the same thing the
  // layer had and the same cure — this sheet simply never got it.
  //
  // A `position: fixed; bottom: 0` sheet is fixed to the *layout* viewport,
  // which on iOS does not move when the keyboard comes up. The part you can
  // see does. So the sheet sits under the keyboard, the browser scrolls the
  // page to chase the field, and the whole screen lurches.
  //
  // visualViewport says exactly where the part you can see is, so the sheet
  // is inset to match it and *is* the visible window. Applied every time,
  // with no test for whether a keyboard is up: the insets are the difference
  // between the layout viewport and the part of it you can see, which is
  // zero whenever nothing is covering the screen — so applying them always
  // is the same as applying them never, right up until it matters. The
  // layer's note records what happens when you put a threshold on it
  // instead: Safari holds innerHeight still through a keyboard and a
  // home-screen install does not, so the guess fails on exactly one of them.
  useEffect(() => {
    if (!open) return undefined;
    const vv = window.visualViewport;
    const sheet = sheetRef.current;
    if (!vv || !sheet) return undefined;
    const sync = () => {
      const room = document.documentElement.clientHeight || window.innerHeight;
      sheet.style.setProperty('--sn-bottom', `${Math.max(0, Math.round(room - vv.offsetTop - vv.height))}px`);
      // And how tall the sheet is allowed to be: the part you can see, not
      // the part that exists. With a keyboard up and a wall of covers open
      // these are very different numbers, and a sheet measured against the
      // second one puts its Send button under the keyboard.
      sheet.style.setProperty('--sn-room', `${Math.round(vv.height)}px`);
    };
    sync();
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
    };
  }, [open]);

  // ── The pull ────────────────────────────────────────────────────────────
  // From a strip across the top of the sheet and nowhere else. The sheet
  // scrolls inside itself when a long message needs it to, and a pull that
  // could start anywhere would spend its life arguing with that scroll; a
  // strip that only exists at the top can only ever mean leave. It draws
  // nothing — the × already sits in it, and keeps working, because the strip
  // is behind it and a press on a control is not a pull.
  const sheetRef = useRef(null);
  const [dragY, setDragY] = useState(0);
  const [held, setHeld] = useState(false);
  const pull = useRef(null);

  // Anything left over from the last time it was open. A sheet that comes
  // back up already pushed halfway down is a sheet that looks broken.
  useEffect(() => { if (!open) { setDragY(0); setHeld(false); pull.current = null; } }, [open]);

  function grab(event) {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pull.current = { y: event.clientY, at: event.timeStamp };
    setHeld(true);
    // Capture so the pull survives the finger leaving the strip — it is 48px
    // tall and the gesture is longer than that by design. In a try because
    // it throws when the pointer it names is not one the browser is tracking,
    // and a throw here would take the whole pull down with it rather than
    // costing it the capture: the sheet would simply stop following the
    // thumb, which is the silent kind of broken.
    try { event.currentTarget.setPointerCapture?.(event.pointerId); } catch { /* no capture, still a pull */ }
  }
  function move(event) {
    if (!pull.current) return;
    // Downwards only. A pull up is somebody steadying their thumb, not a
    // request to make the sheet taller than it is.
    setDragY(Math.max(0, event.clientY - pull.current.y));
  }
  function release(event) {
    const from = pull.current;
    pull.current = null;
    setHeld(false);
    if (!from) return;
    const dy = Math.max(0, event.clientY - from.y);
    const ms = Math.max(1, event.timeStamp - from.at);
    const tall = sheetRef.current?.offsetHeight || window.innerHeight;
    if (dy > tall * FAR_ENOUGH || dy / ms > FAST_ENOUGH) { setDragY(0); shut(); return; }
    // Not far enough and not quick enough: back where it was.
    setDragY(0);
  }

  // Escape closes, like every other layer here.
  useEffect(() => {
    if (!open) return undefined;
    const key = e => { if (e.key === 'Escape') shut(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open, shut]);

  // The note takes the cursor the moment the sheet stops being a search.
  // Once per opening, so coming back from Change does not steal it while you
  // are still reading the covers. Above the early return, because a hook
  // cannot be called on only some renders — `record || pick` is the same
  // fact `picking` is read from a few lines down, said before the component
  // is allowed to bail out.
  useEffect(() => {
    if (!open) { wrote.current = false; return; }
    if (!(record || pick) || wrote.current) return;
    wrote.current = true;
    noteRef.current?.focus();
  }, [open, record, pick]);

  if (!open) return null;

  // The record: handed in from an entry, or found by searching. `record`
  // arrives in the entry's own vocabulary and `pick` in the finder's, so they
  // are read into one shape here rather than in three places below.
  const chosen = record
    ? {
      album: record.album, artist: record.artist, year: record.year || '',
      art: record.album_art || record.art || '', collectionId: record.collection_id || '',
    }
    : pick;

  const to = people.find(p => p.address === form.to) || null;
  // Whoever this is going to, for the note's own placeholder. The person
  // handed in when the sheet was opened from a face, or the one picked out
  // of the strip when it was not; their name, or nothing, and never their
  // address — a field asking you to write a message for a hostname is a
  // field about plumbing.
  const forWhom = (person?.name || to?.name || '').trim();

  // ── Two steps, and the sheet is a different size for each ───────────────
  // Miyel, 2026-09-19: "I think the whole screen should be the album list,
  // and then you choose one and then it goes to the message. When I'm
  // looking, the message for the person is still there, and I don't like
  // that. The whole focus should be choosing the album."
  //
  // Which is the same two-states argument as before, taken the rest of the
  // way: it was two states of one form, and the form was still standing
  // behind the search. Choosing a record and writing to somebody are two
  // different jobs and they get the screen one at a time.
  const picking = !chosen;

  async function send(event) {
    event.preventDefault();
    setError('');
    if (!to) { setError('Choose who it is for.'); return; }
    if (!chosen) { setError('Pick a record first.'); return; }
    if (!form.note.trim()) { setError('Say something about it — that is the part that matters.'); return; }

    setSending(true);
    try {
      const answer = await fetch('/api/outbox', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          person_id: to.id,
          album: chosen.album, artist: chosen.artist, year: chosen.year,
          album_art: chosen.art, collection_id: chosen.collectionId,
          note: form.note, quiet: form.quiet,
          // Only when the send started on a record's own page. A record found
          // by searching is not an entry and has no slug to carry.
          sender_entry: record?.slug || '',
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
      setSent(to.name || 'them');
      setForm(BLANK);
      setPick(null);
      try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* private window */ }
    } catch {
      setError('Something went wrong here, not at their end. Nothing was sent.');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* touch-action: none so a drag on the dim cannot pan the page behind it. */}
      <div className="sn-scrim" onClick={shut} aria-hidden="true" />
      <section
        ref={sheetRef}
        className={'sn-sheet' + (picking ? ' sn-sheet--picking' : '')}
        role="dialog"
        aria-modal="true"
        aria-label="Send this record"
        style={dragY ? { transform: `translateY(${dragY}px)`, transition: held ? 'none' : undefined } : undefined}
      >
        {/* The strip that can be pulled. Invisible, the height of a thumb,
            and under the × rather than over it. */}
        <div
          className="sn-pull"
          onPointerDown={grab}
          onPointerMove={move}
          onPointerUp={release}
          onPointerCancel={release}
          aria-hidden="true"
        />
        {/* The × was here and went on 2026-09-19: "I don't think we need an X
            button to close this — a simple up and down swipe is fine." Which
            is the rule the rest of the site already keeps; this sheet was
            carrying a mark for a gesture everything else trusts you to know.
            The scrim still closes it, and Escape still does. */}

        {sent ? (
          // Not a page of its own and not a tick that vanishes: the sheet says
          // what happened and offers the only two things anybody wants next.
          <div className="sn-done">
            <EnvelopeSimple size={28} weight="light" />
            <p className="sn-done-line">Sent to {sent}.</p>
            <p className="sn-done-said">It is in their inbox. You will see what they make of it in your feed, if they log it.</p>
            <div className="sn-done-acts">
              <button type="button" className="own-act" onClick={() => setSent('')}>Send another</button>
              <button type="button" className="own-act own-act--solid" onClick={shut}>Done</button>
            </div>
          </div>
        ) : (
          picking ? (
          // ── Step one: the record, and nothing else ──────────────────────
          // No message, no switch, no send button. There is nothing to write
          // to until there is something to write about, and a form standing
          // behind the search is a form asking to be filled in while you are
          // still deciding what this is even for.
          <div className="sn-pick">
            <AlbumFinder
              picked={pick}
              onPick={p => { setPick(p); setError(''); }}
              onClear={() => setPick(null)}
              wants
            />
          </div>
        ) : (
          <form className="sn-form" onSubmit={send}>
            {/* The record. Fixed when the send started on one — you pressed
                Send on this record and the sheet is not going to ask you which
                — and the finder's own small row when it started on a person
                and one has since been chosen. */}
            {record ? (
              <div className="sn-record">
                {chosen.art
                  ? <img className="sn-record-art" src={chosen.art} alt="" />
                  : <span className="sn-record-art sn-record-art--none" aria-hidden="true" />}
                <span className="sn-record-who">
                  <span className="sn-record-album">{chosen.album}</span>
                  <span className="sn-record-artist">{chosen.artist}</span>
                </span>
              </div>
            ) : (
              <AlbumFinder picked={pick} onPick={p => { setPick(p); setError(''); }} onClear={() => setPick(null)} />
            )}

            {/* ── Who it is for, only when it is a question ────────────────
                Opened from a record's tools, nobody has been chosen yet and
                this is the strip of faces — the same one the entry's Sent by
                and the inbox draw, three surfaces asking who and answering
                in one shape.

                Opened from a face in the book there is nothing to ask, and
                nothing is drawn. It showed the picker with that person
                ringed, then a stated To with their face, and then Miyel,
                2026-09-19: "I don't even think To is needed — it already
                says Send to June and we literally chose him." Which is
                right: the sheet was answering a question nobody had asked,
                twice, above a button that names the person. What tells you
                where this is going is the button, and it always did. */}
            {!person && (
              <div className="sn-group">
                <span className="sn-label">To</span>
                {people.length === 0 ? (
                  <p className="sn-empty">Nobody in your address book yet. Add somebody first — then you can send to them from here.</p>
                ) : (
                  <>
                    {people.length > 6 && (
                      <input
                        className="sn-find"
                        value={findWho}
                        onChange={e => setFindWho(e.target.value)}
                        placeholder="Find someone"
                        aria-label="Find someone in your address book"
                        autoComplete="off"
                      />
                    )}
                    <MiniAddressBook
                      people={people}
                      linked={form.to}
                      narrow={findWho}
                      onPick={p => setForm(f => ({ ...f, to: p.address === f.to ? '' : p.address }))}
                      label="Who it is for"
                      verb="send"
                    />
                  </>
                )}
              </div>
            )}

            {/* ── The note, with no label over it ─────────────────────────
                A NOTE stood above this field and said what the field is,
                which the field can say itself. Miyel, 2026-09-19: "remove A
                note — maybe the placeholder can say something like a message
                for ____, and insert the user's name."

                Two jobs in one line: it names the field and it names who is
                going to read it, and a message written to somebody is a
                different thing from a message written into a box. It is also
                the last label in the sheet — what is left is a record, a
                question in grey, a switch and a button.

                Without a recipient yet — opened from a record's tools,
                before a face is picked — it asks the old question, because
                there is nobody to name. */}
            <label className="sn-group">
              <textarea
                ref={noteRef}
                className="sn-note"
                rows={3}
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder={forWhom ? `A message for ${forWhom}` : 'What should they listen for?'}
                aria-label={forWhom ? `A message for ${forWhom}` : 'A note'}
              />
            </label>

            {/* The sender's choice, not the keeper's, and off by default:
                public credit is the default and quiet is the choice
                (DECISIONS).

                The same words the send page uses, from 2026-09-19. This said
                "Send quietly — their entry won't credit you", which is a
                fuller sentence and a second vocabulary for one act: a
                stranger sending from somebody's card reads one thing, a
                keeper sending from their own copy reads another, and they
                are the same switch writing the same flag. One wording, the
                plainer one, and it is the sender's own words about
                themselves rather than a description of what happens on
                somebody else's page. */}
            <label className="sn-quiet">
              <span>Don&rsquo;t credit me publicly</span>
              {/* A switch rather than a tick (Miyel, 2026-09-17), and *credit*
                  rather than *name*: crediting is what the flag actually
                  controls, and it is the word the rest of the site uses for
                  it — quiet credit, don't credit them. role="switch" on a real
                  checkbox, so the label and the keyboard still work and a
                  screen reader hears on/off rather than ticked. */}
              <input
                type="checkbox"
                role="switch"
                className="ln-switch"
                checked={form.quiet}
                onChange={e => setForm(f => ({ ...f, quiet: e.target.checked }))}
              />
            </label>

            {error && <p className="sn-error">{error}</p>}

            <div className="sn-foot">
              {/* No name or journal fields: this copy knows both, and a field
                  for something the software already knows is a field somebody
                  can get wrong. */}
              {/* "From Miyel, www.listeningnotes.blog" stood here and went on
                  2026-09-19. It was this journal telling its own keeper who
                  they are, on their own copy, above a button that already
                  says Send to June — and the half of it that was not
                  redundant was the worse half: an address, where the person
                  receiving this is shown a face and a name (the inbox reads
                  the portrait off the sending journal and prints
                  `submitter_name`). Miyel: "the from line is redundant from
                  the user's journal, we don't need to know from because we
                  are the user; only the recipient needs to know, and they
                  should get the user's pfp and username, not the site url."
                  Nothing about what travels changes — the address is still
                  what the other copy resolves the face and the name from. It
                  is simply not printed at either end. */}
              <button type="submit" className="sn-send" disabled={sending}>
                <EnvelopeSimple size={18} weight="fill" />
                <span>{sending ? 'Sending…' : to ? `Send to ${to.name || 'them'}` : 'Send'}</span>
              </button>
            </div>
          </form>
          )
        )}
      </section>
    </>
  );
}
