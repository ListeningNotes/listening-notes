// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/FolderFooter.js
// The one piece of chrome a folder adds: a band of tabs at the foot of the
// screen, one for each entry in the record.
//
// A record with more than one entry is a folder, and a folder opens to an
// entry and flips sideways for the rest (Miyel's brief, 2026-09-25). This
// says what else is in it and where you are: a tab for each entry, oldest
// first, the one you are on in ink. A listen wears the record and says
// Listen — Listen 1, Listen 2 once the record has been played more than
// once, because numbers stay numbers — and a track note wears the note and
// says its song. Pressing one goes to that page of the folder; so does a
// swipe (useFolder, in LayerEntry.js).
//
// ── Why the foot, 2026-09-25 ─────────────────────────────────────────────
// For a day it was a row of dots standing where the journal's mark stands,
// with the month under them. Miyel, on seeing them: a folder should not lose
// the mark, dots say there is more without saying what, and "the bottom is
// where it belongs" — the rest of the site keeps its way around in a band at
// the foot (Footer.js), and this is drawn the way that one is: the page's
// ground, a glyph over a word, the one you are on in ink. There is no date on
// it. Every entry carries its own, once, near its top.
//
// ── What it stands aside for ─────────────────────────────────────────────
// One row at the foot of the screen at a time, the rule the cross's band
// keeps. `away` is the page saying something else has the foot — a
// correction's bar, the printer, the send sheet — and a field being written
// into says so for itself, because the keyboard is coming up under it.
//
// `folder` is the record's entries, oldest first; `slug` the one on screen;
// `onPick` what useFolder hands back. Left out, the band is drawn still —
// LayerWaiting draws it that way while the page it names is on its way, so
// the band holds through a flip rather than blinking out for the fetch.

'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MusicNoteSimple, VinylRecord } from '@phosphor-icons/react';

export default function FolderFooter({ folder, slug, onPick = null, away = false }) {
  const row = useRef(null);
  const [typing, setTyping] = useState(false);
  const [slides, setSlides] = useState(false);
  // The tab pressed lights at once. On a sheet the page it opens is a fetch
  // away, and a press that answered only when that page landed read as a
  // press that had missed. One at a time: the band is drawn afresh with the
  // page it opened.
  const [going, setGoing] = useState(null);
  const here = going || slug;

  useEffect(() => {
    const quit = new AbortController();
    document.addEventListener('focusin', event => {
      const field = event.target;
      setTyping(Boolean(field?.matches?.('textarea, input') || field?.isContentEditable));
    }, { signal: quit.signal });
    document.addEventListener('focusout', () => setTyping(false), { signal: quit.signal });
    return () => quit.abort();
  }, []);

  // A long folder runs off the sides and slides along under the thumb, with
  // the page you are on brought to the middle of it. While it slides it
  // claims a sideways drag for itself (data-slide, which both swipes read),
  // or scrolling the tabs would turn the page.
  useLayoutEffect(() => {
    const el = row.current;
    if (!el) return;
    const over = el.scrollWidth > el.clientWidth + 1;
    setSlides(over);
    const lit = el.querySelector('[aria-current]');
    if (over && lit) el.scrollLeft = lit.offsetLeft - (el.clientWidth - lit.offsetWidth) / 2;
  }, [folder, slug]);

  const at = folder.findIndex(e => e.slug === here);
  return (
    <nav className={'ff' + (away || typing ? ' ff--away' : '')} aria-label={`Entry ${at + 1} of ${folder.length}`}>
      <div ref={row} className="ff-row" data-slide={slides ? '' : undefined}>
        {folder.map(e => (
          <button
            key={e.slug}
            type="button"
            className={'ff-tab' + (e.slug === here ? ' ff-tab--here' : '')}
            onClick={() => {
              if (!onPick || going || e.slug === here) return;
              setGoing(e.slug);
              onPick(e);
            }}
            aria-current={e.slug === here ? 'page' : undefined}
          >
            {e.song
              ? <MusicNoteSimple size={17} weight="regular" aria-hidden="true" className="ff-mark" />
              : <VinylRecord size={17} weight="regular" aria-hidden="true" className="ff-mark" />}
            <span className="ff-word">{e.song || (e.listen_total > 1 ? `Listen ${e.listen_number}` : 'Listen')}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
