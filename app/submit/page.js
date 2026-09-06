// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/submit/page.js
// Sending somebody an album.
//
// ── It is a gift, not a form ──────────────────────────────────────────────
// This was six text fields under the heading "Submit an Album", and a form
// asking for an album title, an artist and a year reads as a request being
// filed. What is actually happening is somebody handing a record to somebody
// else, and the three parts of that are the object, the note, and who it is
// from. So: a cover you pick by looking at it, a message doing the real work,
// and a name.
//
// ── No email ──────────────────────────────────────────────────────────────
// The old form asked for one and nothing ever used it. It is a contact detail
// held for no reason, which is the first crack in not holding anyone's data —
// so it is gone from the form. A journal URL takes its place and is not the
// same kind of thing: an address is where something is, not who somebody is,
// and it is the thing that eventually builds the address book.
//
// The column went too, 2026-08-31. It was kept for a fortnight on the
// settings.bio precedent — real data, draft schema — and then dropped on the
// better argument: the reason not to ask for an email is the reason not to
// hold the ones already given, and the draft window is the only time that is
// free.
//
// ── Why the values are kept ───────────────────────────────────────────────
// On the layer this page is one careless swipe from gone, and what would be
// lost is a written message rather than a scroll position. A confirmation was
// the other option and is the wrong one: it taxes every deliberate dismiss to
// catch the rare accidental one, and DECISIONS already has the finding that a
// dialog is dismissed by reflex. So nothing is confirmed and nothing is lost —
// what has been typed is kept in the browser and put back when the page opens
// again, whether that is the layer or the real address.

'use client';

import { useState, useEffect } from 'react';
import { fonts } from '../../library/sitewide_visuals';
import SiteNav from '../../components/main_components/SiteNav';
import AlbumFinder from '../../components/main_components/AlbumFinder';
import { recallSender, keepSender } from '../../library/return_address';

// What has been typed and not yet sent. Named alongside ln-dog-ear rather than
// the underscored session keys, because like the dog ear it belongs to a
// visitor rather than to the owner's writing flow.
const DRAFT_KEY = 'ln-send-draft';

const BLANK = { pick: null, note: '', name: '', address: '' };

