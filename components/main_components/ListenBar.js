// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/ListenBar.js
// The way into a listen: a bar at the foot of home. It is the session, closed.
//
// ── The one thing on the site that looks like a button ────────────────────
// Because it is the one thing that *starts* something (Miyel's brief, home and
// the session, 2026-10-21). That is a deliberate exception to "a control is
// the mark, not a mark in a container" (DECISIONS, 2026-09-17), and it
// licenses no second one anywhere else. A raised panel on the page colour,
// and a grip at the top, because the session rises out of it and is lowered
// back into it.
//
// ── Two states, one object ────────────────────────────────────────────────
// At rest it says Start a listen, and pressing it raises the session as a
// sheet over home, opening on the picker. It said Listen, the brief's word,
// until Miyel tried it on her phone, 2026-10-22: "Listen feels so odd" — her
// pick of four, over the beacon's glyph beside it and over the ring's Log a
// listen; the same words the desk's way in already says. With a listen put down — the sheet lowered
// rather than ended (Discard, Save draft and Post end it) — it carries that
// listen: the record's cover, the track that was lit, and the live dot while
// the beacon is saying so. Pressing it raises the listen again, words and
// all. Both are the same address, /session, so the route is the one way in
// and the sheet is the way it is shown over home.
//
// It replaced the ring on the beacon's rule and the chevron under it (Miyel,
// 2026-10-21: "everything leaves in exchange for this").
//
// Owner only, and drawn only once the lock has said so: a visitor has no
// listen to start, and the writing routes check the wristband for themselves
// whatever is drawn.
//
// ── The foot of every page, 2026-10-22 ────────────────────────────────────
// Part of the frame rather than of home (Miyel: "follow each page"): it
// stays at the foot of the screen on every pane and over an entry opened on
// the journal. And it steps down — one row at the foot at a time, her rule
// of 2026-09-20 — whenever something else owns the foot: a correction's
// Save and Cancel, a folder's tabs, the print bar, a sheet, the session it
// raises, or a keyboard.
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrackLength } from '../../library/session_timers';

// What owns the foot when it is on screen. A folder's tabs that have stepped
// aside for a keyboard (ff--away) do not.
const FOOT_ROWS = '.ln-editing-bar, .ff:not(.ff--away), .ln-print-bar, .sn-room, .sn-sheet, .lay--sheet, .lay.ses-preview';

// Whether the foot is taken. Asked of the page whenever anything is added,
// taken away or re-classed, a beat late so a burst of changes is asked once;
// and of the focus, a tick after it moves, which is when activeElement is
// true (HomeNav's typing effect has the same trap).
function useFootTaken() {
  const [taken, setTaken] = useState(false);
  useEffect(() => {
    let soon = 0;
    const look = () => {
      clearTimeout(soon);
      soon = setTimeout(() => {
        const at = document.activeElement;
        const typing = !!at && (at.tagName === 'TEXTAREA' || at.isContentEditable
          || (at.tagName === 'INPUT' && !['button', 'checkbox', 'radio', 'range'].includes(at.type)));
        setTaken(typing || !!document.querySelector(FOOT_ROWS));
      }, 40);
    };
    const watch = new MutationObserver(look);
    watch.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    document.addEventListener('focusin', look);
    document.addEventListener('focusout', look);
    look();
    return () => {
      clearTimeout(soon);
      watch.disconnect();
      document.removeEventListener('focusin', look);
      document.removeEventListener('focusout', look);
    };
  }, []);
  return taken;
}

export default function ListenBar({ held, live = false }) {
  const taken = useFootTaken();
  // Said on the document while the bar is up, so a page laid over the
  // journal can keep its last lines clear of it (nav.css, html[data-listen]).
  useEffect(() => {
    if (taken) return undefined;
    document.documentElement.setAttribute('data-listen', '');
    return () => document.documentElement.removeAttribute('data-listen');
  }, [taken]);
  // A line and nothing else; the bar is what you press, not the grip.
  const grip = <span className="lb-grip" aria-hidden="true" />;
  const down = taken ? ' lb--down' : '';

  if (!held) {
    return (
      <Link href="/session" className={'lb' + down} aria-hidden={taken || undefined} tabIndex={taken ? -1 : undefined}>
        {grip}
        Start a listen
      </Link>
    );
  }

  // The track that was lit when the sheet went down, or the record's own
  // name before any track has been pressed. Under it, which track and how
  // long — the moment, where the beacon above says the record.
  const lit = held.lit?.title ? held.lit : null;
  const length = lit ? TrackLength(lit.duration) : '';
  return (
    <Link
      href="/session"
      className={'lb lb--held' + down}
      aria-hidden={taken || undefined}
      tabIndex={taken ? -1 : undefined}
      title={`Back to ${held.album}`}
      aria-label={`Back to ${held.album}${lit ? `, ${lit.title}` : ''}`}
    >
      {grip}
      {held.artUrl
        ? <img className="lb-art" src={held.artUrl} alt="" aria-hidden="true" />
        : <span className="lb-art lb-art--none" aria-hidden="true">♪</span>}
      <span className="lb-says">
        <span className="lb-title">{lit ? lit.title : held.album}</span>
        <span className="lb-under">
          {lit ? `Track ${lit.number}${length ? ` · ${length}` : ''}` : held.artist}
        </span>
      </span>
      {/* Only while the beacon says so. A listen put down and left goes
          quiet after twenty minutes (library/needle.js), and the bar never
          claims what the beacon has stopped claiming. */}
      {live && (
        <span className="lb-live">
          <i aria-hidden="true" />
          Live
        </span>
      )}
    </Link>
  );
}
