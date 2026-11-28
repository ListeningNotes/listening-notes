// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// The landing, 2026-11-25 (Miyel's brief, the wall as home; her word for it).
// What a visitor lands on, on a phone: the card is not a thing to open any
// more, it is the top of the page. Top to bottom —
//
//   who keeps the journal: the portrait, the name and the card's lines;
//   the lamp, only while a listen is open: the record, a green dot and
//     "Logging [album] · [artist]" — and nothing at all when none is, never
//     an empty slot (green stays live's alone);
//   the pinned albums, up to three, framed and large, each with the one line
//     of the keeper's own writing it was pinned with (library/pinned_actions.js),
//     then title · artist — none at all when nothing is pinned;
//   and the wall under it, as it always was (HomeNav).
//
// The pinned albums are read once when the page opens. They change only when
// the keeper pins, so nothing here asks again on a timer — only when a pin is
// made or taken down on this page (PINNED_EVENT).
//
// The keeper's own face opens this, exactly as a visitor sees it (HomeNav,
// the card), with two things only the keeper is shown: a faint empty frame
// for each place not yet pinned, and a small × to take a pin down. A pin is
// made from a post, by selecting words in its album note (PinThisLine, below).
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { PushPin, User, X } from '@phosphor-icons/react';
import { useBookplate } from './Bookplate';
import { CARD_PROMPT, bioPrompt, readBioAnswers } from '../../library/bioprompt';
import { handOff } from '../../library/handoff';
import { sizedAlbumArt } from '../../library/music_data_api';

export const PINNED_EVENT = 'ln-pinned';
const MOST = 3;

