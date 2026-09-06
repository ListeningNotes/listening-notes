// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/AlbumFinder.js
// Type an artist, see covers, hand one over.
//
// ── What this is not ──────────────────────────────────────────────────────
// The session flow has an album search already (AlbumPicker), and this is
// deliberately not it. That one is the owner's own opening ritual for sitting
// down with a record — it used to wrap the same lookup in the Echo ceremony,
// the network zooming and cards flying to the centre, and though the ceremony
// is gone the separation stands. Somebody sending a friend an album is not
// sitting down with it, and a stranger meeting the session's search on their
// way into a form would be filling in a field with the wrong tool.
//
// What both share is the part worth sharing: searchAlbums() in
// library/music_data_api.js, which is where the real work is — two searches
// merged, pressings collapsed, editions scored, a stranger's covers album kept
// off the top of the results. All of that is had for free here.
//
// ── One square, three things in it ────────────────────────────────────────
// The whole component is a square with a field under it, and the square holds
// whichever of three things is true: an empty sleeve while there is nothing to
// show, the results while there are some, and the record once one is chosen.
// Same size, same place, so choosing an album is a sleeve being filled rather
// than the page laying itself out again — and the empty state has the shape of
// the chosen one instead of a short form floating in a screen it cannot fill.
//
// It is also what keeps the send on one screen while somebody is searching.
// The results used to be a grid under the field, which on a phone was four
// rows of covers pushing the message, the name and the Send button off the
// bottom. In the square they are one row that scrolls sideways — a shelf,
// which is what a row of records is, on the one axis this page is not already
// using.
//
// ── And a way through when Apple has never heard of it ────────────────────
// Search-only would mean a record that is not in the catalogue cannot be sent
// at all — private presses, bandcamp-only releases, anything deleted. So there
// is a plain pair of fields behind a link, the same fallback the session flow
// keeps. An album sent that way has no art, which the receiving side already
// has to handle: entries logged before art existed have none either.

'use client';
import { useEffect, useRef, useState } from 'react';
import { X, ArrowLeft } from '@phosphor-icons/react';
import { searchAlbums } from '../../library/music_data_api';

// Long enough that typing an artist's name is one search rather than eight,
// short enough that it never feels like waiting. The session flow settled on
// 520ms with an animation covering the gap; with nothing covering it, a little
// quicker reads better.
const SETTLE_MS = 420;

// Enough to find the record without becoming a page to browse. Somebody
// sending an album knows which one they mean — this is recognition, not
// shopping, so a second screenful would be answering a question nobody asked.
const MOST_SHOWN = 24;

