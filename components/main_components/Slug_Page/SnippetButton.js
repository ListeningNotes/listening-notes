// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { ArrowSquareOut, Play, Pause } from '@phosphor-icons/react';
import { toggleSnippet, useSnippetState } from '../../../hooks/useSnippet';

// The round button that plays a song — a thirty-second preview, today
// (hooks/useSnippet.js, Miyel's previews brief). A hairline ring and a play mark while idle; filled
// in the page's ink with a pause mark while it plays. `large` is the track
// note's: the one song the page is about gets the room.
//
// `play` is what the resolver answered for the track: { source, duration,
// kind }. A track with nothing to play gets no button at all — never a disabled one. The
// caller decides that, by not drawing this.
//
// `snippetKey` names the clip across the site, so the one player knows whose
// it is — and a button drawn again, on coming back to its entry while its
// clip still plays, shows it playing.
export default function SnippetButton({ snippetKey, play, title, large = false }) {
  const now = useSnippetState(snippetKey);
  const on = now.playing || now.waiting;
  const size = large ? 18 : 12;
  return (
    <button
      type="button"
      className={'ln-snippet' + (large ? ' ln-snippet--large' : '') + (on ? ' ln-snippet--on' : '')}
      onClick={() => toggleSnippet(snippetKey, play)}
      aria-pressed={on}
      aria-busy={now.waiting || undefined}
      aria-label={play.kind === 'preview'
        ? (on ? `Pause the preview of ${title}` : `Play a preview of ${title}`)
        : (on ? `Pause ${title}` : `Play ${title}`)}
    >
      {on ? <Pause size={size} weight="fill" /> : <Play size={size} weight="fill" />}
    </button>
  );
}

function clock(seconds) {
  const s = Math.floor(seconds || 0);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

// The line and the time under a playing clip. It is drawn only while its clip
// is loaded — playing, waiting, or paused with a place kept — so an idle list
// is completely quiet. `always` keeps it on the track note, where it is the
// one control and sits at 0:00 until pressed. The length is the play's while
// it is loaded, and before that the one `duration` says it will be.
export function SnippetMeter({ snippetKey, duration = 0, always = false }) {
  const now = useSnippetState(snippetKey);
  if (!always && now.key !== snippetKey) return null;
  const length = now.duration || duration;
  const share = length ? Math.min(now.at / length, 1) : 0;
  return (
    <div className="ln-snippet-meter">
      <span className="ln-snippet-bar"><span style={{ width: `${share * 100}%` }} /></span>
      <span className="ln-snippet-clock">{clock(now.at)}{length ? ` / ${clock(length)}` : ''}</span>
    </div>
  );
}

// Apple Music: the way out to the record or the song (hooks/useSnippet.js,
// the link out), in a new tab, for visitors and the keeper alike. A door —
// a glyph over one word, in a row of `.ln-doors` — on the record page and
// the song page alike (Miyel, 2026-10-29: "be buttons more like the rest of
// the site", and the record's to match the song's).
export function SnippetLink({ href, children }) {
  if (!href) return null;
  return (
    <a className="ln-door" href={href} target="_blank" rel="noopener noreferrer">
      <ArrowSquareOut size={22} weight="regular" aria-hidden="true" />
      <span>{children}</span>
    </a>
  );
}