// ── One screen, and no way out drawn on it ────────────────────────────────
// There was a Back and an Archive pill at the foot. Both are gone, and the
// page fits a viewport without them: the mark at the top goes home, the layer
// is left by swiping or Escape or the browser's own back button, and a row of
// links to elsewhere under a form is the same mistake the foot of the archive
// already had taken off it — offering to leave, at the moment somebody is
// halfway through doing something.
//
// `layered` is what is left of the difference between the two surfaces, and it
// is now only spacing. On the layer the nav row sits in the sheet's flow
// rather than fixed over it, so it has already taken its 80px as real space
// and the hero must not reserve them again. The row itself is on both: it came
// off the layer at first, on the grounds that the one underneath was still
// real — which is wrong, because the sheet is opaque and full screen, so none
// of what is underneath can be seen. That left the one screen on the site with
// no mark on it.
export default function SubmitPage({ layered = false }) {
  const [form, setForm] = useState(BLANK);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  // Restored on mount rather than in a lazy initialiser. The initialiser form
  // runs on the server too, where there is no localStorage, so the server
  // would render an empty form and the browser a full one — which is a
  // hydration mismatch, not a feature. One frame of empty fields is the cost
  // and it is the right one.
  useEffect(() => {
    let kept = null;
    try { kept = JSON.parse(window.localStorage.getItem(DRAFT_KEY) || 'null'); } catch {}
    // The unsent draft wins where it has something, because it is this
    // person mid-sentence; the remembered sender fills the rest.
    const known = recallSender();
    setForm({
      pick: kept?.pick ?? null,
      note: kept?.note ?? '',
      name: kept?.name || known.name,
      address: kept?.address || known.address,
    });
  }, []);

  // Kept on every change, so there is no moment at which something typed is
  // only on screen. Skipped once the send has gone through — at that point
  // what is on screen is a receipt, not a draft.
  useEffect(() => {
    if (done) return;
    if (form === BLANK) return;
    try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch {}
  }, [form, done]);

  function set(key) {
    return e => setForm(f => ({ ...f, [key]: e.target.value }));
  }

  async function handleSend(e) {
    e.preventDefault();
    setError('');
    if (!form.pick) { setError('Pick an album first.'); return; }
    if (!form.note.trim()) { setError('Say something about it — that’s the part that matters.'); return; }
    if (!form.name.trim()) { setError('Add your name.'); return; }

    setSending(true);
    try {
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          album: form.pick.album,
          artist: form.pick.artist,
          year: form.pick.year,
          note: form.note,
          submitter_name: form.name,
          sender_url: form.address,
          album_art: form.pick.art,
          collection_id: form.pick.collectionId,
        }),
      });
      const data = await res.json();
      if (data.error) { setError(data.error); return; }
      // Only once it has actually gone. A name or address kept from a send
      // that failed would be prefilling from something that never happened.
      keepSender({ name: form.name, address: form.address });
      try { window.localStorage.removeItem(DRAFT_KEY); } catch {}
      setDone(true);
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setSending(false);
    }
  }

  function sendAnother() {
    // The address survives — it is the one thing about the sender that does
    // not change between two sends in the same sitting.
    setForm({ ...BLANK, name: form.name, address: form.address });
    setError('');
    setDone(false);
  }

  return (
    <div className={'sb-page' + (layered ? ' sb-page--layered' : '')} style={{ fontFamily: fonts.sans }}>

      <SiteNav />

      {/* ── What this page is, said once and quietly ──────────────────────
          The big title went. On the layer it was captioning a button that had
          just been pressed — you know what you tapped — and it was the largest
          thing on a screen whose subject is somebody else's record.

          It survives as one small line under the mark, and only on the
          standalone address, which is the one case where nothing has been
          pressed: a link somebody was sent, a bookmark, a QR. The layer is
          always arrived at through the button, so there is nothing there for a
          title to tell anyone.

          The header element stays either way, because it is what holds the
          nav row's clearance. Empty on the layer, which costs nothing. */}
      <header className="sb-hero">
        {!layered && <div className="sb-hero-line">Send an album</div>}
      </header>

      <main className="sb-main">
        {done ? (
          <>
            <div className="sb-done">
              <div className="sb-done-title">Sent.</div>
              <p className="sb-done-body">
                Thanks, {form.name}. It’s on the shelf with your note on it.
              </p>
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 22 }}>
              <button type="button" className="ln-pill" onClick={sendAnother}>
                Send another →
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={handleSend} className="sb-fields">

            {/* No label over this one, in either state, and the reason is
                already written down: the beacon stopped captioning itself
                because "Now listening" said what the screen was showing. A
                cover with its title and artist under it is that same shape,
                and so is the empty sleeve standing where it will go — with the
                field's own placeholder asking for an artist or an album, a
                heading saying "The album" is the caption that decision
                removed. It also hung at the left margin beside a centred
                square, which is what made it look wrong before it was worked
                out why.

                The text fields below keep theirs. A picture says what it is
                and an empty box does not. */}
            <AlbumFinder
              picked={form.pick}
              onPick={pick => { setForm(f => ({ ...f, pick })); setError(''); }}
              onClear={() => setForm(f => ({ ...f, pick: null }))}
            />

            {/* Not an optional notes box at the foot of the form. This is the
                part being sent — the album is what it is about — so it sits
                directly under the record and gets the page's only paragraph of
                room. The label is one word because the placeholder is doing
                the teaching: three real openings, which say what belongs here
                far better than an instruction to say why would. */}
            <div>
              <span className="sb-label">Message <span className="sb-req">*</span></span>
              {/* Grows with the message. A box that scrolled inside itself
                  made a long note hard to read back; this one is as tall as
                  the writing, and the page scrolls instead. */}
              <textarea
                className="sb-field sb-field--grows"
                value={form.note}
                onChange={event => {
                  set('note')(event);
                  const el = event.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = `${el.scrollHeight}px`;
                }}
                placeholder="Here’s that album we talked about."
                rows={3}
              />
            </div>

            {/* Side by side wherever there is width for it. Two short fields
                stacked left a whole column of empty page beside them and cost
                a row of height the page did not have on a short window; the
                rule that used to divide them is gone with the stack, because
                the asterisks already say which one can be skipped and a
                divider cannot sit between two things in the same row. */}
            <div className="sb-pair">
              <div>
                <span className="sb-label">Your name <span className="sb-req">*</span></span>
                <input className="sb-field" value={form.name} onChange={set('name')} />
              </div>
              <div>
                <span className="sb-label">Do you have a Listening Notes?</span>
                <input
                  className="sb-field"
                  value={form.address}
                  onChange={set('address')}
                  placeholder="yourname.example.com"
                  autoComplete="off"
                  inputMode="url"
                />
              </div>
            </div>

            {error && <div className="sb-error">{error}</div>}

            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button type="submit" className="sb-send" disabled={sending}>
                {sending ? 'Sending…' : 'Send it'}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
