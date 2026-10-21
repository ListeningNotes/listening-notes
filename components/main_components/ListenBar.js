// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/ListenBar.js
// The way into a listen: a bar at the foot of home with one word on it.
//
// ── The one thing on the site that looks like a button ────────────────────
// Because it is the one thing that *starts* something (Miyel's brief, home and
// the session, 2026-10-21). That is a deliberate exception to "a control is
// the mark, not a mark in a container" (DECISIONS, 2026-09-17), and it
// licenses no second one anywhere else. A raised panel on the page colour,
// the word in the display face, and a grip at the top — drawn now, while
// nothing lifts, because the bar is the session closed and stage 2 of the
// brief raises it from here.
//
// ── The ring's job, with the ring's code behind it ────────────────────────
// It replaced the ring on the beacon's rule and the chevron under it (Miyel,
// 2026-10-21: "everything leaves in exchange for this"). It does exactly what
// the ring did. With nothing in hand, the beacon's floor becomes the picker
// where it stands — `onStart` is HomeNav's openPicker, the ring's own press,
// moved and not changed. With a record in hand it is a link to /session and
// says Resume, because a door you can come back through has to say so (her
// pick, the same day). Stage 2 gives that state the record's cover, the track
// and a live dot.
//
// Owner only, and drawn only once the lock has said so: a visitor has no
// listen to start, and the writing routes check the wristband for themselves
// whatever is drawn.
'use client';

import Link from 'next/link';

export default function ListenBar({ held, onStart }) {
  // A line and nothing else; the bar is what you press, not the grip.
  const grip = <span className="lb-grip" aria-hidden="true" />;

  if (held) {
    return (
      <Link href="/session" className="lb" title={`Resume ${held.album}`} aria-label="Resume listen">
        {grip}
        Resume
      </Link>
    );
  }

  /* A button and not a link, because it does not navigate: floor one becomes
     the picker where it stands, the way the ring's press always did. */
  return (
    <button type="button" className="lb" onClick={onStart}>
      {grip}
      Listen
    </button>
  );
}
