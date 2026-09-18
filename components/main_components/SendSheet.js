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
import { EnvelopeSimple, X } from '@phosphor-icons/react';
import AlbumFinder from './AlbumFinder';
import MiniAddressBook from './MiniAddressBook';
import { useBookplate } from './Bookplate';

// Its own key, beside the send page's `ln-send-draft`. Separate on purpose:
// they are two different messages to two different people, and one standing in
// for the other would be worse than losing either.
const DRAFT_KEY = 'ln-outbox-draft';

const BLANK = { note: '', quiet: false, to: '' };

export default function SendSheet({ open, onClose, person = null, record = null }) {
  const { keeper_name, cover_name, site_address } = useBookplate();
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
      quiet: kept?.quiet === true,
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
    try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch { /* private window */ }
  }, [open, form]);

  const shut = useCallback(() => { setError(''); onClose?.(); }, [onClose]);

  // Escape closes, like every other layer here.
  useEffect(() => {
    if (!open) return undefined;
    const key = e => { if (e.key === 'Escape') shut(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [open, shut]);

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
  const from = String(keeper_name || cover_name || '').trim();

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
      <section className="sn-sheet" role="dialog" aria-modal="true" aria-label="Send this record">
        {/* A corner, not the middle (Miyel, 2026-09-17). A centred × reads as
            part of the sheet's own content and sits over the thing you came to
            look at; every close on this site is in a corner and this one was
            the exception. */}
        <button type="button" className="sn-shut" onClick={shut} aria-label="Close">
          <X size={16} weight="bold" />
        </button>

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
          <form className="sn-form" onSubmit={send}>
            {/* The record. Fixed when the send started on one — you pressed
                Send on this record and the sheet is not going to ask you which
                — and the finder when it started on a person. */}
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

            {/* One person per send. The same strip of faces the entry's Sent by
                and the inbox draw, which is the whole reason it is a component:
                three surfaces asking who, answering in one shape. */}
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

            <label className="sn-group">
              <span className="sn-label">A note</span>
              <textarea
                ref={noteRef}
                className="sn-note"
                rows={3}
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="What should they listen for?"
              />
            </label>

            {/* The sender's choice, not the keeper's, and off by default —
                public credit is the default and quiet is the choice. Worded as
                what it does to their page rather than how it feels here. */}
            <label className="sn-quiet">
              <span>Send quietly — their entry won&rsquo;t credit you</span>
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
              <p className="sn-from">From {from}{site_address ? `, ${site_address}` : ''}</p>
              <button type="submit" className="sn-send" disabled={sending}>
                <EnvelopeSimple size={18} weight="fill" />
                <span>{sending ? 'Sending…' : to ? `Send to ${to.name || 'them'}` : 'Send'}</span>
              </button>
            </div>
          </form>
        )}
      </section>
    </>
  );
}
