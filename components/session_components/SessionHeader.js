// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/session_components/SessionHeader.js
// The strip at the top of a listen: what you are logging, and the four steps.
//
// It is what makes one-thing-at-a-time possible. Every screen below it holds
// exactly one job — the tracks, the note, the preview — and could not also
// carry what you are logging without eating a phone's screen. So what you are
// logging sits here and stays put while the screens turn underneath.
//
// ── The header is the beacon, 2026-09-18 ──────────────────────────────────
// The cover came off this row on 2026-09-15 with a good reason: the album
// screen is the art, large and centred, and a thumbnail of it up here was the
// same picture twice. That stopped being what this strip is. A listen begins
// on the beacon now, and the sheet comes up over it — so the row at the top
// of the listen is the beacon, small, carried into the room. The thing you
// were looking at a second ago is still on screen rather than having been
// swapped for a caption about it.
//
// It also answers what a visitor is seeing while you write, which is the one
// fact an owner might actually want up there and the thing this row could not
// say before.
//
// Cover, dot, record, artist — the same four things at the same two sizes as
// the mini in the nav bar, which is the same component's worth of markup
// drawn twice (HomeNav.js). **They must not disagree.** The beacon that
// carries the dot is the small one, because it has no mark beside it to
// light; the large one on the pane says it in colour and says nothing in
// words. See CAPTION in hooks/useListeningBeacon.js.
//
// The line under the dot is what the beacon is naming: the song you have
// open, or the record itself while none is. That is `track || album`, the
// beacon's own rule, stated once here and once in ListeningBeacon.
//
// ── There is no way out of this file ──────────────────────────────────────
// The × that used to sit in the left slot is gone, and the slot is now a
// spacer that keeps the beacon on the middle of the row. Both halves of that
// happened on 2026-09-18 and the second is the one to know: the × did not go
// away, it moved to the picker, which is the screen a listen is started from
// (HomeNav.js, and the note beside it there). A pull down closes what you
// were reading and a listen is notetaking that saves as it goes, so the cost
// of a stray pull here is nothing much; on the picker it throws away a
// half-typed search.
//
// Which means leaving is a gesture, and a gesture must not skip writing the
// draft. app/session/page.js registers that with `useBeforeLeaving` — a save
// that fails stops the sheet with Trouble showing why.
//
// The cover was this corner's control for a day, as "change album". It is not
// a control any more: it is the beacon, and you change record by putting this
// one down.
//
// Top right, where every other screen keeps its day-and-night switch. The
// question mark beside it opened a reference and went with the research on
// 2026-09-18 (docs/RETIRED-PROMPTS.md). There is no Save draft button; the
// draft is written on the way out, however you leave.

'use client';
import { SESSION_STEPS } from '../../hooks/useListeningSession';
import { CAPTION } from '../../hooks/useListeningBeacon';
import MarqueeTitle from '../main_components/MarqueeTitle';
import { useTheme } from '../main_components/Lightswitch';

export default function SessionHeader({
  album, artist, year,
  art = '', track = '',
  step, onStep,
}) {
  const { theme, toggle } = useTheme();

  // The beacon's own rule, and it has to be the same one: whatever song is
  // open, and the record itself while none is.
  //
  // Nothing is open on the album screen, whatever `openTrack` happens to be
  // pointing at — it defaults to the first track and the tracklist arrives
  // before you have pressed anything, so this row read "15 Step" while the
  // screen under it still said In Rainbows and offered to start. The same
  // guard is on the needle, so the public beacon does not say it either.
  const naming = (step > 0 && track) || album;

  return (
    <header className="ses-head">
      <div className="ses-head-in">
        <div className="ses-head-row">
          {/* The left slot, and there is nothing in it at all now. It is a
              spacer, holding the beacon on the middle of the row — the same
              three-slot row SiteNav and the ID card's header are, and for the
              same reason: a row with a control at one end and nothing at the
              other centres its middle child on what is left over rather than
              on the page.

              It held the × until 2026-09-18. Miyel took it off: "I don't have
              them anywhere else on the site, and swiping down is intuitive
              since the screen comes up." Both true — the entry, the inbox, a
              person's page and the send form all close on the pull, and this
              was the one sheet with a button as well. What the × did instead
              of closing is registered in app/session/page.js now, so the
              gesture writes the draft and a write that fails still stops the
              sheet going anywhere. */}
          <div className="ses-head-side" />

          <div className="ses-head-beacon">
          <span className="ses-cover" aria-hidden="true">
            {art
              ? <img src={art} alt="" />
              : <span className="ses-cover-none">♪</span>}
          </span>

          <div className="ses-head-text">
            {/* The live row. Always, here: a session is a listen. The same row
                the bar shows once a record is on it, so the handoff has
                nothing to change. */}
            <span className="ses-head-live">
              <span className="ses-head-dot" aria-hidden="true" />
              {CAPTION.logging}
            </span>
            <MarqueeTitle text={naming} textClassName="ses-head-album" />
            {/* The artist. Missing here until 2026-09-18, which is most of
                what made this a different object from the beacon in the bar
                it grew out of — the bar said a record and an artist, the
                session said a record, and the handoff dropped a line.
                .ses-head-artist had been sitting in the stylesheet unused. */}
            {artist && <span className="ses-head-artist">{artist}</span>}
          </div>
          </div>

          <div className="ses-head-side ses-head-side--right">
            <button type="button" className="hp-icon-btn ses-theme" onClick={toggle} aria-label="Toggle theme">
            {theme === 'dark' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/></svg>
            )}
          </button>
          </div>
        </div>

        {/* Every step is a button. The preview in particular is worth a look
            at any moment — the page so far is how you find out what the note
            still needs — so nothing here is gated on having been there. */}
        <nav className="ses-steps" aria-label="Steps">
          {SESSION_STEPS.map((label, id) => {
            const isCurrent = id === step;
            const isPast = id < step;
            const reachable = !isCurrent;
            const cls = ['ses-stepbtn', isCurrent && 'ses-stepbtn--current', isPast && 'ses-stepbtn--past'].filter(Boolean).join(' ');
            return (
              <button
                key={label}
                type="button"
                className={cls}
                onClick={() => reachable && onStep(id)}
                disabled={!reachable}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <span className="ses-stepdot" aria-hidden="true" />
                {label}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
