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

export default function AlbumPicker({ onPick, onResume }) {
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
    <div className="ses-picker">
      {/* The same row every other page carries — the mark in the middle, the
          day-and-night switch top right. It goes home; there is no dashboard
          door here, because the desk is where this opened from and the way
          back to it is the layer's own swipe. */}
      <SiteNav />

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
          <input
            className="ses-input"
            value={typed}
            onChange={e => type(e.target.value)}
            placeholder="Search an artist or an album"
            autoComplete="off"
            autoFocus
          />

          <div className="ses-under">
            {looking && <span className="ses-label">Looking…</span>}
            {nothing && <span className="ses-label">Nothing found for that.</span>}
            {/* Offered from the start rather than only once a search has come
                back empty: somebody who already knows the record is not on
                Apple Music should not have to prove it first. */}
            <button type="button" className="ses-quiet" onClick={() => setByHand(true)}>
              Can’t find it? Type it in →
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
              <span className="ses-label">Drafts</span>
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
