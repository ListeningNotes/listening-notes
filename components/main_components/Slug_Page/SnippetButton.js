// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { LinkSimple, Play, Pause } from '@phosphor-icons/react';
import { SNIPPET_SECONDS, toggleSnippet, useSnippetState } from '../../../hooks/useSnippet';

// The round button that plays thirty seconds of a song (hooks/useSnippet.js,
// Miyel's previews brief). A hairline ring and a play mark while idle; filled
// in the page's ink with a pause mark while it plays. `large` is the track
// note's: the one song the page is about gets the room.
//
// A track with no clip gets no button at all — never a disabled one. The
// caller decides that, by not drawing this.
//
// `snippetKey` names the clip across the site, so the one player knows whose
// it is — and a button drawn again, on coming back to its entry while its
// clip still plays, shows it playing.
export default function SnippetButton({ snippetKey, clip, title, large = false }) {
  const now = useSnippetState(snippetKey);
  const on = now.playing || now.waiting;
  const size = large ? 18 : 12;
  return (
    <button
      type="button"
      className={'ln-snippet' + (large ? ' ln-snippet--large' : '') + (on ? ' ln-snippet--on' : '')}
      onClick={() => toggleSnippet(snippetKey, clip)}
      aria-pressed={on}
      aria-busy={now.waiting || undefined}
      aria-label={on ? `Pause the preview of ${title}` : `Play a preview of ${title}`}
    >
      {on ? <Pause size={size} weight="fill" /> : <Play size={size} weight="fill" />}
    </button>
  );
}

function clock(seconds) {
  return '0:' + String(Math.floor(seconds)).padStart(2, '0');
}

// The line and the time under a playing clip. It is drawn only while its clip
// is loaded — playing, waiting, or paused with a place kept — so an idle list
// is completely quiet. `always` keeps it on the track note, where it is the
// one control and sits at 0:00 until pressed.
export function SnippetMeter({ snippetKey, always = false }) {
  const now = useSnippetState(snippetKey);
  if (!always && now.key !== snippetKey) return null;
  const share = Math.min(now.at / SNIPPET_SECONDS, 1);
  return (
    <div className="ln-snippet-meter">
      <span className="ln-snippet-bar"><span style={{ width: `${share * 100}%` }} /></span>
      <span className="ln-snippet-clock">{clock(now.at)} / {clock(SNIPPET_SECONDS)}</span>
    </div>
  );
}

// Open in Apple Music: the way out to the record or the song
// (hooks/useSnippet.js, the link out). A plain mono word with its
// glyph, in a new tab, for visitors and the keeper alike.
export function SnippetLink({ href, children }) {
  if (!href) return null;
  return (
    <a className="ln-snippet-link" href={href} target="_blank" rel="noopener noreferrer">
      <LinkSimple size={14} aria-hidden="true" />
      <span>{children}</span>
    </a>
  );
}
