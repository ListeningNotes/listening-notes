// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/UpdateSwitch.js
// Turning on the thing that keeps a journal current — a screen in setup, a
// section in Settings, the same component.
//
// ── Why a copy needs switching on at all ──────────────────────────────────
// Every copy carries a workflow that checks for a new release once an hour
// and takes it, so a journal stays current with nobody pressing anything.
// Every copy except the ones made by the deploy button, which is all of
// them: GitHub refuses to let any app write under .github/workflows without
// a permission Vercel does not hold, so rather than have the whole clone
// rejected, it leaves that one folder behind. Six copies ran for days on old
// versions before anyone noticed (2026-09-21). The fix is one file,
// added once, and this is the screen that asks for it.
//
// ── Why there is no toggle ────────────────────────────────────────────────
// A toggle says the journal is holding the switch. It is not: the file lives
// in the keeper's own repository, which this copy holds no key to. What it
// can honestly do is hand them a page with the file already written out, and
// then watch to see whether it arrived.
//
// ── How it knows it worked ────────────────────────────────────────────────
// It cannot look inside a private repository. But committing that file is a
// push, a push rebuilds the site, and a rebuilt site is running a different
// commit — which this copy can read about itself. So the light spins while
// it waits and settles when the commit underneath it changes. That happens
// whether or not the updater then finds anything to take, because it is
// their own commit that causes it, not the update.
//
// Afterwards the proof is different and better: a deployment pushed by the
// updater says so in its own commit, so a copy that has ever updated itself
// knows it for certain. Never having updated is not a fault — it may simply
// be current — which is why the unlit state offers rather than warns.
//
// ── Settings decides by the version, 2026-09-30 ───────────────────────────
// Settings compares this copy's version with the latest release and shows
// one of two things: matched, a tick and that the journal is up to date;
// behind, that there is a newer version, and the same offer as setup. No
// third state and nothing stored — if the updater is on and working the
// versions match, and if it is off or broken the copy drifts behind and the
// offer appears by itself. The keeper is never asked a question about
// machinery. A copy installed today is current, so Settings shows the tick
// even if setup's step was skipped; that corrects itself at the next release.
//
// ── The button points at this journal, not at GitHub ──────────────────────
// A link to github.com tapped on a phone is swallowed by GitHub's app, which
// cannot make files, so nobody who set up on a phone ever finished this step
// (2026-09-30). iOS matches a universal link on the URL that was tapped, so
// the button opens /updates/go on this journal and that page redirects —
// github.com is never tapped, and Safari follows like any other page.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// How often to look while waiting, and how long to keep looking. A Vercel
// build is a minute or two, sometimes more; past six the wait is worse than
// the not knowing, and Skip has been sitting there the whole time.
const LOOK_EVERY = 5000;
const GIVE_UP_AFTER = 6 * 60 * 1000;
// The turning ring: eight dots on a circle, fading round it, so the ring
// reads as moving even before the rotation is noticed.
const RING = Array.from({ length: 8 }, (unused, i) => {
  const at = (i / 8) * Math.PI * 2;
  return {
    x: Number((Math.cos(at) * 10).toFixed(2)),
    y: Number((Math.sin(at) * 10).toFixed(2)),
    o: Number((0.22 + (i / 8) * 0.78).toFixed(2)),
  };
});
// A few silent seconds of the two taps on GitHub's Commit changes button,
// recorded on a phone, and a still of it for anyone with motion turned
// down. People follow a film through a strange screen where they would
// stall on a paragraph.
const FILM = '/updater-film.mp4';
const STILL = '/updater-film.jpg';
// Where the button goes: this journal's own redirect to the GitHub page, so
// the tap never lands on github.com itself (see the top of the file).
const DOOR = '/updates/go';

