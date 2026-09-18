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
// Hours and minutes, not a count of minutes. It was a bare number for an hour
// on 2026-09-18, on the reasoning that a band of figures wants one figure per
// cell — and Miyel put the hours back for the reason that actually matters:
// "I think 1 hr 12 min is a better idea of how long a record is. I don't know
// off the top of my head what a 72 min long record feels like." A unit you
// have to convert in your head is not a fact you have been told. The band
// sets the digits large and the units small instead (.ses-unit), so the
// figure still reads as a figure.
//
// H and M rather than hr and min, Miyel's, the same day: two letters carry it
// and four take room the cell has not got on a 320px phone. `1 H 12 M` is not
// ambiguous next to the word RUNTIME.
function runtimeOf(tracks) {
  const secs = (tracks || []).reduce((total, t) => total + (Number(t.duration) || 0), 0);
  if (!secs) return '';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins} M`;
  const hrs = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest ? `${hrs} H ${rest} M` : `${hrs} H`;
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

  // ── The facts, in the identity card's shape ──────────────────────────
  // Five label-and-value rows until 2026-09-18, stacked one under another
  // above a tracklist that is also stacked one under another. Two lists on
  // one screen, and only one of them is a list. Miyel: "the tracklist should
  // be the only thing that reads as a list. Maybe the other things are the
  // number with what it is under, like albums, masterpieces and formative."
  //
  // That is the card's own counts band, and the classes below are literally
  // its classes rather than a copy of them — a figure over a word, three
  // across, in a ruled band. Nothing here can drift away from what the card
  // does, because it is what the card does.
  //
  // The split is what each fact *is*. Three are numbers and belong in the
  // band; genre and a label are words, and words set at 26px in a third of a
  // phone's width are not a count, they are a headline. So they take the line
  // the card gives its genres, underneath — which is the card's answer to the
  // same problem, arrived at for the same reason.
  //
  // Every cell that has something behind it, and none that has not. A blank
  // under a word is worse than a missing cell: it reads as a fact the record
  // does not have rather than one nobody knows.
  const counts = [
    ['tracks', String(list.length)],
    ['runtime', runtimeOf(list)],
    ['released', facts.released || ''],
  ].filter(([, value]) => value);

  // Genre and a label sat on a line under the band for an hour on 2026-09-18
  // and came off the same day. Miyel: "we can remove genre and label, it's not
  // necessary right now. We don't even show the genre tag on entry posts — I
  // think it's just for filtering your archive, let's just leave it only
  // there."
  //
  // She is right about where it earns its place: `genre` is a column the
  // archive filters on, and it goes on being fetched and saved by the same
  // lookup this screen already makes. Nothing is lost by not printing it here.
  // The label is still parsed (labelFrom in music_data_api.js, checked against
  // eight real copyright strings) and now goes nowhere — parked rather than
  // pulled out, because the parsing was the work and the fetch was happening
  // anyway.

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
        <div className="ses-facts">
          {counts.length > 0 && (
            <div className="idc-counts">
              {counts.map(([word, n]) => (
                <div className="idc-count" key={word}>
                  {/* A value carrying its own units — only the runtime does —
                      is set as digits at full size with the units small
                      between them. `runtimeOf` builds the string one space at
                      a time, so the odd pieces are always the units. */}
                  <b className="idc-count-n">
                    {/[a-z]/i.test(n)
                      ? n.split(' ').map((bit, i) => (
                          i % 2 ? <i className="ses-unit" key={i}>{bit}</i> : bit
                        ))
                      : n}
                  </b>
                  <span className="idc-count-word">{word}</span>
                </div>
              ))}
            </div>
          )}
        </div>
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
