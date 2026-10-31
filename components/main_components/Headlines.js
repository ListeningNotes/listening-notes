// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// components/main_components/Headlines.js
// The top of Friends: who is logging right now, or, while nobody is, what
// friends logged lately drifting by.
//
// Until 2026-10-30 this was a board of sentences, one friend's newest thing
// at a time, rolling up every seven seconds (Miyel's Friends brief, step
// three, 2026-10-27). She asked for it back the other way, with a friend
// on: "I do miss the old screen where there was almost like a card for the
// person who was online and their beacon showed up … when no one's online,
// I just don't like this like scrolling news board type thing … Maybe the
// albums can scroll from like scroll left to right slowly." The board is in
// git (c3b1b891).
//
// ── Somebody on ───────────────────────────────────────────────────────────
// The room's old cards (2026-10-06): a pulsing dot, LOGGING RIGHT NOW, and
// a row of cards that scrolls sideways — the record's art, the friend with
// a live dot, the record and the artist — in the row's own order. A card
// opens their page, where their beacon is. The styles are the Board's
// band's still (forms.css, .fr-now).
//
// ── Nobody on ─────────────────────────────────────────────────────────────
// What friends logged lately, one of each friend's in turn (never by how
// much anybody logs), drifting left to right: a small cover with the friend
// and the record under it (her pick of the two looks, 2026-10-31). The belt
// runs on without a seam — the covers are laid twice, enough times over to
// fill a screen, and it moves one half its length a lap. It waits while
// Friends is off show or a finger is on it. A cover opens that entry inside
// this journal, as home's records do (2026-10-28).
//
// Only what the public reads carry: a friend's beacon, and their feed's
// allow-listed fields. Never what they sent you: that waits on their face
// (Friend_panel.js), which stops Friends becoming an inbox again.

import { useMemo } from 'react';
import Link from 'next/link';
import { handOff } from '../../library/handoff';

// The most covers on the belt, and the fewest it is laid out to, so a short
// list still fills a screen.
const DRIFT_MOST = 14;
const DRIFT_FILL = 8;
// How long each cover takes to pass, so a lap's pace is one whatever the
// count.
const DRIFT_SECONDS_EACH = 5;

// `friends` is Friends' row, in its order; `onScreen` whether Friends is the
// pane on show.
export default function Headlines({ friends, onScreen = true }) {
  const on = (friends || []).filter(f => f.live && f.person && f.beacon?.album);
  if (on.length) return <LoggingNow friends={on} />;
  return <Drift friends={friends} onScreen={onScreen} />;
}

// Each friend's entries newest first, taken one from each in turn.
function lately(friends) {
  const theirs = (friends || [])
    .filter(f => f.person && !f.stranger)
    .map(f => [...(f.entries || [])]
      .filter(e => e.posted_at && e.album_art && e.slug)
      .sort((a, b) => Date.parse(b.posted_at) - Date.parse(a.posted_at))
      .map(e => ({ friend: f, entry: e })));
  const out = [];
  for (let round = 0; out.length < DRIFT_MOST && theirs.some(t => t[round]); round++) {
    for (const t of theirs) if (t[round] && out.length < DRIFT_MOST) out.push(t[round]);
  }
  return out;
}

function Drift({ friends, onScreen }) {
  const covers = useMemo(() => lately(friends), [friends]);
  if (!covers.length) return null;
  const times = Math.ceil(DRIFT_FILL / covers.length);
  const half = Array.from({ length: times }, () => covers).flat();
  return (
    <section className={'hl-drift' + (onScreen ? '' : ' hl-drift--still')} aria-label="Lately">
      <div className="hl-drift-window">
        <div className="hl-drift-belt" style={{ '--drift-lap': `${half.length * DRIFT_SECONDS_EACH}s` }}>
          {[...half, ...half].map(({ friend, entry: e }, i) => {
            const page = `/dashboard/people/${friend.person.id}/${encodeURIComponent(e.slug)}`;
            const title = e.song || e.album;
            // Only the first lap is read out and reached by the keyboard;
            // the rest are the same covers again.
            const first = i < covers.length;
            return (
              <Link
                key={i}
                href={page}
                className="hl-drift-one"
                onClick={() => handOff(e)}
                aria-label={first ? `${friend.name}: ${title}` : undefined}
                aria-hidden={first ? undefined : true}
                tabIndex={first ? undefined : -1}
              >
                <span className="hl-drift-art" data-grows={first ? page : undefined}>
                  <img src={e.album_art} alt="" loading="lazy" onError={ev => { ev.currentTarget.style.visibility = 'hidden'; }} />
                </span>
                <span className="hl-drift-who">{friend.name}</span>
                <span className="hl-drift-rec">{title}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function LoggingNow({ friends }) {
  return (
    <section className="fr-now hl-now" aria-label="Logging right now">
      <p className="fr-now-head">
        <span className="fr-now-pulse" aria-hidden="true" />
        Logging right now
      </p>
      <div className="fr-now-row">
        {friends.map(f => {
          const b = f.beacon;
          const title = b.track || b.album;
          const by = b.track ? [b.album, b.artist].filter(Boolean).join(' · ') : b.artist;
          const label = `${f.name} is logging ${title}${by ? ` · ${by}` : ''}`;
          return (
            <Link key={f.address} href={`/dashboard/people/${f.person.id}`} className="fr-on" aria-label={label} title={label}>
              <span className="fr-on-art" aria-hidden="true">
                {b.art
                  ? <img src={b.art} alt="" loading="lazy" onError={e => { e.currentTarget.style.display = 'none'; }} />
                  : <span>&#9834;</span>}
              </span>
              <span className="fr-on-who">
                <span className="fr-on-dot" aria-hidden="true" />
                {f.name}
              </span>
              <span className="fr-on-rec">{title}</span>
              <span className="fr-on-by">{by}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
