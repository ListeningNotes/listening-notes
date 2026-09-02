// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { serializeTracks } from '../../../library/entry_formatter';
import FullPostPage from '../../../app/entries/[slug]/FullPostPage';

// Step 3 — the entry, exactly as the page will print it, and the button that
// saves it. Not a rendering of its own: it is the entry page, handed a row
// that does not exist yet and told it is a preview. So what you see is what
// a reader will see, down to the sticky labels and the horizon, and any
// change to how an entry looks changes this with it.
//
// It stands on the same sheet an entry arrives on (`.lay`), over the whole
// session, because the entry's phone layout is two snap screens that need
// the viewport and would not survive being nested in the session's own
// scroller. And it is drawn at the top of the document, not inside the
// session: the session itself is a layer, a fixed sheet that scrolls, and a
// fixed sheet inside a fixed sheet is positioned against the outer one
// rather than the screen — which on a phone put the entry a scroll's worth
// too low and cut its foot off. A portal puts this where a real entry layer
// lives. A bar along the foot holds the way back and the save.
//
// Viewable at any time, from any step — a look at the page so far is how you
// find out what the note still needs. Saving waits for an album note. The
// pencil over the save is the way back to the writing — the same mark the
// entry's own keeper tools use for editing — and a swipe right or Escape
// does the same.

export default function SessionPreview({
  album, artist, year, albumArt, genre,
  overallNotes, rating, Masterpiece, Favorite, Formative, entryType, receivedFrom,
  tracks, trackRatings, trackFavorites, trackNotes,
  saving, saved, savedEntry,
  doSave, onBack, onAnother,
}) {
  // The row as create_entry would receive it, built the same way doSave
  // builds its payload so the two cannot disagree. No slug: nothing on the
  // page fetches by one, and the preview flag keeps it that way.
  const entry = useMemo(() => {
    const structured = (tracks || []).map((t, i) => ({
      number: t.number || i + 1,
      title: t.title,
      rating: trackRatings[i] || 0,
      favorite: !!trackFavorites[i],
      note: (trackNotes[i] || '').trim(),
    })).filter(t => t.rating > 0 || t.note || t.favorite);
    const derived = serializeTracks(structured);
    return {
      slug: '',
      album, artist, year: year || '', genre: genre || '',
      album_art: albumArt || '',
      entry_type: entryType || 'Personal Library',
      rating: rating ? rating + ' stars' : (Masterpiece ? '5 stars' : ''),
      favorite: Favorite, masterpiece: Masterpiece, formative: Formative,
      notes: overallNotes,
      tracks: structured,
      track_notes: derived.track_notes,
      horizon: derived.horizon,
      received_from: receivedFrom || null,
      created_at: new Date().toISOString(),
      edited_at: null,
      listen_number: 1, listen_total: 1,
    };
  }, [album, artist, year, genre, albumArt, entryType, rating, Masterpiece, Favorite, Formative, overallNotes, tracks, trackRatings, trackFavorites, trackNotes, receivedFrom]);

  // Escape is the way back here, and only here — the layer under this
  // listens for the same key, and stopping it keeps one press from closing
  // the whole listen.
  function onKey(e) {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    onBack();
  }

  // A swipe to the right is the same page-turn the rest of the session uses.
  const touch = useRef(null);
  function start(e) { if (e.touches.length === 1) touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
  function end(e) {
    const from = touch.current; touch.current = null;
    if (!from) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - from.x, dy = t.clientY - from.y;
    if (dx > 56 && dx > Math.abs(dy) * 1.5) onBack();
  }

  // The sheet takes the focus so Escape reaches it.
  const sheet = useRef(null);
  useEffect(() => { sheet.current?.focus({ preventScroll: true }); }, []);

  const canSave = !!overallNotes.trim() && !saved;

  // The portal needs the document. This only ever renders in the browser —
  // the session page draws nothing until the door has been checked — so the
  // body is there on the first render.
  const [host] = useState(() => (typeof document !== 'undefined' ? document.body : null));
  if (!host) return null;

  return createPortal(
    <div
      ref={sheet}
      className="lay ses-preview"
      role="dialog"
      aria-label="Preview"
      tabIndex={-1}
      onKeyDown={onKey}
      onTouchStart={start}
      onTouchEnd={end}
    >
      {/* Keyed so a changed note re-mounts the page and its typed-in reveals
          rather than patching a page built for the old text. */}
      <FullPostPage key={entry.notes.length + ':' + entry.tracks.length} entry={entry} references={[]} layered preview />

      {/* The foot: two quiet links, the same ones every screen in the listen
          moves on with — back to the session, or on to the journal. */}
      <div className="ses-preview-bar">
        {!saved ? (
          <>
            <button type="button" className="ses-quiet" onClick={onBack}>← Return to session</button>
            {!overallNotes.trim()
              ? <span className="ses-label">Write an album note to save</span>
              : (
                <button type="button" className="ses-quiet ses-quiet--lead" onClick={doSave} disabled={saving}>
                  {saving ? 'Saving…' : 'Save to journal →'}
                </button>
              )}
          </>
        ) : (
          <>
            <span className="ses-label" style={{ color: 'var(--ink)' }}>✓ Saved</span>
            {savedEntry?.slug && (
              <a href={`/entries/${savedEntry.slug}`} className="ses-btn ses-btn--primary">Read it →</a>
            )}
            <button type="button" className="ses-btn" onClick={onAnother}>Log another</button>
          </>
        )}
      </div>
    </div>,
    host
  );
}
