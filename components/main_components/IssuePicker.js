// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// components/main_components/IssuePicker.js
// Add yours: one of your own records sent to this month's prompt
// (Community, Issue.js), on the listen's own sheet, risen from the foot. The
// question, your wall, the album, Submit — started simple on purpose (Miyel,
// 2026-11-14): no doors, no new-entry link, nothing to switch. A keeper's
// journal is Listening Notes to them, so nothing here says it goes "to"
// Listening Notes. One record a press, "1 of 3 this month": the three are a
// month's allowance to come back to.
//
// Only from your wall, never a catalogue: everything in the issue was
// really listened to. If the album is not on your wall yet, you listen the
// ordinary way and come back. What goes is the post as it stands, through
// the prompt's own door (/api/prompt, library/month_prompt.js) — its writing
// is already public on your journal, so there is no choice to make about it.
// A send that fails keeps the album chosen and says why.
//
// Sent, the popup closes in around the album's cover and hands the cover's
// place to Community, which flies it into the globe (Issue.js) — in at once,
// with nobody approving it.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { useMonthPrompt } from './MonthPrompt';
import { useBookplate } from './Bookplate';
import StarRating from './StarRating';
import { Emblems, starsOf } from './Issue';
import { washFromArt } from '../../library/music_data_api';

// How long the popup takes to close in around the cover.
const LANDING_MS = 380;
// How long it takes to sink back down when put away.
const SINK_MS = 300;

export default function IssuePicker({ prompt, left, sent, onClose, onSent }) {
  const plate = useBookplate();
  const [, tellPrompt] = useMonthPrompt(true);
  const [records, setRecords] = useState(null);
  const [thing, setThing] = useState(null);
  const [writing, setWriting] = useState({});
  const [sending, setSending] = useState(false);
  const [trouble, setTrouble] = useState('');
  const [find, setFind] = useState('');
  const [wash, setWash] = useState({ art: '', color: '' });
  const [landing, setLanding] = useState(null);   // the clip closing in on the cover
  const popRef = useRef(null);
  const coverRef = useRef(null);
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

  // The chosen album's colour, the wash a post wears (washFromArt), so the
  // popup turns the album's colour when it is chosen (Miyel, 2026-11-14).
  useEffect(() => {
    const art = thing?.album_art || '';
    if (!art) return undefined;
    let live = true;
    washFromArt(art).then(color => { if (live) setWash({ art, color }); });
    return () => { live = false; };
  }, [thing]);
  const tint = thing && wash.art === thing.album_art ? wash.color : '';

  // Put down the way the listen is: it sinks back to the foot, then goes.
  const [sinking, setSinking] = useState(false);
  const shut = useCallback(() => {
    if (sending || sinking) return;
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (still) { closeRef.current?.(); return; }
    setSinking(true);
    setTimeout(() => closeRef.current?.(), SINK_MS);
  }, [sending, sinking]);

  // Escape puts it away, but not once it is on its way.
  useEffect(() => {
    const key = e => { if (e.key === 'Escape' && !landing) shut(); };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [shut, landing]);

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
    // The record as the issue will show it, so Community can put it on the
    // globe now rather than when the publication is next asked.
    const record = {
      key: `mine-${thing.slug}`, album: thing.album, artist: thing.artist, year: thing.year || '',
      art: thing.album_art || '', song: thing.song || '', note: writing[thing.slug] || '',
      name: String(plate?.keeper_name || '').trim(),
      journal: String(plate?.site_address || window.location.host || ''), slug: thing.slug,
      rating: thing.rating || '', favorite: !!thing.favorite, masterpiece: !!thing.masterpiece, formative: !!thing.formative,
      at: new Date().toISOString(),
    };
    // The popup closes in around the cover, then hands the cover's place on.
    const pop = popRef.current?.getBoundingClientRect();
    const cover = coverRef.current?.getBoundingClientRect();
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!pop || !cover || still) { sentRef.current?.({ record, from: cover || null }); return; }
    // From the whole popup to the cover: the start is set a frame ahead so
    // the clip has somewhere to move from.
    setLanding({ clip: 'inset(0px 0px 0px 0px round 26px)' });
    requestAnimationFrame(() => requestAnimationFrame(() => setLanding({
      clip: `inset(${cover.top - pop.top}px ${pop.right - cover.right}px ${pop.bottom - cover.bottom}px ${cover.left - pop.left}px round 12px)`,
    })));
    setTimeout(() => sentRef.current?.({ record, from: { left: cover.left, top: cover.top, width: cover.width, height: cover.height } }), LANDING_MS);
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
      {/* The listen's own sheet (.lay--sheet, entry.css): up from the foot
          in one movement to just under the top row, no box around it, a
          grip that puts it down (Miyel, 2026-11-14: "exactly the same way
          the session does"). */}
        <section
            ref={popRef}
            className={'lay lay--sheet lay--rises ip-popup' + (tint ? ' ip-popup--washed' : '') + (landing ? ' ip-popup--landing' : '') + (sinking ? ' ip-popup--sinking' : '')}
            style={{ ...(tint ? { '--wash': tint } : {}), ...(landing ? { clipPath: landing.clip } : {}) }}
            role="dialog" aria-modal="true" aria-label="Add yours">
            <button type="button" className="lay-grip" onClick={shut} aria-label="Put this away" disabled={sending} />
            <div className="ip-in">

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
                {thing.album_art ? <img ref={coverRef} src={thing.album_art} alt="" /> : <span ref={coverRef} className="sn-slot-none" aria-hidden="true" />}
                <span className="sn-slot-name">{thing.song || thing.album}</span>
                <span className="sn-slot-sub">{[thing.artist, thing.year].filter(Boolean).join(' · ')}</span>
                {(starsOf(thing) > 0 || thing.favorite || thing.masterpiece || thing.formative) && (
                  <span className="ip-marks">
                    {starsOf(thing) > 0 && <StarRating rating={starsOf(thing)} size={15} animate={false} />}
                    <Emblems record={thing} size={15} />
                  </span>
                )}
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
                {/* What Submit does, said before it is pressed. */}
                <p className="ip-what">
                  Submit puts this album and this post in Community, under this
                  month’s question, for anyone to read, with your name. Your
                  journal stays as it is.
                </p>
                {trouble && <p className="sn-error">{trouble}</p>}
                <button type="button" className="sn-send" onClick={send} disabled={sending}>
                  <span>{sending ? 'Submitting…' : 'Submit'}</span>
                </button>
              </div>
            )}
            </div>
        </section>
    </>,
    document.body
  );
}
