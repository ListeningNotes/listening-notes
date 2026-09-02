// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/ComingSoon.js
// What a copy shows before anybody has claimed it.
//
// ── Why a page and not a redirect ─────────────────────────────────────────
// The obvious thing is to send every visitor to /setup, and it is wrong. A
// stranger who finds a freshly deployed copy would land on somebody else's
// setup form — which looks like an invitation to fill it in, and is the one
// shape this design has otherwise avoided entirely. Nothing here can actually
// be claimed by them: setup opens to the claim code printed in the deploy's
// build log, which only the person who deployed it has seen, so it is behind
// a lock like everything else. But "cannot be taken" and "does not look
// takeable" are different things, and only the second one is a design
// decision.
//
// So a visitor gets a sentence, and the owner gets the address.
//
// ── Why it holds the whole site rather than the homepage ──────────────────
// An unconfigured copy renders correctly in the sense that nothing crashes —
// coverName() falls back to "A listening journal", the About pane is designed
// for a copy with nothing written in it yet. But rendering correctly and being
// worth showing are not the same. What is behind the hold is an empty archive,
// a card with no name on it and a beacon with nothing playing, at somebody's
// public address. There is nothing to read, so there is no reading to protect.
//
// ── No spinner, no progress, no promise ───────────────────────────────────
// This is not a loading state and must not look like one. A copy can sit here
// for a week while its owner gets round to it, and a spinner would say the
// wait is nearly over. It says what is true and stops.
//
// ── Why the door is a plain anchor ────────────────────────────────────────
// It was a <Link>, and it did nothing. This component is drawn by the root
// layout *in place of* the page, and a root layout does not re-render on a
// client-side navigation — so pressing the link changed the address to /setup
// and left this page on screen. A full document load is the only navigation
// that asks the layout the question again. The first thing a new owner
// presses has to work.
//
// ── Two reasons to hold ───────────────────────────────────────────────────
// 'setup' is a copy with a database and no owner: a sentence for a visitor
// and a door for the owner. 'database' is a copy with no connection string at
// all — it built and started anyway, and the only useful page is one that
// says what to set. That one is addressed to the owner alone, because nobody
// else can be looking at it yet.

// The mark, drawn rather than spelled. Third copy of this path data — SiteNav
// and HomeNav carry the other two — and consistent with how the site already
// treats it: each surface states its own, because the two that exist have
// different sizing and different live-dot behaviour and lifting them into one
// component would mean a component whose whole job is a prop.
//
// The dot is static here. Everywhere else it reads whether something is
// playing; on a copy nobody has claimed there is no Last.fm account to ask,
// so a dot that could go green would be a promise about a journal that does
// not exist yet.

// Where to say it did not work. The same address the pitch pane offers the
// source at, because the issues live beside the code, and a fork's owner can
// point both at their own.
const SOURCE_URL =
  process.env.NEXT_PUBLIC_SOURCE_URL || 'https://github.com/ListeningNotes/listening-notes';