export default function AlbumFinder({ picked, onPick, onClear }) {
  const [typed, setTyped]       = useState('');
  const [results, setResults]   = useState([]);
  const [looking, setLooking]   = useState(false);
  const [asked, setAsked]       = useState(false);   // a search has come back
  const [byHand, setByHand]     = useState(false);
  // The chooser: a panel over the page holding the field and the wall of
  // results. Opens when the landing field is focused, closes on a pick, on
  // Back, or on Escape. The landing page underneath keeps its sleeve, which
  // is where the chosen cover flies to.
  const [open, setOpen]         = useState(false);
  const chooserInput = useRef(null);
  const sleeveRef = useRef(null);
  const [hand, setHand]         = useState({ album: '', artist: '', year: '' });

  // Which search the results on screen belong to. A slow answer to "rad"
  // arriving after a fast one to "radiohead" would otherwise replace the good
  // results with the stale ones — the debounce makes that rare and does not
  // make it impossible.
  const askedFor = useRef('');

  // Typing is the event, so what typing means happens here: an emptied field
  // empties the wall at once, and anything else is "looking" from the first
  // character. The effect below only waits, asks, and reports back.
  function onType(value) {
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
      setResults(found.slice(0, MOST_SHOWN));
      setLooking(false);
      setAsked(true);
    }, SETTLE_MS);
    return () => clearTimeout(id);
  }, [typed]);

  // Picking: the cover flies out of the wall and down into the sleeve, and
  // only when it has landed does the record become the chosen one — so the
  // sleeve is still there to land in, and the held state appears with the
  // picture already in place. The chooser closes at the start of the flight,
  // so the flight is over the landing page rather than over the wall.
  function take(album, from) {
    const chosen = {
      album: album.name,
      artist: album.artist,
      year: album.year || '',
      art: album.art || '',
      collectionId: album.collectionId || null,
    };
    setOpen(false);
    onType('');
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!from || !album.art || reduced) { onPick(chosen); return; }
    // One frame for the chooser to leave and the sleeve to be laid out.
    requestAnimationFrame(() => {
      const to = sleeveRef.current?.getBoundingClientRect();
      if (!to || !to.width) { onPick(chosen); return; }
      const img = document.createElement('img');
      img.src = album.art;
      img.alt = '';
      Object.assign(img.style, {
        position: 'fixed', zIndex: 320, left: `${from.left}px`, top: `${from.top}px`,
        width: `${from.width}px`, height: `${from.height}px`, objectFit: 'cover',
        borderRadius: '6px', transformOrigin: '0 0', pointerEvents: 'none',
        boxShadow: '0 12px 40px rgba(0,0,0,0.22)',
      });
      document.body.appendChild(img);
      const run = img.animate([
        { transform: 'translate(0,0) scale(1,1)' },
        { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(${to.width / from.width}, ${to.height / from.height})` },
      ], { duration: 380, easing: 'cubic-bezier(0.22, 0.61, 0.36, 1)', fill: 'forwards' });
      let done = false;
      const land = () => { if (done) return; done = true; onPick(chosen); img.remove(); };
      run.onfinish = land;
      run.oncancel = land;
      window.setTimeout(land, 500);
    });
  }

  // Escape closes the chooser, the way it closes everything else here.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = event => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);

  function takeByHand() {
    if (!hand.album.trim() || !hand.artist.trim()) return;
    onPick({
      album: hand.album.trim(),
      artist: hand.artist.trim(),
      year: hand.year.trim(),
      art: '',
      collectionId: null,
    });
    setHand({ album: '', artist: '', year: '' });
    setByHand(false);
  }

  // ── Chosen ──────────────────────────────────────────────────────────────
  // The record centred, its name and artist under it. Not a shape invented for
  // this page: it is the beacon's — the same square, the same air under it,
  // the same gap between the two lines and the same two type sizes. The beacon
  // and the About card already agree with each other on how a square with a
  // name under it looks, and an album being handed over is the same object
  // those two are about.
  //
  // No confirmation and no tick. The picture being on the page is the
  // confirmation, and the only control is the way to change your mind.
  if (picked) {
    return (
      <div className="af">
        <div className="af-held">
          {/* The frame exists so the clear button has something to hang off.
              The art itself carries overflow: hidden, to keep a cover inside
              its own corners, and a badge parked on that corner would be
              clipped by it. */}
          <span className="af-held-frame">
            <span className="af-square af-held-art">
              {picked.art
                ? <img src={picked.art} alt="" />
                : <span className="af-none" aria-hidden="true">♪</span>}
            </span>
            {/* A mark on the corner of the record rather than a line of type
                under it. "Choose a different one" was a sentence explaining a
                control where the control could just be there, and it sat in
                the run of centred text under the cover arguing with the
                album's own name for the eye. */}
            <button
              type="button"
              className="af-clear"
              onClick={onClear}
              aria-label="Choose a different album"
            >
              <X size={11} weight="bold" aria-hidden="true" />
            </button>
          </span>

          <span className="af-held-meta">
            <span className="af-held-album">{picked.album}</span>
            <span className="af-held-artist">
              {picked.artist}{picked.year ? ` · ${picked.year}` : ''}
            </span>
          </span>
        </div>
      </div>
    );
  }

  // ── Typed in by hand ────────────────────────────────────────────────────
  if (byHand) {
    return (
      <div className="af">
        <div className="af-hand">
          <div className="af-hand-pair">
            <label className="af-hand-field">
              <span className="af-sub">Album</span>
              <input
                className="af-input"
                value={hand.album}
                onChange={e => setHand(h => ({ ...h, album: e.target.value }))}
              />
            </label>
            <label className="af-hand-field">
              <span className="af-sub">Artist</span>
              <input
                className="af-input"
                value={hand.artist}
                onChange={e => setHand(h => ({ ...h, artist: e.target.value }))}
              />
            </label>
          </div>
          <label className="af-hand-field af-hand-field--year">
            <span className="af-sub">Year</span>
            <input
              className="af-input"
              value={hand.year}
              onChange={e => setHand(h => ({ ...h, year: e.target.value }))}
            />
          </label>
          <div className="af-hand-row">
            <button
              type="button"
              className="ln-pill"
              onClick={takeByHand}
              disabled={!hand.album.trim() || !hand.artist.trim()}
            >
              Use this
            </button>
            <button type="button" className="af-quiet" onClick={() => setByHand(false)}>
              ← Back to search
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Waiting, and looking ────────────────────────────────────────────────
  const nothing = asked && !looking && results.length === 0 && typed.trim();

  return (
    <div className="af">

      {/* The landing: an empty sleeve, waiting, and the field under it. Not
          a spinner and not a message — the sleeve is the shape of the thing
          being asked for, standing where it is going to stand, and it is
          where the chosen cover flies to. */}
      <div className="af-slot">
        <span className="af-square af-sleeve" aria-hidden="true" ref={sleeveRef}>
          <span className="af-none">♪</span>
        </span>
      </div>

      <input
        className="af-input"
        value={typed}
        onChange={e => onType(e.target.value)}
        onFocus={() => setOpen(true)}
        placeholder="Search an artist or an album"
        autoComplete="off"
      />

      {/* The chooser: over the page, the field at its head and the results as
          a wall of covers under it, newest first. It opens when the field is
          focused and takes the focus with it, so typing carries on and the
          keyboard stays up. The page's own sleeve is underneath, out of
          sight, waiting for the flight. */}
      {open && (
        <div className="af-chooser" role="dialog" aria-label="Find the album">
          <div className="af-chooser-head">
            <button type="button" className="af-chooser-back" onClick={() => setOpen(false)} aria-label="Back">
              <ArrowLeft size={18} weight="bold" aria-hidden="true" />
            </button>
            <input
              ref={chooserInput}
              className="af-input"
              value={typed}
              onChange={e => onType(e.target.value)}
              placeholder="Search an artist or an album"
              autoComplete="off"
              autoFocus
            />
          </div>
          <div className="af-chooser-body">
            {results.length > 0 && (
              <div className="af-wall">
                {results.map(album => (
                  <button
                    type="button"
                    key={album.collectionId}
                    className="af-cover"
                    onClick={event => take(album, event.currentTarget.querySelector('.af-cover-art')?.getBoundingClientRect())}
                  >
                    <span className="af-cover-art">
                      <img src={album.art} alt="" loading="lazy" />
                    </span>
                    <span className="af-cover-album">{album.name}</span>
                    <span className="af-cover-artist">{album.artist}{album.year ? ' · ' + album.year : ''}</span>
                  </button>
                ))}
              </div>
            )}
            <div className="af-under">
              {looking && <span className="af-word">Looking…</span>}
              {nothing && <span className="af-word">Nothing found for that.</span>}
              {!typed.trim() && !looking && <span className="af-word">Type an artist or an album.</span>}
              <button type="button" className="af-quiet" onClick={() => { setOpen(false); setByHand(true); }}>
                Can’t find it? Type it in →
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="af-under">
        {/* Offered from the start rather than only once a search has come back
            empty: somebody who already knows the record is not on Apple Music
            should not have to prove it first. */}
        <button type="button" className="af-quiet" onClick={() => setByHand(true)}>
          Can’t find it? Type it in →
        </button>
      </div>
    </div>
  );
}
