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
// versions before anyone noticed (NOTES, 2026-09-21). The fix is one file,
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

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// How often to look while waiting, and how long to keep looking. A Vercel
// build is a minute or two; past four the wait is worse than the not
// knowing, and Carry on has been sitting there the whole time.
const LOOK_EVERY = 5000;
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
const GIVE_UP_AFTER = 4 * 60 * 1000;

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

  // Opens their own repository's new-file page, already filled in, and starts
  // watching for the rebuild their commit will cause.
  const press = useCallback(() => {
    if (!state?.install) return;
    was.current = state.commit || '';
    window.open(state.install, '_blank', 'noopener,noreferrer');
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

  // Proven on: this very deployment was pushed by the updater.
  const on = Boolean(state?.byUpdater) || landed;

  return (
    <div className={'usw' + (centered ? ' usw--centered' : '')}>
      {/* Kept whether or not it is showing anything, so nothing below it
          moves when the signal arrives. */}
      <div className="usw-signal" aria-hidden="true">
        {on && (
          <svg className="usw-tick" viewBox="0 0 26 26"><path d="M5 13.6l5.2 5.2L21 7.6" /></svg>
        )}
        {watching && !on && (
          <span className="usw-ring">
            {RING.map((at, i) => (
              <i key={i} style={{ transform: `translate(${at.x}px, ${at.y}px)`, opacity: at.o }} />
            ))}
          </span>
        )}
      </div>

      {on ? (
        <>
          <p className="usw-said" role="status">{landed ? 'It worked.' : 'On — your journal updates itself.'}</p>
          {landed && <p className="usw-how">Your journal will keep itself up to date from now on.</p>}
        </>
      ) : state?.install ? (
        <>
          {/* The sentence is the button: the offer and the action are one
              thing, not a label with a switch beside it. */}
          <button type="button" className="usw-switch" onClick={press} disabled={watching}>
            Keep your journal up to date automatically
          </button>
          {/* Under it, because it describes what pressing does rather than
              competing with it. Said before the press, not after: a new tab
              nobody expected is a new tab nobody trusts. And only ever
              alongside the button — an instruction to press something that
              is not there is worse than saying nothing. */}
          <p className="usw-how">
            {watching ? 'Waiting for GitHub…' : (
              <>
                {state?.stalled && <>Your journal has stopped updating itself. </>}
                This opens a GitHub link for you in a new tab. Press the green
                <strong> Commit changes</strong>, then <strong>Commit changes</strong> again.
              </>
            )}
          </p>
        </>
      ) : null}

      {/* Only once it is on. Before that the way past is the setup page's
          own Skip, the same one every screen before this has. */}
      {onDone && on && (
        <button type="button" className="usw-go" onClick={onDone}>Next</button>
      )}

      {explain && (
        <div className="usw-told">
          <p>
            Your journal checks for a new version once an hour and takes it on its own. Nothing to
            press, and nothing about you is sent anywhere — it reads the same public page anybody can.
          </p>
          <p>
            A big version is the exception. Those are the ones that change how something works, so
            they wait for you rather than arriving overnight. When one is ready your desk says so,
            and you take it with the button above.
          </p>
        </div>
      )}
    </div>
  );
}