// `explain` is Settings: the page somebody opens to find out how a thing
// works, so it says how this one does. Setup says none of it — that it is
// automatic is the whole of what matters while somebody is still arriving.
export default function UpdateSwitch({ centered = false, onDone = null, explain = false }) {
  const [state, setState] = useState(null);
  const [watching, setWatching] = useState(false);
  const [landed, setLanded] = useState(false);
  const was = useRef('');
  const timers = useRef([]);

  useEffect(() => {
    fetch('/api/update')
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && setState(d))
      .catch(() => {});
  }, []);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Opens the door to their own repository's new-file page, already filled
  // in, and starts watching for the rebuild their commit will cause.
  const press = useCallback(() => {
    if (!state?.install) return;
    was.current = state.commit || '';
    window.open(DOOR, '_blank', 'noopener,noreferrer');
    setWatching(true);
    const began = Date.now();
    const look = () => {
      fetch('/api/update', { cache: 'no-store' })
        .then(r => (r.ok ? r.json() : null))
        .then(d => {
          // A different commit underneath us means the file landed and the
          // site was rebuilt from it.
          if (d?.commit && was.current && d.commit !== was.current) {
            setState(d);
            setLanded(true);
            setWatching(false);
            return;
          }
          if (Date.now() - began < GIVE_UP_AFTER) timers.current.push(setTimeout(look, LOOK_EVERY));
          else setWatching(false);
        })
        .catch(() => {
          if (Date.now() - began < GIVE_UP_AFTER) timers.current.push(setTimeout(look, LOOK_EVERY));
          else setWatching(false);
        });
    };
    timers.current.push(setTimeout(look, LOOK_EVERY));
  }, [state]);

  // What the screen shows. `done` is the press that just worked, on either
  // page. In Settings the versions decide the rest; in setup, a deployment
  // the updater itself pushed is proof it is on, and otherwise the offer.
  const done = landed;
  const matched = explain && Boolean(state) && !state.newer;
  const on = !explain && Boolean(state?.byUpdater);
  const offering = Boolean(state) && !done && !matched && !on;

  const tick = (
    <div className="usw-signal" aria-hidden="true">
      <svg className="usw-tick" viewBox="0 0 26 26"><path d="M5 13.6l5.2 5.2L21 7.6" /></svg>
    </div>
  );
  const ring = (
    <div className="usw-signal" aria-hidden="true">
      <span className="usw-ring">
        {RING.map((at, i) => (
          <i key={i} style={{ transform: `translate(${at.x}px, ${at.y}px)`, opacity: at.o }} />
        ))}
      </span>
    </div>
  );

  // The order every other setup screen keeps: what this is, then what it
  // asks of you, then the film of it, then the thing you press.
  return (
    <div className={'usw' + (centered ? ' usw--centered' : '')}>
      {done && (
        <>
          {tick}
          <p className="usw-said" role="status">You’re all set!</p>
          <p className="usw-how">Your journal will keep itself up to date.</p>
        </>
      )}

      {!done && matched && (
        <>
          {tick}
          <p className="usw-said" role="status">Your journal is up to date.</p>
        </>
      )}

      {!done && on && (
        <>
          {tick}
          <p className="usw-said" role="status">On — your journal updates itself.</p>
        </>
      )}

      {offering && (
        <>
          {/* Settings has no screen sentence above it, so the component says
              it there. In setup the screen's own sentence says it and this
              would be the same words twice. */}
          {explain && <p className="usw-said">There’s a newer version of Listening Notes.</p>}
          {state.install ? (
            <>
              {/* Said before the press, not after: a page nobody expected is
                  a page nobody trusts. And only ever alongside the button —
                  an instruction to press something that is not there is
                  worse than saying nothing. */}
              <p className="usw-how">
                {watching ? 'Waiting for GitHub…' : (
                  <>Opens GitHub. Press the green <strong>Commit changes</strong> button, twice.</>
                )}
              </p>
              {/* The film gives way to the ring while the page waits: the
                  thing to do has been done, and the ring is the answer. */}
              {watching ? ring : (
                <div className="usw-film">
                  <video src={FILM} poster={STILL} autoPlay muted loop playsInline aria-label="The two taps on Commit changes" />
                  <img src={STILL} alt="" />
                </div>
              )}
              <button type="button" className="usw-switch" onClick={press} disabled={watching}>
                Turn on auto updates
              </button>
            </>
          ) : (
            /* A copy that cannot say which repository it is: no link to
               offer. One line, rather than nothing — nothing under the
               sentence looked exactly like a copy that is already on. */
            <p className="usw-how">This copy can’t find your repository. Settings has what to do.</p>
          )}
        </>
      )}

      {/* Only once it is on. Before that the way past is the setup page's
          own Skip. */}
      {onDone && (done || on) && (
        <button type="button" className="usw-go" onClick={onDone}>Next</button>
      )}

      {/* One line, in Settings only (Miyel, 2026-09-30: the desk is gone, so
          nothing says when a big version waits; and "nothing about you is
          sent anywhere" went with it). */}
      {explain && (
        <div className="usw-told">
          <p>It checks for a new version every hour and updates by itself.</p>
        </div>
      )}
    </div>
  );
}
