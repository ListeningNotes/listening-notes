// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { Heart } from '@phosphor-icons/react';
import StarRating from '../StarRating';
import TrackDial from './TrackDial';
import { editStamp } from '../../../library/entry_formatter';

// `note` is the track's own note with any cross-references already turned
// into links — see FullPostPage for why the linking happens up there and not
// here. Falls back to the plain text so the component still stands alone.
// `track` is always the display shape entryTracks builds — num, name, stars,
// note, favorite. `draft` is the row as it is stored, and only arrives while
// editing: the two have different key names, and handing the stored shape in
// where the display one was expected is exactly how the number, the title and
// the stars once vanished the moment edit mode opened.
export default function TrackThread({
  track, note, trackIndex,
  editing = false, draft, onField, onOpenDial, dialOpen = false,
}) {
  // Under this track's note, if this track's note has been rewritten. Stored
  // on the track itself rather than on the entry — see the stamps in
  // update_entry — so a typo fixed in track two marks track two and says
  // nothing about the other eleven.
  const edited = editStamp(track.edited);

  // ── Rated is a row; written is a row with its note under it ─────────────
  // 2026-09-24, the track-notes brief. Every track used to reserve room for a
  // note and a way to comment on it, so an entry that was rated and not
  // written read as a form somebody abandoned — and rating without writing is
  // a real way to keep a journal. So a track with nothing written is one
  // tight row, number, title, marks, stars, and nothing under it. A written
  // one keeps the row and has its note underneath.
  //
  // Nothing else stands under a track, from 2026-09-29: comments went, and
  // the one way in to an entry is under its album note (MessageForm.js). An
  // edit stamp left by a note that was taken out still opens the space.
  const written = !!(track.note || '').trim();
  const under = !editing && (written || !!edited);
  const noteRead = (
    <>
      {written && <p className="ln-track-note">{note ?? track.note}</p>}
      {edited && <p className="ln-edited ln-track-edited">Edited {edited}</p>}
    </>
  );

  return (
    // The rule under a track is the track's own, so it sits under the note
    // when there is one and under the row when there is not — one line per
    // song either way.
    <div id={'track-' + trackIndex} className={'ln-track' + (editing ? ' ln-track--editing' : '')}>
      <div className={'ln-track-row' + (under ? ' ln-track-row--open' : '')}>
        {/* Number reads left, flush with the page edge — right-aligning it in
            a fixed box was what made the row look indented. The box is
            fixed-width and left-aligned, so the titles start on one line
            whether a record has nine songs or nineteen. */}
        <span className="ln-track-num">{track.num}</span>
        {editing ? (
          <input
            className="ln-field ln-track-field"
            value={draft?.title ?? track.name ?? ''}
            onChange={e => onField?.('title', e.target.value)}
            aria-label={`Title of track ${track.num}`}
          />
        ) : (
          <span className="ln-track-name">{track.name}</span>
        )}
        <div className="ln-track-marks">
          {/* Editing, the heart is always there and is filled or not; reading,
              it appears only when it is filled. A row of empty hearts down a
              tracklist would be a column of controls nobody asked for. */}
          {/* The heart is a door as well, 2026-09-17. It used to toggle in
              place while the stars beside it opened somewhere else, so one row
              held two different promises about what a press does. Both open
              the track now, and the track is where a change happens. */}
          {editing ? (
            <button
              type="button"
              className={'ln-track-heart' + (draft?.favorite ? ' ln-track-heart--on' : '')}
              onClick={() => onOpenDial?.(dialOpen ? null : trackIndex)}
              aria-expanded={dialOpen}
              aria-label={`Rate ${track.name}`}
            >
              <Heart size={15} weight={draft?.favorite ? 'fill' : 'regular'} />
            </button>
          ) : track.favorite ? (
            <span title="Favourite song" style={{ display: 'inline-flex', color: 'var(--fav, #f0484f)', lineHeight: 1 }}><Heart size={12} weight="fill" /></span>
          ) : null}
          {/* Editing, the stars are a door rather than a control: pressing
              anywhere along them opens the track on its own screen, where half
              a star is the size of a thumbnail instead of seven pixels and the
              number is printed underneath (TrackDial.js, 2026-09-17). Picking
              in place was reachable after the targets grew and still asked you
              to see a difference you cannot see at this size.

              It shows what the track is worth, so the row still reads at a
              glance. Where nothing is set it said the words "Not rated" until
              2026-09-18, on the reasoning that an empty row of stars is a
              control nobody asked for — which was true while an entry only
              ever held the tracks you had written on. It holds the whole
              record now, so the rows with nothing on them are the point of
              opening a correction at all, and two words are a worse invitation
              than five empty stars. Miyel: "it should show an empty blank star
              stand-in when editing, not just 'Not rated'." The row draws them
              faint at rating 0 on its own. */}
          {editing ? (
            <button
              type="button"
              className="ln-track-stars"
              onClick={() => onOpenDial?.(dialOpen ? null : trackIndex)}
              aria-expanded={dialOpen}
              aria-label={`Rate ${track.name}`}
            >
              <StarRating rating={draft?.rating || 0} size={14} />
            </button>
          ) : track.stars > 0 ? (
            <StarRating rating={track.stars} size={14} />
          ) : null}
        </div>
      </div>

      {editing && dialOpen && (
        <TrackDial
          track={track}
          rating={draft?.rating || 0}
          favorite={!!draft?.favorite}
          onField={(key, value) => onField?.(key, value)}
          onClose={() => onOpenDial?.(null)}
        />
      )}

      {/* The note carries no border of its own — the track's own bottom border
          already closes it off, and having both drew two lines a few pixels
          apart. */}
      {/* While editing, every track gets a field whether or not it had a note:
          a track you never wrote about is exactly the one you might want to,
          and a row with nothing to type into is a row that says you cannot. */}
      {editing && (
        <textarea
          className="ln-write ln-write--track"
          value={draft?.note ?? track.note ?? ''}
          onChange={e => onField?.('note', e.target.value)}
          onInput={e => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`; }}
          ref={el => { if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } }}
          placeholder="No notes"
          aria-label={`Note on ${track.name}`}
        />
      )}

      {under && (
        <div className="ln-say-beside">
          <div className="ln-say-beside-text">{noteRead}</div>
        </div>
      )}
    </div>
  );
}
