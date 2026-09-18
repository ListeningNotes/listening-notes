// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { Heart } from '@phosphor-icons/react';
import StarRating from '../../main_components/StarRating';

// What the next forty minutes are.
//
// Tracks used to open on track one. It opens here now (Miyel's contents
// brief, 2026-09-18): the strip, the facts, the tracklist. Tapping a track
// starts there; the line at the foot starts at the beginning.
//
// ── Why this screen exists ────────────────────────────────────────────────
// The Overview it replaces was the cover, the title and the artist — which is
// the beacon, one row up, said again larger. This says something nothing else
// on the site says: how long the record is, who put it out, what is on it.
// It is also where the tracklist's loading and missing states finally belong,
// instead of standing in for a screen.
//
// No cover here, deliberately. It is in the mini beacon at the top, and
// putting it back would rebuild the screen this one replaced.
//
// ── It is an entry point, not a step ──────────────────────────────────────
// The step count stays at three. Pressing Tracks in the steps row comes back
// here rather than to the track you left, which is what makes it the map: a
// place to return to on purpose and jump around the record from. The carets
// inside a track screen are unaffected — those are for going along.

// `43 min`, and `1 hr 12 min` past an hour. Rounded to the minute because
// nobody has ever wanted a record's length to the second.
function runtimeOf(tracks) {
  const secs = (tracks || []).reduce((total, t) => total + (Number(t.duration) || 0), 0);
  if (!secs) return '';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest ? `${hrs} hr ${rest} min` : `${hrs} hr`;
}

// The arrival plays once a listen, not every time you come back to the step.
// Keyed by the record, so picking a different one plays it again. Outside the
// component because the step remounts on every navigation — which is exactly
// what would otherwise replay it.
const arrived = new Set();

