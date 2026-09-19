// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';

import { useEffect, useRef } from 'react';

// ── A title too long for its slot ─────────────────────────────────────────
// Restored on 2026-09-18, and restored rather than rebuilt: this is the
// beacon's own marquee from before 2026-08-28, when the nav row carried a
// compact beacon and a long track title had nowhere to go. It came off that
// day because the large beacon had a whole screen to be tall in and a title
// that wraps is read where a title that scrolls has to be waited for — which
// is still true of the large one, and still why it wraps. The small beacon
// has 190px and no second line, so the argument does not reach it.
//
// One lap, not a ping-pong. The text scrolls the width of itself plus a gap,
// at which point the second copy is standing exactly where the first started
// and the animation restarts on a frame identical to the one it ended on.
// What you see is a title scrolling away and coming round to its first
// character again, which is what Miyel asked for; what you do not see is the
// return journey, because there isn't one to watch.
const SPEED = 18;  // px/sec — slow enough to read at a glance
const GAP = 48;    // px between the trailing copy and the next lap's leading one
// Seconds held on the first character before it moves again. Four in the old
// beacon; Miyel's number this time is "maybe 5-10 seconds", and seven leaves
// the title still long enough to read twice over without the row becoming
// something that is always moving in the corner of your eye.
const HOLD = 7;

// The running state is a class put on the node by hand rather than React
// state. It is set from inside an effect that has just measured the DOM, and
// setting React state there is both a second render for something the browser
// has already laid out and the one thing this project's lint config refuses
// outright (react-hooks/set-state-in-effect).
export default function MarqueeTitle({ text, textClassName = '' }) {
  const clipRef = useRef(null);
  const trackRef = useRef(null);
  const textRef = useRef(null);

  useEffect(() => {
    const clip = clipRef.current;
    const track = trackRef.current;
    const el = textRef.current;
    if (!clip || !track || !el) return undefined;

    let anim = null;
    const measure = () => {
      anim?.cancel();
      anim = null;
      const over = el.scrollWidth - clip.clientWidth;
      // Nothing to scroll, or nobody who wants it to: the copies go away and
      // the title sits centred like any other.
      if (over <= 2 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        clip.classList.remove('is-marqueeing');
        return;
      }
      clip.classList.add('is-marqueeing');
      const distance = el.scrollWidth + GAP;
      const scroll = Math.max(4, distance / SPEED);
      const total = HOLD + scroll;
      // Driven from here rather than from a @keyframes block, because the
      // distance and the hold's share of the cycle are both different for
      // every title — the old one wrote a stylesheet per instance into
      // document.head to say that, and this says the same thing without
      // leaving anything behind to clean up.
      anim = track.animate([
        { transform: 'translateX(0)', offset: 0 },
        { transform: 'translateX(0)', offset: HOLD / total },
        { transform: `translateX(${-distance}px)`, offset: 1 },
      ], { duration: total * 1000, iterations: Infinity, easing: 'linear' });
    };

    measure();
    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      anim?.cancel();
    };
  }, [text]);

  return (
    <span ref={clipRef} className="marquee-clip">
      <span ref={trackRef} className="marquee-track">
        <span ref={textRef} className={textClassName}>{text}</span>
        {/* The second copy is always in the markup and hidden until it is
            needed. Rendering it only while running would mean measuring,
            re-rendering and measuring again; hiding it costs a line of CSS. */}
        <span className="marquee-track-gap" aria-hidden="true" />
        <span className={textClassName} aria-hidden="true">{text}</span>
      </span>
    </span>
  );
}
