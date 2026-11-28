// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// The landing, 2026-11-27: the profile (Miyel's direction the same day, "the
// profile becomes the screensaver"; prototype WPHWjQAB3sYSbtLAjEiFRb). It is
// what anybody opens a journal to on a phone, the keeper as well as a visitor:
// the screensaver's covers moving over the whole screen (Place.js), and the
// keeper low and light at its foot — the face, the name, since when and how
// many, the marks with their counts, the rig and the links each one quiet
// line — and their answers to the card's openings coming up one at a time as
// a speech bubble from the face, always above the face and name, never over
// them (her ask). A tap on the covers goes in: they settle into the wall.
//
// The same for everybody. The keeper's face and name open the card to edit
// it (onEdit); a visitor's do nothing more than show them.
import Link from 'next/link';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { Fingerprint, Heart, PencilSimple, Plus, PushPin, Shuffle, SketchLogo, User, X } from '@phosphor-icons/react';
import { journalUrl, recallSender, tidyJournal } from '../../library/return_address';
import { useBookplate } from './Bookplate';
import { readBioAnswers } from '../../library/bioprompt';
import { identify, readLink, rigIcon } from '../../library/card_links';
import { sizedAlbumArt } from '../../library/music_data_api';
import { useListeningBeacon } from '../../hooks/useListeningBeacon';

export const PINNED_EVENT = 'ln-pinned';
const SAYS_MS = 6500;

// A month and a year, never a day, as the card prints it.
function monthAndYear(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', timeZone: 'UTC' });
}