export default function RecordContents({
  tracks, tracksLoading, facts = {},
  trackRatings = {}, trackFavorites = {},
  onPick, onNext, onLookAgain, onHandTracks,
}) {
  const list = tracks || [];
  const key = list.length ? `${list.length}:${list[0]?.title}` : '';
  // Decided once, as the state is made, rather than corrected in an effect
  // afterwards: whether this plays is known before the first frame, and a
  // render that has to be undone is a flicker.
  const [arriving, setArriving] = useState(() => {
    if (!key || arrived.has(key)) return false;
    if (typeof window === 'undefined') return false;
    return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    if (!arriving) return undefined;
    arrived.add(key);
    // Long enough for the last slot to land — see the rule in session.css.
    const t = setTimeout(() => setArriving(false), 40 * list.length + 420);
    return () => clearTimeout(t);
  }, [arriving, key, list.length]);

  // Typed in by hand, when there is no tracklist to be found. One title a
  // line, which is how anybody would write one out.
  const [typed, setTyped] = useState('');

  if (tracksLoading && !tracks) {
    return (
      <div className="ses-contents">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-hidden="true">
          {[...Array(6)].map((_, k) => (
            <div key={k} className="ses-skel" style={{ animationDelay: `${k * 0.06}s` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!list.length) {
    return (
      <div className="ses-contents">
        <p className="ses-prose" style={{ color: 'var(--ink-soft)' }}>
          No tracklist found for this record.
        </p>
        <label className="ses-field" style={{ marginTop: 22 }}>
          <span className="ses-label">Type them in</span>
          <textarea
            className="ses-input ses-textarea"
            value={typed}
            onChange={e => setTyped(e.target.value)}
            placeholder={'One title a line'}
            rows={6}
          />
        </label>
        <div className="ses-actions ses-actions--center" style={{ marginTop: 18, flexDirection: 'column', gap: 16 }}>
          {typed.trim() && (
            <button type="button" className="ses-quiet ses-quiet--lead" onClick={() => onHandTracks?.(typed)}>
              Use these →
            </button>
          )}
          <button type="button" className="ses-quiet" onClick={onLookAgain}>Look again</button>
          <button type="button" className="ses-quiet" onClick={onNext}>Go to album notes →</button>
        </div>
      </div>
    );
  }

  const runtime = runtimeOf(list);
  // Every row that has something behind it, and no row that has not. A blank
  // value beside a label is worse than a missing line: it reads as a fact the
  // record does not have rather than one nobody knows.
  const rows = [
    ['Tracks', String(list.length)],
    ['Runtime', runtime],
    ['Released', facts.released || ''],
    ['Genre', facts.genre || ''],
    ['Label', facts.label || ''],
  ].filter(([, value]) => value);

  // What has been said about each track so far — read once here rather than
  // twice inside the list.
  const rated = trackRatings || {};
  const fav = trackFavorites || {};

  // The bar beside a title is that track against the longest on the record.
  const longest = list.reduce((most, t) => Math.max(most, Number(t.duration) || 0), 0);
  const barOf = t => {
    const d = Number(t.duration) || 0;
    if (!longest || !d) return null;
    // A floor, so a ninety-second interlude still draws something.
    return `max(20px, ${Math.round((d / longest) * 100)}%)`;
  };

  // Where a disc changes, worked out before the list is drawn rather than by
  // carrying a variable through the render — a value that changes while React
  // is rendering is a value React is entitled to see twice.
  const discBreak = list.map((t, k) => Boolean(t.disc) && t.disc !== list[k - 1]?.disc);

  return (
    <div className={'ses-contents' + (arriving ? ' ses-contents--arriving' : '')}>
      {/* The strip and the facts hold still while the list moves under them.
          Sticky rather than a scroller of its own: a box that scrolls inside
          a sheet that scrolls is two answers to one drag, which is a mistake
          this session has made before. */}
      <div className="ses-contents-head">
        {/* No strip here, 2026-09-18. It was the brief's opening move — every
            track as an empty slot at full height — and on the screen it read
            as a horizon chart with nothing in it. Miyel: "remove fake horizon
            from overview." She is right: a horizon is a picture of what you
            thought of a record, and drawing its empty frame before you have
            heard it is a chart pretending to have data. The tracklist below
            says what is on the record, which is what this screen is for; the
            strip belongs to the track screen, where the bars mean something. */}
        <dl className="ses-facts">
          {rows.map(([label, value]) => (
            <div className="ses-fact" key={label}>
              <dt className="ses-label">{label}</dt>
              <dd className="ses-fact-value">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <ol className="ses-contents-list">
        {list.map((t, k) => {
          const width = barOf(t);
          // Only where a record actually has more than one disc; a single-disc
          // record never sees the word, because `disc` is only set past one.
          const newDisc = discBreak[k];
          return (
            <li key={k}>
              {newDisc && <span className="ses-label ses-contents-disc">Disc {t.disc}</span>}
              {/* Not a button, 2026-09-18. Every row opened its track for an
                  hour and Miyel took it off: this screen is what the record
                  *is*, and a list you can read without deciding anything is a
                  different thing from a menu. Reading a tracklist and being
                  one mistaken tap from starting at track nine are not the
                  same posture. The way in is the one line at the foot, which
                  says where it puts you. */}
              <div className="ses-contents-row">
                <span className="ses-contents-n">{t.number || k + 1}</span>
                <span className="ses-contents-title">{t.title}</span>
                {/* The right of a row is either how long the track is or what
                    you made of it, and the second wins wherever there is one
                    (Miyel, 2026-09-18: "almost looking like iTunes"). It is
                    what makes this screen worth coming back to mid-listen: a
                    draft picked up a week later says at a glance which tracks
                    you have already been through.

                    Nothing is drawn for an unrated track but the length,
                    because an empty row of stars beside every title is a
                    column of controls nobody asked for — the same rule the
                    entry's tracklist keeps. */}
                {rated[k] ? (
                  <span className="ses-contents-said">
                    {fav[k] && (
                      <span className="ses-contents-heart" aria-hidden="true">
                        <Heart size={11} weight="fill" />
                      </span>
                    )}
                    <StarRating rating={rated[k]} size={12} />
                  </span>
                ) : width ? (
                  <span className="ses-contents-bar" style={{ width }} aria-hidden="true" />
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="ses-center" style={{ marginTop: 22 }}>
        <button type="button" className="ses-quiet" onClick={() => onPick?.(0)}>
          Start with {list[0]?.title} →
        </button>
      </div>
    </div>
  );
}
