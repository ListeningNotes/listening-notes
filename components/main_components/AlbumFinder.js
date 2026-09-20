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

// `wants` asks for the cursor as soon as the field is on screen. The send
// sheet opens straight onto this — Miyel, 2026-09-19: "it should already have
// the keyboard open on search an artist, because you're already searching for
// it; you're going to have to open it anyway." iOS does not always grant a
// focus that did not come directly from a tap, so this is a request rather
// than a promise: where it is refused the field is still the first thing and
// still one tap away.
export default function AlbumFinder({ picked, onPick, onClear, wants = false }) {
  const [typed, setTyped]       = useState('');
  const [results, setResults]   = useState([]);
  const [looking, setLooking]   = useState(false);
  const [asked, setAsked]       = useState(false);   // a search has come back
  const [byHand, setByHand]     = useState(false);
  // The chooser: a panel over the page holding the field and the wall of
  // results. Opens when the landing field is focused, closes on a pick, on
  // Back, or on Escape. The landing page underneath keeps its sleeve, which
  // is where the chosen cover flies to.
  const sleeveRef = useRef(null);
  const fieldRef = useRef(null);
  useEffect(() => { if (wants && !picked) fieldRef.current?.focus(); }, [wants, picked]);
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
    onType('');
    const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!from || !album.art || reduced) { onPick(chosen); return; }
    // ── The record is handed over first, and then flown into ─────────────
    // It used to be the other way round: the cover flew into an empty
    // sleeve that was already on the page, and `onPick` was called when it
    // landed. There is no sleeve any more — the record does not exist on
    // this page until it is chosen — so the order flips. The picture is put
    // in place, and the copy catches up with it.
    onPick(chosen);
    // Two frames: one for React to commit the chosen state, one for the
    // browser to lay it out. A missed frame costs the flight and nothing
    // else, because the record is already where it is going.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const to = sleeveRef.current?.getBoundingClientRect();
      if (!to || !to.width) return;
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
      // Nothing to hand over on landing any more — that happened before the
      // flight started. All that is left is to take the copy away.
      let done = false;
      const land = () => { if (done) return; done = true; img.remove(); };
      run.onfinish = land;
      run.oncancel = land;
      window.setTimeout(land, 520);
    }));
  }

  // Escape used to close the takeover. There is nothing to close now — the
  // results are part of the page, and whatever this is inside keeps its own
  // Escape (the sheet's, the layer's).

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
            <span className="af-held-art" ref={sleeveRef}>
              {picked.art
                ? <img src={picked.art} alt="" />
                : <span className="af-none" aria-hidden="true">♪</span>}
            </span>
          </span>

          <span className="af-held-meta">
            <span className="af-held-album">{picked.album}</span>
            <span className="af-held-artist">
              {picked.artist}{picked.year ? ` · ${picked.year}` : ''}
            </span>
          </span>

          {/* A word, not a mark on the corner. The cover is 62px now and a
              24px badge hung off a 62px square is a badge on a badge; and
              once the record is small enough to be a line rather than a
              subject, what you want is the plain thing you would say —
              change it. */}
          <button type="button" className="af-change" onClick={onClear}>
            Change
          </button>
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

      {/* ── No empty sleeve ────────────────────────────────────────────
          There was one here: a square the size of a record, holding a ♪,
          standing where the cover was going to stand. The argument was that
          the shape of the thing being asked for is better than a spinner,
          and on its own that is true — but it made a 400px placeholder the
          largest thing on the screen before you had done anything, above a
          form it pushed off the bottom. Miyel, 2026-09-19: "lose the empty
          square. Let the search be the first thing, and let the record
          appear only once it exists."

          So the field is the first thing, and there are two states rather
          than one form with a hole in it: searching, which is a field and a
          wall of covers, and chosen, which is a small cover, its name, and
          a way to change it. You never look at an empty box waiting to be
          filled. */}
      <input
        ref={fieldRef}
        className="af-input"
        value={typed}
        onChange={e => onType(e.target.value)}
        placeholder="Search an artist or an album"
        autoComplete="off"
      />

      {/* ── The results, here, under the field ─────────────────────────────
          They used to open a panel over the whole screen: fixed, inset 0, a
          second copy of the field at its head and a back arrow. The reason
          was real at the time — the wall pushed the message, the name and
          the Send button off the bottom of a phone, because the sheet also
          carried a 400px empty square above it. That square is gone and the
          fields are hairlines, so the room exists.

          Miyel, 2026-09-19: "the submit form becomes oddly full screen when
          you go to search an album." It did, and a full-screen takeover for
          one field is a second surface to get out of — its own field, its
          own back arrow, its own idea of where you are.

          A box of its own height instead, scrolling inside itself, so a
          hundred covers cannot push anything off the bottom. That was the
          whole job the takeover was doing. */}
      {(looking || results.length > 0 || nothing) && (
        <div className="af-results">
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
          {looking && results.length === 0 && <span className="af-word">Looking…</span>}
          {nothing && <span className="af-word">Nothing found for that.</span>}
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