export default function Landing({ stamps = null, keeper = false, onEdit = null }) {
  const {
    portrait_url: portrait, portrait_position, cover_name, bioanswers,
    founded_at, rig, rig_icon, social_links,
  } = useBookplate();
  const said = readBioAnswers(bioanswers);
  const since = monthAndYear(founded_at) || monthAndYear(stamps?.first_listen);
  const records = stamps?.records ?? null;
  const marks = [
    { key: 'favorites', n: stamps?.favorites ?? 0, Icon: Heart, weight: 'fill', tone: 'var(--fav)', word: 'favorites' },
    { key: 'masterpieces', n: stamps?.masterpieces ?? 0, Icon: SketchLogo, weight: 'fill', tone: 'var(--mp)', word: 'masterpieces' },
    { key: 'formative', n: stamps?.formative ?? 0, Icon: Fingerprint, weight: 'bold', tone: 'var(--formative)', word: 'formative' },
  ].filter(m => m.n > 0);
  const rigNames = (Array.isArray(rig) ? rig : []).map(r => r?.name?.trim()).filter(Boolean);
  const RigIcon = rigIcon(rig_icon).Icon;
  const links = (Array.isArray(social_links) ? social_links.map(readLink) : [])
    .filter(l => l.url?.trim())
    .map(l => identify(l.url.trim(), l.icon))
    .filter(Boolean)
    .slice(0, 3);

  // One answer at a time, from the face: it grows out of the face's corner,
  // stays, shrinks back, and the next comes. Never moving for somebody who
  // asked for less motion — the first answer simply stays.
  // While the keeper is logging, the bubble says that instead and stays up,
  // and the face wears a green ring (Miyel, 2026-11-27: "that way it feels
  // like a rare occurrence but you might catch them"). The profile is the
  // only place a visitor sees a listen now; the inside does not (HomeNav).
  const { isLive, album: onAirAlbum, artist: onAirArtist, art: onAirArt } = useListeningBeacon();
  const live = Boolean(isLive && onAirAlbum);
  const [turn, setTurn] = useState(0);
  const [up, setUp] = useState(false);
  useEffect(() => {
    if (live) { const t = window.setTimeout(() => setUp(true), 300); return () => window.clearTimeout(t); }
    if (!said.length) return undefined;
    const quiet = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const first = window.setTimeout(() => setUp(true), 700);
    if (quiet || said.length < 2) return () => window.clearTimeout(first);
    let down = 0;
    const tick = window.setInterval(() => {
      setUp(false);
      down = window.setTimeout(() => { setTurn(t => t + 1); setUp(true); }, 450);
    }, SAYS_MS);
    return () => { window.clearTimeout(first); window.clearInterval(tick); window.clearTimeout(down); };
  }, [said.length, live]);
  const saying = said.length ? said[turn % said.length] : null;

  const who = (
    <>
      <span className={'ld-face' + (live ? ' ld-face--live' : '')}>
        {portrait
          ? <img src={portrait} alt="" style={{ objectPosition: portrait_position || '50% 50%' }} />
          : <User size={26} weight="light" aria-hidden="true" />}
      </span>
      <span className="ld-who-said">
        <span className="ld-name">
          {cover_name}
          {keeper && <PencilSimple className="ld-edit" size={15} weight="regular" aria-hidden="true" />}
        </span>
        {(since || records !== null) && (
          <span className="ld-since">
            {[since ? `Since ${since}` : null, records !== null ? `${records} albums` : null].filter(Boolean).join(' · ')}
          </span>
        )}
      </span>
    </>
  );

  return (
    <section className="ld" aria-label={cover_name || 'This journal'} onClick={e => e.stopPropagation()}>
      <div className="ld-me">
        {live ? (
          <p className={'ld-bubble ld-bubble--live' + (up ? ' ld-bubble--up' : '')}>
            {onAirArt ? <img className="ld-bubble-art" src={sizedAlbumArt(onAirArt, 120)} alt="" /> : null}
            <span className="ld-bubble-live">
              <span className="ld-bubble-ask"><i className="ld-live-dot" aria-hidden="true" />Logging</span>
              <span className="ld-bubble-said"><b>{onAirAlbum}</b>{onAirArtist ? ` · ${onAirArtist}` : ''}</span>
            </span>
          </p>
        ) : saying && (
          <p className={'ld-bubble' + (up ? ' ld-bubble--up' : '')} aria-live="off">
            <span className="ld-bubble-ask">{saying.text.replace(/\s*[—–-]\s*$/, '')}</span>
            <span className="ld-bubble-said">{saying.answer}</span>
          </p>
        )}
        {keeper && onEdit
          ? <button type="button" className="ld-who" onClick={onEdit} aria-label="Edit your card">{who}</button>
          : <div className="ld-who">{who}</div>}
      </div>
      {marks.length > 0 && (
        <p className="ld-marks">
          {marks.map(m => (
            <span key={m.key} className="ld-mark" title={`${m.n} ${m.word}`}>
              <m.Icon size={16} weight={m.weight} color={m.tone} aria-hidden="true" />
              {m.n}<span className="ld-hidden"> {m.word}</span>
            </span>
          ))}
        </p>
      )}
      {(rigNames.length > 0 || links.length > 0) && (
        <div className="ld-meta">
          {rigNames.length > 0 && (
            <p className="ld-rig">
              {RigIcon && <RigIcon size={15} weight="regular" aria-hidden="true" />}
              <span>{rigNames.join(' · ')}</span>
            </p>
          )}
          {links.length > 0 && (
            <p className="ld-links">
              {links.map(({ href, label, Icon }) => (
                <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="ld-link">
                  <Icon size={15} weight="regular" aria-hidden="true" />
                  {label}
                </a>
              ))}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

// ── A visitor's doors, 2026-11-27 ───────────────────────────────────────
// What visiting is for, Compare and Add (Miyel: "when you visit someone all
// you can do is add them and compare with them"), at the top right of the
// row where the keeper's own stops stand (Header.js, doors). Both happen on
// the visitor's own journal — this one cannot write to theirs (AGENTS,
// Never) — so both open their page about this keeper there, where Add is in
// its top row. A visitor whose browser does not know their journal is asked
// for it once, in a field at the top of the wall (AskJournal).
const pageAboutThem = home => `${journalUrl(home)}/dashboard/people/${encodeURIComponent(window.location.host)}`;
export const VISITOR_DOORS = [
  { key: 'compare', word: 'Compare', Icon: Shuffle },
  { key: 'add', word: 'Add', Icon: Plus },
];
// Goes to the visitor's own journal when the browser knows it; says no when not.
export function visitTheirs() {
  const home = tidyJournal(recallSender().address);
  if (!home) return false;
  window.location.href = pageAboutThem(home);
  return true;
}
export function AskJournal() {
  const [typed, setTyped] = useState('');
  function go(event) {
    event.preventDefault();
    const home = tidyJournal(typed);
    if (home) window.location.href = pageAboutThem(home);
  }
  return (
    <form className="ld-doors-ask" onSubmit={go}>
      <input
        className="ln-say-field"
        value={typed}
        onChange={e => setTyped(e.target.value)}
        placeholder="Your journal"
        aria-label="Your journal"
        autoComplete="off"
        inputMode="url"
        autoFocus
      />
      <button type="submit" className="ln-word">Go</button>
    </form>
  );
}

// ── Pin this line, 2026-11-25 ─────────────────────────────────────────────
// On the keeper's own post: select words in the album note and "Pin this
// line" comes up at the foot of the screen. The words are sent as selected
// and kept only if the note says them (library/pinned_actions.js). With three
// pinned already, the three come up to choose which one this replaces. The
// note says where it may be lifted from with data-pin-from (FullPostPage).
export function PinThisLine({ chosen = null, onPinned = null }) {
  const [selected, setPicked] = useState(null);
  // A line chosen by tapping (LineChooser) stands in for a selection.
  const picked = chosen || selected;
  const [full, setFull] = useState(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const look = () => {
      if (chosen) return;
      const sel = window.getSelection();
      const text = sel && !sel.isCollapsed ? sel.toString().replace(/\s+/g, ' ').trim() : '';
      const from = text && sel.anchorNode ? (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement)?.closest?.('[data-pin-from]') : null;
      if (from && text.length >= 2) { setPicked({ slug: from.getAttribute('data-pin-from'), line: text }); setDone(false); }
      else if (!full) setPicked(null);
    };
    document.addEventListener('selectionchange', look);
    return () => document.removeEventListener('selectionchange', look);
  }, [full, chosen]);
  async function pin(replacing = null) {
    if (!picked) return;
    const r = await fetch('/api/pinned', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: picked.slug, line: picked.line, replacing }),
    }).catch(() => null);
    const data = r ? await r.json().catch(() => null) : null;
    if (data?.full) { setFull(data.pinned); return; }
    setFull(null);
    if (r?.ok) {
      setDone(true);
      window.dispatchEvent(new Event(PINNED_EVENT));
      window.getSelection()?.removeAllRanges();
      window.setTimeout(() => { setDone(false); setPicked(null); onPinned?.(); }, onPinned ? 700 : 1400);
    }
  }
  if (!picked && !done && !chosen) return null;
  return (
    <div className="pin-line-bar" role="region" aria-label="Pin this line">
      {full ? (
        <div className="pin-line-full">
          <span className="pin-line-ask">In place of</span>
          {full.map(up => (
            <button key={up.position} type="button" className="pin-line-instead" onClick={() => pin(up.position)} aria-label={up.album}>
              {up.album_art ? <img src={sizedAlbumArt(up.album_art, 120)} alt="" /> : <span>♪</span>}
            </button>
          ))}
          <button type="button" className="pin-line-never" onClick={() => setFull(null)} aria-label="Keep the three as they are"><X size={16} weight="bold" aria-hidden="true" /></button>
        </div>
      ) : (
        <button type="button" className="pin-line-key" onMouseDown={e => e.preventDefault()} onClick={() => pin()} disabled={done || !picked}>
          <PushPin size={18} weight="regular" aria-hidden="true" />
          {done ? 'Pinned' : 'Pin this line'}
        </button>
      )}
    </div>
  );
}

// ── Choosing a pin, 2026-11-25 ────────────────────────────────────────────
// On a phone a selection can barely be made — a word at most, and dragging
// its handles turns the page (Miyel: "on my phone I can't highlight"). So an
// empty place on the keeper's landing opens the wall as a screen of its own,
// "Choose an album" (HomeNav, pinning), and the album opened from it shows
// its note as sentences to tap (LineChooser). Pinning closes the album and
// goes back to the landing with the new pin on it.
let pinningNow = false;
const pinningHeard = new Set();
export function setPinning(on) {
  pinningNow = Boolean(on);
  pinningHeard.forEach(hear => hear());
}
export function usePinning() {
  return useSyncExternalStore(
    hear => { pinningHeard.add(hear); return () => pinningHeard.delete(hear); },
    () => pinningNow,
    () => false,
  );
}

// The notes as sentences — the album note, then each song's note under its
// song's name — tap one to light it, tap the one before or after to carry
// the light on, tap an end to take it back. The lit run is the line, and it
// stays inside one note. Sentences are split where a note has a full stop, a
// question or an exclamation, or a line break, so the run is always words
// the note says, in its order, with only the spaces between them made single.
export function LineChooser({ slug, notes, onPinned }) {
  const pieces = (notes || []).flatMap((note, n) => String(note.text || '')
    .split(/\n+/)
    .flatMap((para, p) => para.split(/(?<=[.!?…])\s+/).map(t => ({ t: t.trim(), p, n }))))
    .filter(piece => piece.t);
  const [run, setRun] = useState(null);
  function press(i) {
    const same = run && pieces[run[0]].n === pieces[i].n;
    if (!run || !same) { setRun([i, i]); return; }
    const [a, b] = run;
    if (i === a - 1) setRun([i, b]);
    else if (i === b + 1) setRun([a, i]);
    else if (a === b && i === a) setRun(null);
    else if (i === a) setRun([a + 1, b]);
    else if (i === b) setRun([a, b - 1]);
    else setRun([i, i]);
  }
  const line = run ? pieces.slice(run[0], run[1] + 1).map(piece => piece.t).join(' ') : '';
  return (
    <>
      <div className="pick-note">
        {pieces.map((piece, i) => {
          const first = i === 0 || pieces[i - 1].n !== piece.n;
          const label = first ? notes[piece.n].label : null;
          return (
            <span key={i}>
              {first && i > 0 && <span className="pick-break pick-break--note" />}
              {label && <span className="pick-label">{label}</span>}
              {!first && pieces[i - 1].p !== piece.p && <span className="pick-break" />}
              <button
                type="button"
                className={'pick-line' + (run && i >= run[0] && i <= run[1] ? ' pick-line--lit' : '')}
                onClick={() => press(i)}
              >
                {piece.t}
              </button>{' '}
            </span>
          );
        })}
      </div>
      <PinThisLine chosen={line ? { slug, line } : null} onPinned={onPinned} />
    </>
  );
}
