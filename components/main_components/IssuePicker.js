// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// components/main_components/IssuePicker.js
// Add yours: one of your own records sent to this month's prompt
// (Community, Issue.js), in the send sheet's popup (SendSheet.js) — the
// question and the album, no arrow and no destination square: a keeper's
// journal is Listening Notes to them, and a square saying where it goes
// read as sending it back there (Miyel, 2026-11-14). One record a press, "1 of 3 this
// month": the three are a month's allowance to come back to, not a tray to
// fill now.
//
// The left square is filled from your wall, never a search: if nothing on
// the wall answers the prompt, the answer is to go and listen. Filled, the
// sheet shows the post's writing as it would go, read-only, with two doors:
// Send your post, or Write a new entry, which starts a listen of the same
// record — the words live in the journal and nowhere else (Miyel,
// 2026-11-13: one place to write; the issue shows the post as it was sent).
//
// What goes is the post as it stands, through the prompt's own door
// (/api/prompt, library/month_prompt.js). A send that fails keeps the record
// in the square and says why. Sent, the popup becomes the send sheet's
// letter, on its way to Community.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { MagnifyingGlass, X } from '@phosphor-icons/react';
import { useMonthPrompt } from './MonthPrompt';
import { SentLetter, LETTER_HOLD_MS, LETTER_GO_MS } from './SendSheet';

