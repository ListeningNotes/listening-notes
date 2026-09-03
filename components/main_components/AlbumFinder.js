// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/AlbumFinder.js
// Type an artist, see covers, hand one over.
//
// ── What this is not ──────────────────────────────────────────────────────
// The session flow has an album search already, and this is deliberately not
// it. useAlbumSelection wraps the same lookup in the Echo ceremony — the
// network zooming, nodes spotlighting, cards growing out of them and flying to
// the centre — which takes several seconds and is the owner's own opening
// ritual for sitting down with a record. Somebody sending a friend an album is
// not sitting down with it, and a stranger meeting that ceremony on their way
// into a form would be watching an animation to fill in a field.
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
import { X } from '@phosphor-icons/react';
import { searchAlbums } from '../../library/music_data_api';

// Long enough that typing an artist's name is one search rather than eight,
// short enough that it never feels like waiting. The session flow settled on
// 520ms with an animation covering the gap; with nothing covering it, a little
// quicker reads better.
const SETTLE_MS = 420;

// Enough to find the record without becoming a page to browse. Somebody
// sending an album knows which one they mean — this is recognition, not
// shopping, so a second screenful would be answering a question nobody asked.
const MOST_SHOWN = 12;

export default function AlbumFinder({ picked, onPick, onClear }) {
  const [typed, setTyped]       = useState('');
  const [results, setResults]   = useState([]);
  const [looking, setLooking]   = useState(false);
  const [asked, setAsked]       = useState(false);   // a search has come back
  const [byHand, setByHand]     = useState(false);
  const [hand, setHand]         = useState({ album: '', artist: '', year: '' });

  // Which search the results on screen belong to. A slow answer to "rad"
  // arriving after a fast one to "radiohead" would otherwise replace the good
  // results with the stale ones — the debounce makes that rare and does not
  // make it impossible.
  const askedFor = useRef('');

  useEffect(() => {
    const query = typed.trim();
    if (!query) { setResults([]); setLooking(false); setAsked(false); return undefined; }
    setLooking(true);
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

  function take(album) {
    onPick({
      album: album.name,
      artist: album.artist,
      year: album.year || '',
      art: album.art || '',
      collectionId: album.collectionId || null,
    });
    setTyped('');
    setResults([]);
    setAsked(false);
  }

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
        <FinderStyles />
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
        <FinderStyles />
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
      <FinderStyles />

      <div className="af-slot">
        {results.length > 0 ? (
          <div className="af-shelf">
            {results.map(album => (
              <button
                type="button"
                key={album.collectionId}
                className="af-cover"
                onClick={() => take(album)}
              >
                <span className="af-cover-art">
                  <img src={album.art} alt="" loading="lazy" />
                </span>
                <span className="af-cover-album">{album.name}</span>
                <span className="af-cover-artist">{album.artist}</span>
              </button>
            ))}
          </div>
        ) : (
          // An empty sleeve, waiting. Not a spinner and not a message: it is
          // the shape of the thing being asked for, standing where that thing
          // is going to stand.
          <span className="af-square af-sleeve" aria-hidden="true">
            <span className="af-none">♪</span>
          </span>
        )}
      </div>

      <input
        className="af-input"
        value={typed}
        onChange={e => setTyped(e.target.value)}
        placeholder="Search an artist or an album"
        autoComplete="off"
      />

      <div className="af-under">
        {looking && <span className="af-word">Looking…</span>}
        {nothing && <span className="af-word">Nothing found for that.</span>}
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

// Kept in the component rather than in globals.css. The stylesheet already has
// a cleanup pass waiting on it, and a block that arrives and leaves with the
// thing it styles is one that can never become part of that problem.
function FinderStyles() {
  return (
    <style>{`
      /* One measurement for all three states, so the sleeve, the shelf and the
         chosen record are the same size in the same place and nothing moves
         when one becomes another.

         180px is the beacon's square and the ceiling here, not a constant. The
         beacon has a screen to itself; this one shares with a message, a name
         and an address, and the whole page has to fit without scrolling — so
         on a short window it gives way first, which is the same trade
         --hn-crown makes with clamp(150px, 28dvh, 248px) a screen away. */
      .af {
        --af-square: clamp(116px, 21dvh, 180px);
        display: flex; flex-direction: column;
        gap: clamp(10px, 1.8dvh, 16px);
      }

      .af-square {
        width: var(--af-square); aspect-ratio: 1;
        border-radius: 18px; overflow: hidden;
        display: flex; align-items: center; justify-content: center;
      }
      .af-none { font-size: 2.2rem; color: var(--ink-faint); line-height: 1; }

      /* The slot holds whichever of the three is true, at a fixed height, so
         the field under it never moves. */
      .af-slot {
        display: flex; align-items: center; justify-content: center;
        min-height: var(--af-square);
      }

      /* Waiting. Flat and unshadowed, because it is not an object yet — the
         shadow arrives with the record. */
      .af-sleeve {
        background: var(--panel);
        border: 1px solid var(--border);
      }

      /* ── The shelf ────────────────────────────────────────────────────────
         Results as one row scrolling sideways, inside the square's height.
         Sideways because the page is already spending the other axis, and a
         grid of covers pushed the Send button off a phone.

         Safe inside the layer: the layer claims a sideways drag only on an
         entry with a record beside it on the wall (see the browses flag in
         LayerEntry), and this page has none, so a drag over the covers is
         the browser's and scrolls the shelf. It was rows for an hour on
         2026-09-03, while the layer still took every sideways drag; the
         covers came back the moment it stopped, because a row of small
         thumbnails is not how you recognise a record. */
      .af-shelf {
        display: flex; gap: 12px;
        width: 100%; height: var(--af-square);
        overflow-x: auto; overflow-y: hidden;
        overscroll-behavior-x: contain;
        scroll-snap-type: x proximity;
        -webkit-overflow-scrolling: touch;
      }
      .af-shelf::-webkit-scrollbar { height: 3px; }
      .af-shelf::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }

      .af-cover {
        display: flex; flex-direction: column; gap: 2px;
        flex: 0 0 auto; width: calc(var(--af-square) - 36px);
        background: none; border: none; padding: 0;
        text-align: left; cursor: pointer; color: inherit;
        scroll-snap-align: start;
      }
      .af-cover-art {
        display: block; width: 100%; aspect-ratio: 1;
        border-radius: 6px; overflow: hidden; background: var(--panel);
        margin-bottom: 5px;
        box-shadow: 0 4px 18px rgba(0,0,0,0.18);
        transition: transform 0.2s cubic-bezier(0.34,1.2,0.64,1);
      }
      .af-cover-art img { width: 100%; height: 100%; object-fit: cover; display: block; }
      .af-cover:hover .af-cover-art { transform: scale(1.05); }
      .af-cover-album {
        font-family: var(--font-nunito), sans-serif; font-weight: 600; font-size: 11px;
        line-height: 1.25; color: var(--ink);
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .af-cover-artist {
        font-family: var(--font-mono); font-size: 9px; color: var(--ink-faint);
        overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }

      /* The same frosted recipe every other input on the site uses — the
         archive's search field is this. */
      .af-input {
        display: block; width: 100%; box-sizing: border-box;
        background: var(--panel);
        border: 1px solid var(--border); border-radius: 10px;
        color: var(--ink);
        padding: 11px 13px;
        font-family: var(--font-nunito), sans-serif; font-size: 14px; line-height: 1.6;
        outline: none; transition: border-color 0.15s;
      }
      .af-input::placeholder { color: var(--ink-faint); }
      .af-input:focus { border-color: var(--ink-faint); }
      /* 16px on touch, or Safari zooms the page in on focus and does not
         reliably zoom back out. See the longer note in app/submit/page.js. */
      @media (pointer: coarse) {
        .af-input { font-size: 16px; }
      }

      /* One line under the field, holding its height whether or not anything
         is being said in it, so the form below does not shuffle as a search
         starts and finishes. */
      .af-under {
        display: flex; align-items: baseline; gap: 14px;
        min-height: 1.2em;
      }
      .af-word {
        font-family: var(--font-label); font-size: 10px;
        letter-spacing: 0.12em; text-transform: uppercase;
        color: var(--ink-faint);
      }
      .af-sub {
        display: block;
        font-family: var(--font-label); font-size: 10px;
        letter-spacing: 0.12em; text-transform: uppercase;
        color: var(--ink-faint); margin-bottom: 7px;
      }

      /* Chosen. Every number below is .beacon-card's, copied rather than
         referenced because the beacon's classes belong to the beacon — but if
         one of them moves, this is the thing it has to keep agreeing with. */
      .af-held {
        display: flex; flex-direction: column; align-items: center;
        gap: clamp(14px, 3.2dvh, 28px);
      }
      .af-held-frame { position: relative; display: block; }
      .af-held-art {
        background: var(--panel);
        box-shadow: 0 18px 44px rgba(0,0,0,0.16);
      }
      .af-held-art img { width: 100%; height: 100%; object-fit: cover; display: block; }

      /* On the corner, half on the record and half off it, so it reads as
         attached to the thing rather than printed on the cover. Same fill and
         rule as the About card's own badges — it is the same kind of small
         control parked on the corner of a square. */
      .af-clear {
        position: absolute; top: -8px; right: -8px;
        display: flex; align-items: center; justify-content: center;
        width: 24px; height: 24px; border-radius: 50%;
        background: var(--bg);
        border: 1px solid var(--border);
        color: var(--ink-faint);
        cursor: pointer; padding: 0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.10);
        transition: color 0.15s, border-color 0.15s;
      }
      .af-clear:hover { color: var(--ink); border-color: var(--ink-faint); }
      .af-clear:focus-visible { outline: 2px solid var(--ink-faint); outline-offset: 2px; }

      .af-held-meta {
        display: flex; flex-direction: column; align-items: center;
        gap: clamp(5px, 1.2dvh, 10px); text-align: center; width: 100%; min-width: 0;
      }
      /* --text and --text-muted are what the beacon names these, and both are
         aliases of --ink and --ink-soft. Written as the ink tokens because
         that is what the rest of this page uses. */
      .af-held-album {
        font-family: var(--font-nunito), sans-serif; font-weight: 700;
        font-size: clamp(1.15rem, 2.6dvh, 1.5rem); line-height: 1.15; color: var(--ink);
        text-wrap: balance;
      }
      .af-held-artist {
        font-family: var(--font-nunito), sans-serif; font-size: 0.85rem;
        letter-spacing: 0.08em; color: var(--ink-soft);
      }

      .af-quiet {
        background: none; border: none; padding: 0; cursor: pointer;
        font-family: var(--font-mono); font-size: 10px;
        letter-spacing: 0.08em; color: var(--ink-faint);
        border-bottom: 1px solid var(--border);
        transition: color 0.15s;
        margin-left: auto;
      }
      .af-quiet:hover { color: var(--ink-soft); }

      .af-hand { display: flex; flex-direction: column; gap: 16px; }
      .af-hand-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
      .af-hand-field--year { max-width: 150px; }
      .af-hand-row { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
      .af-hand .af-quiet { margin-left: 0; }

      @media (max-width: 768px) {
        .af { --af-square: min(140px, 19dvh); }
        .af-square { border-radius: 15px; }
        .af-hand-pair { grid-template-columns: 1fr; }
      }
    `}</style>
  );
}
