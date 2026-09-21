// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useState } from 'react';
import CommentThread from './CommentThread';
import NewCommentForm from './NewCommentForm';

// Everything behind the way in at the end of a note: the count, the thread it
// folds open, and the form you post from — which unfolds in place rather than
// floating over the page. It lived inside TrackThread until the album notes
// needed the same thing; copying it would have meant two places to keep in
// step, and the whole point is that commenting on the album feels identical to
// commenting on a track.
//
// `trackIndex` is what the comment is attached to: 0…n for a track, -1 for the
// album as a whole. That -1 is not a new convention — save_comment has always
// written it for a comment that names no track, and the moderation inbox
// already reads `track_index >= 0` to decide whether to print "· track 4".
// Nothing on the page had ever asked for the bucket, so nothing showed it.
//
// ── Everything here used to be written inline ─────────────────────────────
// Rebuilt 2026-09-21. Miyel: "the comments — I feel like they are so outdated,
// the box is old, it's a thing that has not been touched since we have
// basically designed every new aspect of this site." It was the last corner of
// the entry carrying its own style objects, and what they described was a
// site that no longer exists: a hand-drawn speech bubble, a frosted panel with
// a 14px radius, a filled accent button with its text colour in hex. The
// styles are .ln-say-* in entry.css now, with the reasoning beside them.
export default function CommentBubble({ slug, trackIndex, comments = [], onRefresh }) {
  // Comments are simply there. Hiding them behind a control was solving a
  // volume problem this site doesn't have, and it's what made an approved
  // comment look like it had never posted.
  const [showComments, setShowComments] = useState(true);
  const [composing, setComposing] = useState(false);
  const count = comments.length;
  const open = count > 0 && showComments;

  return (
    <>
      {/* The way in, at the end of the note you have just read. With comments
          it carries the count and folds the thread; with none it is the
          invitation, and pressing it opens the form.

          A word rather than the drawn bubble and a number that stood here for
          a year: a control is the mark or it is the word, and this site has no
          other hand-drawn glyph left in it. The count is in the word, so the
          row says what pressing it will do instead of leaving you to read a
          numeral beside a picture. */}
      <div className={'ln-say-way' + (open ? ' ln-say-way--open' : '')}>
        <button
          type="button"
          className="ln-word"
          onClick={() => (count > 0 ? setShowComments(v => !v) : setComposing(true))}
          aria-expanded={count > 0 ? showComments : undefined}
          aria-label={count === 0 ? 'Add the first comment' : showComments ? 'Hide comments' : 'Show comments'}
        >
          {count === 0 ? 'Comment' : count === 1 ? '1 comment' : `${count} comments`}
        </button>
      </div>

      {open && (
        <div className="ln-says">
          {comments.map(c => (
            <CommentThread key={c.id} comment={c} slug={slug} onReplyPosted={onRefresh} />
          ))}
        </div>
      )}

      {/* Only at the foot of an open thread, where you land having read it. An
          empty track already has its way in on the row above, and repeating it
          here would put a second control on every track with nothing to show.
          It stands down while the form is open, because the form is what it
          opens and a button that does nothing is worse than no button. */}
      {open && !composing && (
        <div className="ln-say-way">
          <button type="button" className="ln-word" onClick={() => setComposing(true)}>
            Add one
          </button>
        </div>
      )}

      {/* ── It unfolds here, it does not float over the page ──────────────
          This was a fixed overlay with a backdrop, on the argument that a form
          opening in the tracklist pushes everything below it down while you
          type. That is true and it is the wrong thing to avoid: a comment is a
          reply to the note directly above it, and a box floating in the middle
          of a darkened screen has been taken away from the thing it is about.
          Pushing the tracks down is what leaving space looks like.

          Nothing is covered, nothing is dimmed, and the note you are answering
          stays where it was and stays readable. The page grows and you can
          scroll, which is what a page does. */}
      {composing && (
        <div className="ln-say-form">
          {/* No heading over it. It said ADD A COMMENT and then the name of the
              track — two lines telling you what you had just pressed and which
              song you were already looking at. Miyel, 2026-09-21: "take away
              'add a comment' and also song title, we know what song we're on,
              that's extra bulk." The form opens under the note it answers, and
              where a thing opens is what it is about. */}
          <NewCommentForm
            slug={slug}
            trackIndex={trackIndex}
            onPosted={() => { setComposing(false); setShowComments(true); onRefresh(); }}
            onLeave={() => setComposing(false)}
          />
        </div>
      )}
    </>
  );
}