export default function IssuePicker({ prompt, left, sent, onClose, onSent }) {
  const router = useRouter();
  const [, tellPrompt] = useMonthPrompt(true);
  const [records, setRecords] = useState(null);
  const [thing, setThing] = useState(null);
  const [writing, setWriting] = useState({});
  const [sending, setSending] = useState(false);
  const [trouble, setTrouble] = useState('');
  const [find, setFind] = useState('');
  const [gone, setGone] = useState(null);
  const [going, setGoing] = useState(false);
  const closeRef = useRef(onClose);
  const sentRef = useRef(onSent);
  useEffect(() => { closeRef.current = onClose; sentRef.current = onSent; }, [onClose, onSent]);

  const most = prompt?.most || 3;
  const which = Math.min(most, most - left + 1);

  // The wall's records, newest first, less any already sent.
  useEffect(() => {
    let live = true;
    fetch('/api/entries').then(r => (r.ok ? r.json() : { entries: [] })).catch(() => ({ entries: [] })).then(d => {
      if (!live) return;
      const out = new Set((sent || []).map(r => r.slug));
      setRecords((d.entries || []).filter(e => e.slug && !out.has(e.slug)));
    });
    return () => { live = false; };
  }, [sent]);

  // The writing the chosen record would send, read once each.
  useEffect(() => {
    const slug = thing?.slug;
    if (!slug || writing[slug] !== undefined) return;
    fetch(`/api/entries/${encodeURIComponent(slug)}`).then(r => (r.ok ? r.json() : null)).catch(() => null).then(d => {
      setWriting(w => ({ ...w, [slug]: String(d?.entry?.notes || '') }));
    });
  }, [thing, writing]);

  const shut = useCallback(() => { if (!sending) closeRef.current?.(); }, [sending]);

  // Escape puts it away, but not the letter, which leaves on its own.
  useEffect(() => {
    const key = e => { if (e.key === 'Escape' && !gone) shut(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [shut, gone]);

  // The letter's clock, as the send sheet's: it holds, goes, and the issue
  // is read again behind it.
  useEffect(() => {
    if (!gone) return undefined;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const hold = setTimeout(() => setGoing(true), LETTER_HOLD_MS);
    const done = setTimeout(() => sentRef.current?.(), LETTER_HOLD_MS + (still ? 0 : LETTER_GO_MS));
    return () => { clearTimeout(hold); clearTimeout(done); };
  }, [gone]);

  const send = async () => {
    if (!thing || sending) return;
    setSending(true);
    setTrouble('');
    const answer = await fetch('/api/prompt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: thing.slug }),
    }).then(r => r.json()).catch(() => null);
    setSending(false);
    if (!answer?.ok) {
      setTrouble(answer?.error || 'It couldn’t be sent just now. Try again in a minute.');
      return;
    }
    if (answer.prompt) tellPrompt(answer.prompt);
    setGone({ song: thing.song, album: thing.album, artist: thing.artist, art: thing.album_art });
  };

  // A new entry is a new listen of the same record, opened the way a post's
  // Listen again opens one (FullPostPage.js, revisit).
  const writeNew = () => {
    try {
      window.localStorage.setItem('ln_pending_session', JSON.stringify({
        album: thing.album,
        artist: thing.artist || '',
        year: thing.year || '',
        artUrl: thing.album_art || '',
        collectionId: thing.collection_id || null,
        genre: thing.genre || '',
      }));
    } catch { /* a private window still gets the picker, one tap further on */ }
    router.push('/session');
  };

  // The wall searched as you type: an album, an artist or a song. Your own
  // wall only, never the catalogue.
  const sought = find.trim().toLowerCase();
  const shown = !records || !sought ? records
    : records.filter(r => [r.album, r.artist, r.song].some(v => String(v || '').toLowerCase().includes(sought)));

  if (typeof document === 'undefined') return null;
  const words = thing ? writing[thing.slug] : undefined;

  return createPortal(
    <>
      <div className={'sn-scrim' + (going ? ' sn-scrim--going' : '')} aria-hidden="true" />
      <div className="sn-room" onClick={e => { if (e.target === e.currentTarget && !gone) shut(); }}>
        {gone ? (
          <SentLetter to="Community" thing={gone} going={going} />
        ) : (
          <section className={'sn-popup ip-popup' + (thing ? '' : ' sn-popup--picking')} role="dialog" aria-modal="true" aria-label="Add yours">
            <button type="button" className="sn-shut" onClick={shut} aria-label="Close" disabled={sending}>
              <X size={18} weight="regular" aria-hidden="true" />
            </button>

            {/* The question and the album, nothing between them (Miyel,
                2026-11-14: "there really doesn't even need to be a to and an
                arrow… maybe it can simply be the album"). */}
            <p className="ip-tip">{prompt?.said}</p>
            <p className="ip-count">{which} of {most} this month</p>

            {thing && (
              <button
                type="button"
                className="ip-album"
                onClick={() => { if (!sending) { setThing(null); setTrouble(''); } }}
                aria-label={`${thing.song || thing.album} — tap to choose another`}
              >
                {thing.album_art ? <img src={thing.album_art} alt="" /> : <span className="sn-slot-none" aria-hidden="true" />}
                <span className="sn-slot-name">{thing.song || thing.album}</span>
                <span className="sn-slot-sub">{thing.artist}</span>
              </button>
            )}

            <div className="sn-rule" aria-hidden="true" />

            {!thing ? (
              <div className="sn-shelf ip-shelf">
                {/* The session's own boxed search (.ses-search), so it reads
                    as the field it is. */}
                <label className="ses-search ip-find">
                  <MagnifyingGlass size={18} weight="regular" aria-hidden="true" />
                  <input
                    className="ses-input"
                    value={find}
                    onChange={e => setFind(e.target.value)}
                    placeholder="Search your wall"
                    aria-label="Search your wall"
                    autoComplete="off"
                  />
                </label>
                {records === null ? (
                  <p className="sn-empty">…</p>
                ) : records.length === 0 ? (
                  <p className="sn-empty">Nothing on your wall to send yet. Go and listen.</p>
                ) : shown.length === 0 ? (
                  <p className="sn-empty">Nothing on your wall by that name.</p>
                ) : (
                  <div className="ip-wall">
                    {shown.map(r => (
                      <button key={r.slug} type="button" className="ip-one" onClick={() => { setThing(r); setTrouble(''); }} aria-label={r.song || r.album}>
                        {r.album_art ? <img src={r.album_art} alt="" loading="lazy" /> : <span>♪</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="ip-post">
                <span className="sn-ask">Your post</span>
                {words === undefined
                  ? <p className="ip-writing ip-writing--none">…</p>
                  : words
                    ? <p className="ip-writing">{words}</p>
                    : <p className="ip-writing ip-writing--none">Nothing written; the record goes alone.</p>}
                {trouble && <p className="sn-error">{trouble}</p>}
                <button type="button" className="sn-send" onClick={send} disabled={sending}>
                  <span>{sending ? 'Sending…' : 'Send your post'}</span>
                </button>
                <button type="button" className="ln-word ip-new" onClick={writeNew} disabled={sending}>Write a new entry</button>
                <p className="sn-foot-say">On the issue for anyone: the record, this writing, and your name.</p>
              </div>
            )}
          </section>
        )}
      </div>
    </>,
    document.body
  );
}