export default function Landing({ live = false, onAir = null, keeper = false, onEmpty = null }) {
  const { portrait_url: portrait, portrait_position, cover_name, bioanswers } = useBookplate();
  // Of the card's openings only the one addressed to the visitor stays under
  // the name; the others are answered by the pins (Miyel, 2026-11-27).
  const lines = readBioAnswers(bioanswers).filter(line => line.key === CARD_PROMPT);
  const [pinned, setPinned] = useState([]);
  const ask = useCallback(() => fetch('/api/pinned')
    .then(r => (r.ok ? r.json() : null))
    .then(data => (Array.isArray(data?.pinned) ? data.pinned : null))
    .catch(() => null), []);
  useEffect(() => {
    let gone = false;
    const read = () => ask().then(list => { if (!gone && list) setPinned(list); });
    read();
    window.addEventListener(PINNED_EVENT, read);
    return () => { gone = true; window.removeEventListener(PINNED_EVENT, read); };
  }, [ask]);
  async function takeDown(position) {
    const r = await fetch(`/api/pinned?position=${position}`, { method: 'DELETE' }).catch(() => null);
    const data = r?.ok ? await r.json() : null;
    if (Array.isArray(data?.pinned)) setPinned(data.pinned);
  }
  // The keeper sees the places still free; a visitor never does.
  const free = keeper ? [1, 2, 3].filter(p => !pinned.some(pin => pin.position === p)).slice(0, MOST - pinned.length) : [];

  return (
    <section className="ld" aria-label={`${cover_name || 'This journal'}`}>
      <div className="ld-who">
        <span className="ld-face">
          {portrait
            ? <img src={portrait} alt="" style={{ objectPosition: portrait_position || '50% 50%' }} />
            : <User size={40} weight="light" aria-hidden="true" />}
        </span>
        <h1 className="ld-name">{cover_name}</h1>
        {lines.length > 0 && (
          <ul className="ld-lines">
            {lines.map(line => (
              <li key={line.key}><span className="ld-prompt">{line.text}</span> {line.answer}</li>
            ))}
          </ul>
        )}
      </div>

      {live && onAir?.album && (
        <p className="ld-lamp">
          {onAir.art ? <img src={sizedAlbumArt(onAir.art, 120)} alt="" /> : <span className="ld-lamp-art" />}
          <i className="ld-lamp-dot" aria-hidden="true" />
          <span className="ld-lamp-words">Logging <b>{onAir.album}</b>{onAir.artist ? ` · ${onAir.artist}` : ''}</span>
        </p>
      )}

      {pinned.length > 0 && (
        <PinnedStack pinned={pinned} keeper={keeper} onTakeDown={takeDown} />
      )}

      {free.length > 0 && (
        <div className="ld-free">
          {free.map(place => (
            <button key={`free-${place}`} type="button" className="ld-frame--empty" onClick={onEmpty || undefined} aria-label="An empty place: pin a line from a post">
              <PushPin size={22} weight="light" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

// ── The stack, 2026-11-27 (Miyel's pick of four moving prototypes) ────────
// The pinned albums share one place on the landing: a deck, the top cover
// whole and the others peeking behind it. The sentence over it is the
// opening the pin answers, finished by the album — "I can never skip —
// Voodoo" — and the keeper's lifted line is under it. Every few seconds the
// top cover slides off to the back and the next one comes up, its name
// rolling into the sentence. Nothing fades: covers slide, words roll.
//
// The top cover opens its post; a cover peeking behind is brought to the
// front by a tap, and so is one by its dot. The turning waits while the page
// is out of sight and does not run at all for somebody who asked their phone
// for less motion. A pin answering no opening is its album's name alone.
const TURN_MS = 4200;
const ROLL_MS = 360;

function PinnedStack({ pinned, keeper, onTakeDown }) {
  const count = pinned.length;
  const [top, setTop] = useState(0);
  const [leaving, setLeaving] = useState(null);
  const [rolling, setRolling] = useState(false);
  const busy = useRef(false);
  const at = count ? top % count : 0;
  const shown = pinned[at];

  const turnTo = useCallback(next => {
    if (busy.current || count < 2) return;
    busy.current = true;
    setLeaving(at);
    setRolling(true);
    window.setTimeout(() => {
      setTop(next % count);
      setLeaving(null);
      setRolling(false);
      busy.current = false;
    }, ROLL_MS);
  }, [at, count]);

  useEffect(() => {
    if (count < 2) return undefined;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const tick = window.setInterval(() => {
      if (document.visibilityState === 'visible') turnTo(at + 1);
    }, TURN_MS);
    return () => window.clearInterval(tick);
  }, [at, count, turnTo]);

  if (!shown) return null;
  const opening = bioPrompt(shown.prompt)?.text || null;
  return (
    <div className="ld-stack">
      <p className="ld-sentence">
        {opening && <span className="ld-roll"><span key={at} className={'ld-roll-in ld-opening' + (rolling ? ' ld-roll-in--out' : '')}>{opening}</span></span>}
        {opening && ' '}
        <span className="ld-roll"><b key={at} className={'ld-roll-in' + (rolling ? ' ld-roll-in--out' : '')}>{shown.album}</b></span>
      </p>
      <div className="ld-deck" style={{ '--behind': Math.max(0, count - 1) }}>
        {pinned.map((pin, i) => {
          const place = (i - at + count) % count;
          const style = i === leaving
            ? { zIndex: count + 1, transform: 'translate(120%, 0) rotate(12deg)' }
            : { zIndex: count - place, transform: `translate(${place * 24}px, ${place * -10}px) rotate(${place * 3}deg) scale(${1 - place * 0.06})` };
          const art = pin.album_art
            ? <img src={sizedAlbumArt(pin.album_art, 600)} alt="" />
            : <span className="ld-mat-none" aria-hidden="true">♪</span>;
          return place === 0 && i !== leaving ? (
            <Link
              key={pin.position}
              href={`/entries/${pin.slug}`}
              className="ld-card"
              style={style}
              data-grows={`/entries/${pin.slug}`}
              onClick={() => handOff(pin)}
              aria-label={pin.album}
            >
              {art}
            </Link>
          ) : (
            <button key={pin.position} type="button" className="ld-card" style={style} onClick={() => turnTo(i)} aria-label={`Bring ${pin.album} to the front`}>
              {art}
            </button>
          );
        })}
        {keeper && (
          <button type="button" className="ld-unpin" onClick={() => onTakeDown(shown.position)} aria-label={`Take ${shown.album} down`}>
            <X size={14} weight="bold" aria-hidden="true" />
          </button>
        )}
      </div>
      <div className="ld-under">
        {shown.line && <p className="ld-said">{shown.line}</p>}
        {shown.artist && <span className="ld-title">{shown.artist}</span>}
        {count > 1 && (
          <span className="ld-dots">
            {pinned.map((pin, i) => (
              <button key={pin.position} type="button" className={'ld-dot' + (i === at ? ' ld-dot--on' : '')} onClick={() => i !== at && turnTo(i)} aria-label={pin.album} />
            ))}
          </span>
        )}
      </div>
    </div>
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
