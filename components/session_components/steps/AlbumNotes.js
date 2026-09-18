// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useState } from 'react';
import { Heart, SketchLogo, Fingerprint } from '@phosphor-icons/react';
import StarRating from '../StarRating';
import HorizonChart from '../../main_components/HorizonChart';

// Step 2 — the shape, the score, then the note. The horizon first, as the
// record actually went track by track; the stars under it, centred; the three
// marks in a single small row, each in its own colour once it is on; and the
// writing at the bottom where there is room for it to grow — a note field
// that keeps getting taller wants nothing underneath it but the button.
//
// The score had a screen of its own for a while. It is here now because the
// flow is one thing at a time and the score is not a thing on its own.

export default function AlbumNotes({
  tracks,
  trackRatings,
  trackFavorites,
  overallNotes,
  setOverallNotes,
  rating,
  setRating,
  Masterpiece,
  Favorite,
  setFavorite,
  Formative,
  setFormative,
}) {
  const list = tracks || [];
  const rated = Object.values(trackRatings || {}).filter(v => v > 0);
  const hasRatings = rated.length > 0;
  const avg = rated.length ? (rated.reduce((a, b) => a + b, 0) / rated.length).toFixed(2) : null;

  // A running average shouldn't steer the score before it's been decided.
  const [avgShown, setAvgShown] = useState(false);

  const flag = (on, kind) => `ses-mark ses-mark--${kind}${on ? ' ses-mark--on' : ''}`;

  return (
    <div>
      {list.length > 0 && hasRatings && (
        /* No bottom margin: the reveal is the last thing in here now, and
           the gap down to the marks is set once, by .ses-marks, rather than
           by this block's margin and that one's adding up to 48px of nothing
           (Miyel, 2026-09-18: "gap between reveal average and tags too
           wide"). */
        <div>
          {/* "Horizon" (Miyel, 2026-09-18). It read "Listening horizon" on a
              screen inside a listen, which is one of the two words doing no
              work. Centred over the chart it names, rather than tucked into
              its left corner. */}
          <div className="ses-label" style={{ marginBottom: 8, textAlign: 'center' }}>Horizon</div>
          <HorizonChart
            tracks={list} trackRatings={trackRatings} favorites={trackFavorites}
            height={56} color="var(--ink-soft)" emptyColor="var(--border)" labelColor="var(--ink-faint)"
          />


      {/* No "Your score" over it. Five stars under a record you are in the
          middle of logging are not ambiguous, and the label was a line of
          type doing the work the stars already do (Miyel, 2026-09-18: "I
          don't think we need to have your score be labeled — we know what
          we're doing"). */}
      <div className="ses-center ses-score" style={{ marginTop: 26 }}>
        <StarRating
          value={rating}
          onChange={setRating}
          size={38}
          /* The tracks' average, once it has been asked for — and unrounded,
             because it is being read rather than chosen. A 4.89 draws as very
             nearly five and not as four and a half (Miyel, 2026-09-18). */
          ghost={avgShown && avg ? Number(avg) : 0}
        />
      </div>

      {/* ── The average, under the stars it draws into ──────────────────
          It sat under the horizon until 2026-09-18 and Miyel moved it here,
          between the stars and the marks. That is where it belongs: what it
          reveals is drawn *into* the stars, so the press and its answer were
          a screen apart.

          It printed a line before that — `avg 3.40 / 5` — which made the
          column three stacked pieces of type saying three things about one
          record. It draws the number into the row above instead: a ghost on
          an empty one, and a tick under a rated one.

          Still behind a press, which is the half worth keeping. Miyel rates
          blind on purpose — "sometimes I like to not see what my average is
          and just rate it and see if it matches up with what I thought" — so
          nothing is shown until it is asked for. */}
          <div className="ses-reveal">
            {avg && (
              <button
                type="button"
                className="ses-quiet"
                style={{ borderBottom: 'none' }}
                onClick={() => setAvgShown(v => !v)}
                aria-pressed={avgShown}
              >
                {avgShown ? 'hide average' : 'reveal average'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── The marks ─────────────────────────────────────────────────────
          Phosphor's SketchLogo, Heart and Fingerprint — the same three an
          archive card carries, in the same three colours.

          They were pills for a long time and Miyel's note on 2026-09-18 was
          that they are easy to miss: "I feel like I might skip marking it as
          formative or favorite… I do think they belong on this screen." Both
          halves of that are right, and a pill was the reason for the first.
          A 12px glyph inside a bordered lozenge reads as a tag — a label
          describing the record — rather than as something to press, and a
          row of tags under a score is furniture you scroll past.

          So they are a glyph over a word now, at the size the rest of the
          site says that to you in: an entry's ···, the address book's doors,
          the band at the foot. It is the one shape this software uses to mean
          *here is something you can do*, and it is four times the mark it was.
          No container, which is the rule as well — a control is the mark, not
          a mark in a container (DECISIONS, 2026-09-17) — so what grew is the
          thing itself rather than a box around it.

          Set, the mark fills and takes its own colour and the word goes to
          ink. Unset, both are faint and the mark is an outline: an offer
          rather than a claim. */}
      <div className="ses-marks">
        {/* Masterpiece is not pressed here either, 2026-09-17. It is read off
            the tracklist — every track rated, every rating five — so it turns
            up when it is true and is simply absent when it is not. Nothing to
            press, nothing refused: the software is not withholding a label, it
            is reporting what the ratings say. It used to be a toggle with a
            gold burst behind it, which was a lovely moment attached to the
            wrong act — awarding yourself the mark rather than finding you had
            earned it. The burst belongs to the arriving, if it comes back. */}
        {Masterpiece && (
          <span className={flag(true, 'mp') + ' ses-mark--said'} title="Every track is five stars">
            <SketchLogo size={24} weight="fill" aria-hidden="true" />
            <span className="ses-mark-word">Masterpiece</span>
          </span>
        )}
        <button
          type="button"
          className={flag(Favorite, 'fav')}
          onClick={() => setFavorite(!Favorite)}
          aria-pressed={Favorite}
          title="A record you love"
        >
          <Heart size={24} weight={Favorite ? 'fill' : 'regular'} aria-hidden="true" />
          <span className="ses-mark-word">Favorite</span>
        </button>
        <button
          type="button"
          className={flag(Formative, 'formative')}
          onClick={() => setFormative(!Formative)}
          aria-pressed={Formative}
          title="A record that made you"
        >
          {/* Bold, not fill. Phosphor's filled Fingerprint is a solid pad with
              the ridges knocked *out* of it, so turning it on painted the
              background green and left the print itself as gaps — the
              opposite of what the mark is (Miyel, 2026-09-18: "the
              fingerprint should be the part that fills in green"). Weight is
              what this glyph has instead of fill: thin grey lines unset,
              thick green ones set. */}
          <Fingerprint size={24} weight={Formative ? 'bold' : 'regular'} aria-hidden="true" />
          <span className="ses-mark-word">Formative</span>
        </button>
      </div>

      <hr className="ses-rule" style={{ margin: '30px 0 24px' }} />

      <div className="ses-label" style={{ marginBottom: 12 }}>Album notes</div>
      <textarea
        ref={el => {
          // Size on mount too, so returning to this step doesn't clip long notes.
          if (!el) return;
          el.style.height = 'auto';
          el.style.height = el.scrollHeight + 'px';
        }}
        className="ses-textarea"
        value={overallNotes}
        onChange={e => {
          setOverallNotes(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = e.target.scrollHeight + 'px';
        }}
        placeholder="How does this album feel as a whole? Themes, impressions, context…"
        rows={7}
      />
      {/* A character count sat under here until 2026-09-18. Nothing in this
          software has ever had a limit to count towards, so it was a number
          that only ever went up — and a number going up beside something you
          are writing reads as a target whether or not one exists. Miyel:
          "remove character count on the album screen." */}

      {/* "Preview →" sat here until 2026-09-18. The left swipe has reached
          the preview from this screen the whole time, and Miyel's call was
          that the arrow under it was saying out loud what the gesture
          already does: "i think its intuitive enough that theyre not
          needed." The note field is the last thing on the screen now, which
          is the right last thing — it can grow as far as it likes with
          nothing underneath waiting to be pushed down. */}
    </div>
  );
}
