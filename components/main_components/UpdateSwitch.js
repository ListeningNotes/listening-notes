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
const GIVE_UP_AFTER = 4 * 60 * 1000;

export default function UpdateSwitch({ centered = false, onDone = null }) {
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
  const lamp = on ? 'on' : (watching ? 'waiting' : 'off');
  const said = on
    ? (landed ? 'It worked. This journal keeps itself up to date.' : 'On. This journal keeps itself up to date.')
    : watching
      ? 'Waiting for GitHub — this takes a minute or two.'
      : state?.stalled
        ? 'This journal has stopped updating itself.'
        : 'Your journal can keep itself up to date, once an hour, on its own.';

  return (
    <div className={'usw' + (centered ? ' usw--centered' : '')}>
      <p className="usw-line">
        <span className={'usw-lamp usw-lamp--' + lamp} aria-hidden="true" />
        <span>{said}</span>
      </p>

      {!on && (
        <>
          {/* Said before the press, not after: a new tab nobody expected is
              a new tab nobody trusts. */}
          <p className="usw-how">
            This opens GitHub in a new tab with the file already written out. Press the green
            <strong> Commit changes</strong>, then <strong>Commit changes</strong> again in the small
            window. Then come back here.
          </p>
          <button type="button" className="usw-go" onClick={press} disabled={!state?.install || watching}>
            {watching ? 'Waiting…' : 'Turn on updates'}
          </button>
          {!state?.install && state && (
            <p className="usw-how">
              This copy could not work out where its own code lives, so it cannot fill the page in.
              The file, and where it goes, are in the README under Updating.
            </p>
          )}
        </>
      )}

      {onDone && (
        <button type="button" className="usw-skip" onClick={onDone}>
          {on ? 'Next' : 'Carry on — I’ll do it later'}
        </button>
      )}
    </div>
  );
}
