// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useState } from 'react';
import { Heart } from '@phosphor-icons/react';

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

// ── The strip ─────────────────────────────────────────────────────────────
// Shared with the track screen, which is the only reason it lives in this
// file rather than that one: the strip *is* the record's contents drawn
// small, and this is the screen about the record's contents.
//
// `slots` is the difference between the two. Here every unrated track is an
// empty box at full height with a hairline round it — the shape of a record
// with nothing in it yet, which is what you are looking at before you start.
// On the track screen an unrated track is a stub at the foot of the row,
// because there the bars are a picture of progress rather than an invitation.
// The rated look is identical in both, which is the point: the boxes fill.
export function ContentsStrip({
  tracks, trackRatings = {}, trackFavorites = {}, trackNotes = {},
  current = -1, onPick, slots = false, arriving = false,
}) {
  const list = tracks || [];
  return (
    <div
      className={'ses-strip' + (list.length > 18 ? ' ses-strip--dense' : '') + (slots ? ' ses-strip--slots' : '')}
      role="tablist"
      aria-label="Tracks"
    >
      {list.map((tr, k) => {
        const r = trackRatings[k] || 0;
        const fav = !!trackFavorites?.[k];
        const covered = !!(trackNotes?.[k]?.trim()) || r > 0 || fav;
        const pct = Math.max(5, (r / 5) * 100);
        const cls = ['ses-strip-col', covered && 'ses-strip-col--done', k === current && 'ses-strip-col--now']
          .filter(Boolean).join(' ');
        return (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={k === current}
            aria-label={`${tr.number || k + 1}. ${tr.title}${r ? ` — ${r} / 5` : ''}`}
            title={`${tr.number || k + 1}. ${tr.title}`}
            className={cls}
            onClick={() => onPick?.(k)}
            /* The arrival, one slot at a time, left to right. A custom
               property rather than a class per column so the stylesheet owns
               the timing and this owns only the order. */
            style={arriving ? { '--slot-i': k } : undefined}
          >
            <span className="ses-strip-bars">
              {/* A favourite wears its heart above the bar — the entry's
                  horizon does the same — in ink here rather than red, so the
                  strip stays one colour while it is being built. */}
              {fav && (
                <span className="ses-strip-heart" style={{ bottom: `calc(${pct}% + 3px)` }}>
                  <Heart size={9} weight="fill" aria-hidden="true" />
                </span>
              )}
              <span className={'ses-strip-bar' + (r ? ' ses-strip-bar--rated' : '')} style={{ height: `${pct}%` }} />
            </span>
            <span className="ses-strip-dot" aria-hidden="true" />
            <span className="ses-strip-label" aria-hidden="true">
              <span className="ses-strip-title">{tr.title}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

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
  trackRatings, trackFavorites, trackNotes,
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
        <div className="ses-strip ses-strip--slots" aria-hidden="true">
          {[...Array(6)].map((_, k) => <span key={k} className="ses-strip-col ses-strip-col--waiting" />)}
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
        <ContentsStrip
          tracks={list}
          trackRatings={trackRatings}
          trackFavorites={trackFavorites}
          trackNotes={trackNotes}
          onPick={onPick}
          slots
          arriving={arriving}
        />

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
              <button type="button" className="ses-contents-row" onClick={() => onPick?.(k)}>
                <span className="ses-contents-n">{t.number || k + 1}</span>
                <span className="ses-contents-title">{t.title}</span>
                {width && <span className="ses-contents-bar" style={{ width }} aria-hidden="true" />}
              </button>
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