export default function ComingSoon({ reason = 'setup', said = '' }) {
  const noDatabase = reason === 'database';
  const unreachable = reason === 'unreachable';
  return (
    <div className="cs-page">
      <style>{`
        .cs-page {
          min-height: 100dvh;
          background: var(--bg); color: var(--ink);
          display: flex; flex-direction: column;
          align-items: center; justify-content: center;
          gap: 18px; padding: 32px; text-align: center;
        }
        .cs-mark { line-height: 0; }
        .cs-logo { width: 92px; height: auto; display: block; fill: var(--ink); }
        .cs-dot { fill: var(--ink); }
        .cs-said {
          font-family: var(--font-nunito), sans-serif;
          font-size: 15px; line-height: 1.7; color: var(--ink-soft);
          max-width: 34ch;
        }
        /* The way in for the one person who needs it, in the smallest type on
           the page — the same weight the source link gets on the pitch pane.
           A visitor reads past it; an owner is looking for it. */
        .cs-door {
          font-family: var(--font-mono); font-size: 10px;
          letter-spacing: 0.08em; color: var(--ink-faint);
          text-decoration: none;
          border-bottom: 1px solid var(--border);
          margin-top: 6px;
        }
        .cs-door:hover { color: var(--ink-soft); }
        .cs-how {
          font-family: var(--font-mono); font-size: 11px; line-height: 1.8;
          color: var(--ink-faint); max-width: 40ch; text-align: left;
          margin-top: 6px;
        }
        .cs-how code { color: var(--ink-soft); }
        .cs-help {
          font-family: var(--font-mono); font-size: 10px; letter-spacing: 0.08em;
          color: var(--ink-faint); text-decoration: none; margin-top: 18px;
          border-bottom: 1px solid var(--border);
        }
        .cs-help:hover { color: var(--ink-soft); }
      `}</style>

      <div className="cs-mark" aria-label="Listening Notes" role="img">
        <svg viewBox="76 96 241 140" className="cs-logo" xmlns="http://www.w3.org/2000/svg">
        <path
        transform="translate(73.734177, 220.794814)"
        d="M 44.65625 0 C 37.46875 0 31.160156 -1.601562 25.734375 -4.8125 C 20.304688 -8.019531 16.097656 -12.28125 13.109375 -17.59375 C 10.128906 -22.90625 8.640625 -28.773438 8.640625 -35.203125 L 8.640625 -116.21875 L 36.53125 -116.21875 L 36.53125 -33.203125 C 36.53125 -30.546875 37.46875 -28.222656 39.34375 -26.234375 C 41.226562 -24.242188 43.550781 -23.25 46.3125 -23.25 L 77.03125 -23.25 L 77.03125 0 Z M 44.65625 0 "
        />
        <path
        transform="translate(153.915942, 220.794814)"
        d="M 91.96875 2 C 85 2 78.742188 0.476562 73.203125 -2.5625 C 67.671875 -5.613281 63.300781 -9.847656 60.09375 -15.265625 C 56.882812 -20.691406 55.28125 -26.835938 55.28125 -33.703125 L 55.28125 -84.5 C 55.28125 -86.269531 54.835938 -87.875 53.953125 -89.3125 C 53.066406 -90.75 51.90625 -91.910156 50.46875 -92.796875 C 49.03125 -93.679688 47.425781 -94.125 45.65625 -94.125 C 43.882812 -94.125 42.28125 -93.679688 40.84375 -92.796875 C 39.40625 -91.910156 38.269531 -90.75 37.4375 -89.3125 C 36.601562 -87.875 36.1875 -86.269531 36.1875 -84.5 L 36.1875 0 L 8.96875 0 L 8.96875 -82.515625 C 8.96875 -89.484375 10.539062 -95.625 13.6875 -100.9375 C 16.84375 -106.25 21.21875 -110.453125 26.8125 -113.546875 C 32.40625 -116.648438 38.6875 -118.203125 45.65625 -118.203125 C 52.738281 -118.203125 59.046875 -116.648438 64.578125 -113.546875 C 70.109375 -110.453125 74.476562 -106.25 77.6875 -100.9375 C 80.90625 -95.625 82.515625 -89.484375 82.515625 -82.515625 L 82.515625 -31.703125 C 82.515625 -29.929688 82.957031 -28.300781 83.84375 -26.8125 C 84.726562 -25.320312 85.859375 -24.160156 87.234375 -23.328125 C 88.617188 -22.492188 90.144531 -22.078125 91.8125 -22.078125 C 93.582031 -22.078125 95.210938 -22.492188 96.703125 -23.328125 C 98.203125 -24.160156 99.394531 -25.320312 100.28125 -26.8125 C 101.164062 -28.300781 101.609375 -29.929688 101.609375 -31.703125 L 101.609375 -116.21875 L 128.65625 -116.21875 L 128.65625 -33.703125 C 128.65625 -26.835938 127.050781 -20.691406 123.84375 -15.265625 C 120.632812 -9.847656 116.265625 -5.613281 110.734375 -2.5625 C 105.203125 0.476562 98.945312 2 91.96875 2 Z M 91.96875 2 "
        />
        <circle
        cx="297.0547"
        cy="216.71875"
        r="14.1328"
        className="cs-dot"
        />
        </svg>
      </div>
      {noDatabase ? (
        <>
          <p className="cs-said">
            This copy has no database yet.
          </p>
          <p className="cs-how">
            In Vercel, open the project’s Settings → Environment Variables and
            add <code>DATABASE_URL</code> — the connection string from your
            Neon project. Then redeploy. The tables build themselves.
          </p>
          <a href={`${SOURCE_URL}/issues`} className="cs-help">It didn’t work</a>
        </>
      ) : unreachable ? (
        <>
          <p className="cs-said">
            This journal’s database can’t be reached right now.
          </p>
          <p className="cs-how">{said}</p>
          <a href={`${SOURCE_URL}/issues`} className="cs-help">It didn’t work</a>
        </>
      ) : (
        <>
          <p className="cs-said">
            This journal isn’t ready yet.
          </p>
          <a href="/setup" className="cs-door">Set it up</a>
        </>
      )}
    </div>
  );
}
