// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { Heart } from '@phosphor-icons/react';
import { fonts } from '../../../library/sitewide_visuals';
import StarRating from '../StarRating';
import StarPicker from '../../session_components/StarRating';
import CommentBubble from './CommentBubble';
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
  track, note, trackIndex, slug, commentsByTrack, onRefresh,
  editing = false, draft, onField,
}) {
  // Under this track's note, if this track's note has been rewritten. Stored
  // on the track itself rather than on the entry — see the stamps in
  // update_entry — so a typo fixed in track two marks track two and says
  // nothing about the other eleven.
  const edited = editStamp(track.edited);
  const trackComments = commentsByTrack[String(trackIndex)] || [];

  return (
    // Padding lives on the track itself, so the gap above the divider is the
    // same whether or not this track has a thread and a + comment under it.
    <div id={'track-' + trackIndex} style={{ borderBottom: '1px solid var(--border)', paddingBottom: '18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 0' }}>
        {/* Number reads left, flush with the page edge — right-aligning it in
            a fixed box was what made the row look indented. */}
        <span style={{ fontFamily: fonts.mono, fontSize: '10px', color: 'var(--ink-faint)', textAlign: 'left', flexShrink: 0 }}>{track.num}</span>
        {editing ? (
          <input
            className="ln-field ln-track-field"
            value={draft?.title ?? track.name ?? ''}
            onChange={e => onField?.('title', e.target.value)}
            aria-label={`Title of track ${track.num}`}
          />
        ) : (
          <span className="ln-track-name" style={{ fontSize: '13px', color: 'var(--ink)', minWidth: 0 }}>{track.name}</span>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: 'auto', flexShrink: 0 }}>
          {/* Editing, the heart is always there and is filled or not; reading,
              it appears only when it is filled. A row of empty hearts down a
              tracklist would be a column of controls nobody asked for. */}
          {editing ? (
            <button
              type="button"
              className={'ln-track-heart' + (draft?.favorite ? ' ln-track-heart--on' : '')}
              onClick={() => onField?.('favorite', !draft?.favorite)}
              aria-pressed={!!draft?.favorite}
              aria-label={`Favourite ${track.name}`}
            >
              <Heart size={13} weight={draft?.favorite ? 'fill' : 'regular'} />
            </button>
          ) : track.favorite ? (
            <span title="Favourite song" style={{ display: 'inline-flex', color: 'var(--fav, #f0484f)', lineHeight: 1 }}><Heart size={12} weight="fill" /></span>
          ) : null}
          {editing ? (
            <StarPicker
              value={draft?.rating || 0}
              onChange={v => onField?.('rating', v)}
              size={14}
            />
          ) : track.stars > 0 ? (
            <StarRating rating={track.stars} size={12} />
          ) : null}
        </div>
      </div>

      {/* The note carries no border of its own — the row's own bottom border
          already closes the track off, and having both drew two lines a few
          pixels apart. */}
      {/* While editing, every track gets a field whether or not it had a note:
          a track you never wrote about is exactly the one you might want to,
          and a row with nothing to type into is a row that says you cannot. */}
      {editing ? (
        <textarea
          className="ln-write ln-write--track"
          value={draft?.note ?? track.note ?? ''}
          onChange={e => onField?.('note', e.target.value)}
          onInput={e => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`; }}
          ref={el => { if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px`; } }}
          placeholder="Nothing yet"
          aria-label={`Note on ${track.name}`}
        />
      ) : track.note ? (
        <p style={{ fontSize: '13px', lineHeight: 1.8, color: 'var(--ink-soft)', marginBottom: '6px', whiteSpace: 'pre-wrap' }}>{note ?? track.note}</p>
      ) : null}
      {edited && !editing && <p className="ln-edited">Edited {edited}</p>}

      {/* The way in, at the end of the note you've just read. Lives in
          CommentBubble now, which the album notes share — see the note at the
          top of that file for why. */}
      <CommentBubble
        slug={slug}
        trackIndex={trackIndex}
        comments={trackComments}
        label={track.name}
        onRefresh={onRefresh}
      />
    </div>
  );
}
