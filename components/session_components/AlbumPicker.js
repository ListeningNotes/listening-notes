// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/session_components/AlbumPicker.js
// Type, see covers, tap one. The screen before a listen.
//
// ── What used to be here ──────────────────────────────────────────────────
// A network of floating nodes that zoomed, spotlit, grew the results out of
// itself and flew the chosen cover to the centre, then asked a question before
// letting you in. Several seconds of ceremony between "I want to log this"
// and logging it — beautiful once, and paid for on every listen after, and on
// a phone not visible at all. The network is still in the building: it is one
// of the dashboard's backgrounds now, where it is ambient rather than in the
// way.
//
// What replaced it is the plainest thing that does the job. The covers are
// the beauty here and need no help. The one moment kept is the landing — the
// cover you tap settles into the header of the session — and that belongs to
// the page, which can see both ends of the journey.
//
// ── What it shares with the send flow ─────────────────────────────────────
// searchAlbums() in library/music_data_api.js, the same lookup AlbumFinder
// wraps: two searches merged, pressings collapsed, editions scored. The two
// components stay separate because they answer different questions. Somebody
// sending an album knows which one they mean, so AlbumFinder shows a dozen on
// a shelf. The owner logging a listen may be browsing a whole catalogue —
// Pet Sounds sat at position 61 once — so this is a grid, and it shows
// everything the search found.
//
// The unfinished listens sit under the field until you start typing. The
// page's job is still to ask what you want to hear; those are only the
// answers you already gave and did not finish.

'use client';
import { useEffect, useRef, useState } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import SiteNav from '../main_components/SiteNav';
import { searchAlbums } from '../../library/music_data_api';
import { SESSION_STEPS } from '../../hooks/useListeningSession';

// Long enough that typing an artist's name is one search rather than eight,
// short enough that it never feels like waiting.
const SETTLE_MS = 420;

