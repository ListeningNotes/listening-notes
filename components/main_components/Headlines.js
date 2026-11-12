// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
// components/main_components/Headlines.js
// The top of Friends: who is logging right now, and nothing while nobody is.
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
// ── Nobody on: nothing, 2026-11-11 ────────────────────────────────────────
// From 2026-10-31 what friends logged lately drifted by here while nobody
// was on. Miyel, 2026-11-11: "I don't think I like the scrolling albums at
// top of Friends" — and the feed under it already shows what they logged.
// So the top is there only while somebody is logging. The belt is in git.

// Only what the public reads carry: a friend's beacon, and their feed's
// allow-listed fields. Never what they sent you: that waits on their face
// (Friend_panel.js), which stops Friends becoming an inbox again.

import Link from 'next/link';

// `friends` is Friends' row, in its order.
export default function Headlines({ friends }) {
  const on = (friends || []).filter(f => f.live && f.person && f.beacon?.album);
  return on.length ? <LoggingNow friends={on} /> : null;
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
