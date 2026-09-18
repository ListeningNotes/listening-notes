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
// ── The header is the beacon now, 2026-09-18 ──────────────────────────────
// The cover came off this row on 2026-09-15 with a good reason: the album
// screen is the art, large and centred, and a thumbnail of it up here was the
// same picture twice. That is no longer what this strip is. A listen begins
// on the beacon now — the record flies into the beacon slot, the beacon
// lights, and the session opens over it (Miyel's beacon brief) — so the row
// at the top of the listen is the beacon, small, carried into the room. The
// cover, the green dot and NOW LOGGING are the beacon's own three things,
// which means the thing you were looking at a second ago is still on screen
// rather than having been swapped for a caption about it.
//
// It also answers what a visitor is seeing while you write, which is the
// thing this row could not say before and the one fact an owner might
// actually want up there.
//
// The line under the dot is what the beacon is naming: the song you have
// open, or the record itself while none is. That is `track || album`, which
// is the beacon's own rule, stated once here and once in ListeningBeacon —
// the two are showing the same thing and must not disagree about it.
//
// ── The × in the corner ───────────────────────────────────────────────────
// The way to put the record down, and the one deliberate end a listen has.
//
// One press, from 2026-09-18. It was two — the mark opened a word and the
// word did it — which was the right shape for a control that might throw
// something away and the wrong one for a control that never can. Miyel,
// after an afternoon of testing: "clicking the × should just draft, with no
// option to just leave… if you're going through all this trouble to type in
// an album, find it and click, you're probably wanting to listen. Let's just
// let the drafts build."
//
// So there is nothing to confirm. The × ends the listen and the listen is
// kept, every time, whether a word was written or not — a record you went and
// found is a record you meant to play, and the picker is where it waits.
// Drafts are a page you can clear out in a press each; a lost search is an
// afternoon you do again.
//
// ── The mark shuts what it opened ─────────────────────────────────────────
// Two targets once it is open, and this is the part worth being exact about:
// the *word* is what commits, and the mark puts it away again. Miyel asked
// for a way back out of it and wondered whether that meant a second glyph —
// it does not, and the reason is next door. KeeperTools does this already:
// the ··· turns into an × and pressing it files the tools back in. The door
// stays the door; it opens and it shuts. An × that closes what it just opened
// is the same × doing the same job at a smaller scale.
//
// Pressing the word is also the natural thing rather than the clever one: it
// arrives under your thumb saying what will happen, and you press the thing
// that says it.
//
// It is not the same as swiping the sheet down. Swiping is stepping away: the
// record stays on the desk, the beacon goes quiet until you come back, and
// coming back lands you on the step you left with everything you wrote. That
// gesture should stay as easy as it is, because it does not end anything —
// what was worth making deliberate is the ending, and this is it.
//
// The cover was this corner's control for a day, as "change album". It is not
// a control any more: it is the beacon, and you change record by putting this
// one down. One thing in the corner, and it is the one that ends the mode you
// are in.
//
// Top right, where every other screen keeps its day-and-night switch: the
// switch, and beside it the question mark. That is the reference — something
// to ask about the album or the notes, from any screen, that never writes a
// word of the entry. It glows a little so it reads as a door rather than a
// decoration, and it is absent on a copy with no key rather than present and
// broken. There is no Save draft button: the draft saves itself.

'use client';
import { X } from '@phosphor-icons/react';
import { SESSION_STEPS } from '../../hooks/useListeningSession';
import { useTheme } from '../main_components/Lightswitch';

export default function SessionHeader({
  album, artist, year,
  art = '', track = '',
  step, onStep,
  onEnd,
}) {
  const { theme, toggle } = useTheme();
  // Whether the × has been pressed once and is now showing what it will do.
  // Reset on blur, the way the draft's discard is: a confirmation left armed
  // behind your back is a confirmation you did not give.

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
          {/* The left slot, and there is nothing in it. It is a spacer that
              holds the beacon on the middle of the row — the same three-slot
              row SiteNav and the ID card's header are, for the same reason: a
              row with controls at one end and nothing at the other centres its
              middle child on what is left over rather than on the page
              (Miyel, 2026-09-18). */}
          <div className="ses-head-side">
            {/* Focus leaving the pair puts it away — but only when it has
                actually left, or moving from the mark to the word would shut
                the word on the way to pressing it. */}
            <div className="ses-shut">
              <button
                type="button"
                className="ses-shut-door"
                onClick={onEnd}
                aria-label="End this listen and keep it as a draft"
                title="End this listen and keep it as a draft"
              >
                <X size={18} weight="regular" aria-hidden="true" className="ses-shut-mark" />
              </button>
            </div>
          </div>

          <div className="ses-head-beacon">
          <span className="ses-cover" aria-hidden="true">
            {art
              ? <img src={art} alt="" />
              : <span className="ses-cover-none">♪</span>}
          </span>

          <div className="ses-head-text">
            {/* The one green thing on the screen, and it means what it means
                everywhere else on this site: somebody is being told. */}
            <span className="ses-head-live">
              <span className="ses-head-dot" aria-hidden="true" />
              Now logging
            </span>
            <span className="ses-head-album">{naming}</span>
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