// How long a draft has been sitting there. Rounded hard on purpose — the point
// is 'this morning' or 'last week', not a timestamp.
function sinceLabel(iso) {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

// `inline` is the picker inside something that is already a screen — the
// beacon pane, where choosing a record happens on the page you are already on
// rather than on a page of its own (Miyel's beacon brief, 2026-09-17). It
// changes three things and nothing else: no nav row, because the cross
// already has one; the wrapper loses the padding it needed to clear a fixed
// header; and the field is a hairline with a magnifier rather than a box.
//
// It is a shape and not a fork. The search, the debounce, the stale-answer
// guard, the grid, the by-hand fallback and the drafts are the same code
// running in a different box — a second search on this site would be two
// places for one bug to live, and the brief said so outright.
//
// NAME: `inline` is a placeholder for Miyel (AGENTS.md).
export default function AlbumPicker({ onPick, onResume, inline = false }) {
  const [typed, setTyped]       = useState('');
  const [results, setResults]   = useState([]);
  const [looking, setLooking]   = useState(false);
  const [asked, setAsked]       = useState(false);   // a search has come back
  const [byHand, setByHand]     = useState(false);
  const [hand, setHand]         = useState({ album: '', artist: '', year: '' });

  // Listens saved and walked away from, newest first.
  const [drafts, setDrafts]                 = useState([]);
  const [confirmDiscard, setConfirmDiscard] = useState(null);   // draft id

  // Which search the results on screen belong to. A slow answer to "rad"
  // arriving after a fast one to "radiohead" would otherwise replace the good
  // results with the stale ones.
  const askedFor = useRef('');

  useEffect(() => {
    fetch('/api/drafts')
      .then(r => r.json())
      .then(d => setDrafts(d.drafts || []))
      .catch(() => {});
  }, []);

  // Typing is an event, not something to react to after the fact — clearing
  // the grid and showing "Looking…" happen here. The effect below owns only
  // the timer.
  function type(value) {
    setTyped(value);
    if (!value.trim()) { setResults([]); setLooking(false); setAsked(false); }
    else setLooking(true);
  }

  useEffect(() => {
    const query = typed.trim();
    if (!query) return undefined;
    const id = setTimeout(async () => {
      askedFor.current = query;
      const found = await searchAlbums(query);
      if (askedFor.current !== query) return;
      setResults(found);
      setLooking(false);
      setAsked(true);
    }, SETTLE_MS);
    return () => clearTimeout(id);
  }, [typed]);

  // The tile's cover is where the landing starts from, so its box goes along
  // with the record.
  function take(album, e) {
    const img = e.currentTarget.querySelector('img');
    const from = img ? img.getBoundingClientRect() : null;
    onPick({
      album: album.name,
      artist: album.artist,
      year: album.year || '',
      // The picker draws 600px covers; the session header and any print of
      // the entry want the biggest Apple has.
      artUrl: album.artLarge || album.art || '',
      collectionId: album.collectionId || null,
      genre: album.genre || '',
      entryType: '',
    }, from);
  }

  function takeByHand() {
    if (!hand.album.trim() || !hand.artist.trim()) return;
    onPick({
      album: hand.album.trim(),
      artist: hand.artist.trim(),
      year: hand.year.trim(),
      artUrl: '',
      collectionId: null,
      genre: '',
      entryType: '',
    }, null);
  }

  // Two taps, because there's no undo on the other side of this one.
  async function discardDraft(id) {
    if (confirmDiscard !== id) { setConfirmDiscard(id); return; }
    setDrafts(prev => prev.filter(d => d.id !== id));
    setConfirmDiscard(null);
    try { await fetch(`/api/drafts/${id}`, { method: 'DELETE' }); } catch { /* already gone */ }
  }

  const nothing = asked && !looking && results.length === 0 && typed.trim();

  return (
    <div className={'ses-picker' + (inline ? ' ses-picker--inline' : '')}>
      {/* The same row every other page carries — the mark in the middle, the
          day-and-night switch top right. It goes home; there is no dashboard
          door here, because the desk is where this opened from and the way
          back to it is the layer's own swipe.

          Not inline: the cross has its own bar and its own mark, and a second
          logo under the first is the one thing a pane must not do. */}
      {!inline && <SiteNav />}

      {byHand ? (
        <div className="ses-hand">
          <label className="ses-field">
            <span className="ses-label">Album</span>
            <input className="ses-input" value={hand.album} onChange={e => setHand(h => ({ ...h, album: e.target.value }))} autoFocus />
          </label>
          <label className="ses-field">
            <span className="ses-label">Artist</span>
            <input className="ses-input" value={hand.artist} onChange={e => setHand(h => ({ ...h, artist: e.target.value }))} />
          </label>
          <label className="ses-field ses-field--year">
            <span className="ses-label">Year</span>
            <input className="ses-input" value={hand.year} onChange={e => setHand(h => ({ ...h, year: e.target.value }))} />
          </label>
          <div className="ses-actions">
            <button type="button" className="ses-btn ses-btn--primary" onClick={takeByHand} disabled={!hand.album.trim() || !hand.artist.trim()}>
              Start listening →
            </button>
            <button type="button" className="ses-quiet" onClick={() => setByHand(false)}>← Back to search</button>
          </div>
        </div>
      ) : (
        <>
          {/* A hairline and a magnifier when it is inline — no border but the
              underline (the mockup). The glyph is inside the label so the
              whole line is the tap target, which is what a rule with no box
              round it otherwise loses. */}
          <label className={'ses-search' + (inline ? ' ses-search--hair' : '')}>
            {inline && <MagnifyingGlass size={18} weight="regular" aria-hidden="true" />}
            <input
              className="ses-input"
              value={typed}
              onChange={e => type(e.target.value)}
              placeholder="Search an artist or an album"
              autoComplete="off"
              /* Not inline, and this is the whole of Miyel's "it goes off the
                 screen and everything goes way too high" on a real phone,
                 2026-09-17. On a page of its own the picker IS the screen, so
                 opening the keyboard the moment it arrives is right: there is
                 nothing else to look at and the field is the one thing to do.

                 On the pane there is: a cover that has just shrunk into place
                 and a caption saying what is happening. iOS answers a focused
                 field by scrolling it up the visual viewport, which took the
                 cover off the top of the screen and the fixed bar with it —
                 fixed elements do not stay fixed against the visual viewport
                 while the keyboard is up. Nothing was broken; everything had
                 simply been shoved up by half a screen before she could look
                 at it.

                 So inline it waits to be tapped. One tap, and the arrangement
                 she just watched assemble is still there underneath it. */
              autoFocus={!inline}
            />
          </label>

          <div className="ses-under">
            {looking && <span className="ses-label">Looking…</span>}
            {nothing && <span className="ses-label">Nothing found for that.</span>}
            {/* Offered from the start rather than only once a search has come
                back empty: somebody who already knows the record is not on
                Apple Music should not have to prove it first. */}
            <button type="button" className="ses-quiet" onClick={() => setByHand(true)}>
              Type it in yourself →
            </button>
          </div>

          {results.length > 0 && (
            <div className="ses-grid">
              {results.map(album => (
                <button
                  type="button"
                  key={album.collectionId}
                  className="ses-tile"
                  onClick={e => take(album, e)}
                >
                  <span className="ses-tile-art">
                    <img src={album.art} alt="" loading="lazy" />
                  </span>
                  <span className="ses-tile-name">{album.name}</span>
                  <span className="ses-tile-year">{album.artist}{album.year ? ` · ${album.year}` : ''}</span>
                </button>
              ))}
            </div>
          )}

          {drafts.length > 0 && !typed.trim() && (
            <div className="ses-drafts">
              <span className="ses-label">Unfinished</span>
              {drafts.map(draft => {
                const at = Math.min(draft.step || 0, SESSION_STEPS.length - 1);
                return (
                  <div key={draft.id} className="ses-draft">
                    <button type="button" className="ses-draft-open" onClick={() => onResume(draft)}>
                      {draft.album_art
                        ? <img src={draft.album_art} alt="" className="ses-draft-art" />
                        : <span className="ses-draft-art" aria-hidden="true" />}
                      <span style={{ minWidth: 0 }}>
                        <span className="ses-draft-album">{draft.album}</span>
                        <span className="ses-draft-meta">
                          {draft.artist} · {SESSION_STEPS[at]} · {sinceLabel(draft.updated_at)}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      className={`ses-draft-x${confirmDiscard === draft.id ? ' ses-draft-x--sure' : ''}`}
                      onClick={() => discardDraft(draft.id)}
                      onBlur={() => setConfirmDiscard(c => (c === draft.id ? null : c))}
                      title="Discard this draft"
                      aria-label="Discard this draft"
                    >
                      {confirmDiscard === draft.id ? 'discard?' : '×'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
