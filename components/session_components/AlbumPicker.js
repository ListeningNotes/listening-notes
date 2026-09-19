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
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MagnifyingGlass, Trash } from '@phosphor-icons/react';
import SiteNav from '../main_components/SiteNav';
import { searchAlbums } from '../../library/music_data_api';
import { PENDING_EVENT, SAVED_EVENT } from '../../hooks/useListeningSession';

// How long the grid takes to shuffle over, and how long the newcomer waits
// before growing into the slot the others are clearing.
const FILE_MS = 420;

// Whether the picker offers a way to type a record in by hand. Off since
// 2026-09-18 and the only thing holding the door: turn it on and the form is
// back, unchanged. See the note beside the button, and MANUAL ENTRY in NOTES.
const BY_HAND_OFFERED = false;

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
  const [hand, setHand]         = useState({ album: '', artist: '', year: '', art: '' });

  // Listens saved and walked away from, newest first.
  const [drafts, setDrafts]                 = useState([]);
  const [confirmDiscard, setConfirmDiscard] = useState(null);   // draft id

  // ── Press and hold to throw a draft away ────────────────────────────────
  // There was an × in the corner of every tile. Miyel, 2026-09-18: "make the
  // albums not have an x on them, but instead long press to delete them, with
  // an option to make sure you want to delete — maybe they turn red."
  //
  // She is right that the × had to go: a grid of album art is a wall of
  // somebody's record covers, and a row of little crosses over them is the
  // software asking, on every single one, whether you meant to keep it. A
  // long press asks nothing until you ask it.
  //
  // Held for 480ms. Long enough that a scroll or a decisive tap never trips
  // it, short enough that you are not waiting — and the press that ends the
  // hold is swallowed, or letting go would open the record you were about to
  // throw away.
  const held = useRef(false);
  const holding = useRef(null);
  function hold(id) {
    held.current = false;
    clearTimeout(holding.current);
    holding.current = setTimeout(() => {
      held.current = true;
      setConfirmDiscard(id);
    }, 480);
  }
  function letGo() { clearTimeout(holding.current); }
  useEffect(() => () => clearTimeout(holding.current), []);

  // Which search the results on screen belong to. A slow answer to "rad"
  // arriving after a fast one to "radiohead" would otherwise replace the good
  // results with the stale ones.
  const askedFor = useRef('');

  // ── The drafts, and when to ask again ────────────────────────────────────
  // Once on mount was enough while the picker was a page you arrived at. It is
  // not a page any more: it is what floor one *is* while a record is being
  // chosen, and it stays mounted underneath the listen for the whole of that
  // listen. So the draft a listen leaves behind on its way out would never
  // have reached this grid — the component that draws it never re-ran.
  //
  // PENDING_EVENT is already shouted whenever a listen is picked up or put
  // down (see saidSoAboutTheDesk); the desk has listened to it since
  // 2026-09-16 for the same reason, that the listen and the thing underneath
  // it are one route and nothing else would tell it.
  useEffect(() => {
    let alive = true;
    const ask = () => {
      fetch('/api/drafts')
        .then(r => r.json())
        .then(d => { if (alive) setDrafts(d.drafts || []); })
        .catch(() => {});
    };
    ask();
    window.addEventListener(PENDING_EVENT, ask);
    // And when a listen becomes an entry. Publishing deletes the draft — both
    // copies, see finish() in useSessionDraft — but it shouts SAVED_EVENT and
    // not PENDING_EVENT, so this list never heard about it and the record you
    // had just posted was still sitting here under Unfinished when the cutaway
    // put you back (Miyel, 2026-09-18: "make sure the draft deletes since it's
    // posted"). It was gone from the server the whole time; it was this that
    // had not been told.
    window.addEventListener(SAVED_EVENT, ask);
    return () => {
      alive = false;
      window.removeEventListener(PENDING_EVENT, ask);
      window.removeEventListener(SAVED_EVENT, ask);
    };
  }, []);

  // ── Anywhere else is the no ──────────────────────────────────────────────
  // Miyel, 2026-09-18: "clicking away anywhere on the screen should cancel
  // it." Pressing another tile already did — the tile's own handler treats a
  // press while something else is armed as the answer no — but that left the
  // rest of the screen dead, and a question you can only answer by finding one
  // of two right places to press is a question that has taken the screen
  // hostage.
  //
  // In the capture phase, so the state is already clear by the time the press
  // reaches whatever it landed on. The armed tile itself is the exception: a
  // press there is the yes, and it has to reach its own handler intact.
  useEffect(() => {
    if (confirmDiscard === null) return undefined;
    const away = event => {
      if (event.target?.closest?.('.ses-tile--armed')) return;
      setConfirmDiscard(null);
    };
    document.addEventListener('pointerdown', away, true);
    return () => document.removeEventListener('pointerdown', away, true);
  }, [confirmDiscard]);

  // ── The grid files across ────────────────────────────────────────────────
  // Miyel, 2026-09-18: "a new draft files all drafts across the screen and the
  // new draft appears." A CSS grid cannot be transitioned — reflowing it moves
  // every tile in one frame, with nothing in between to animate — so the tiles
  // are measured before and after and put back where they were, then let go.
  // FLIP, the same machinery the wall uses when an entry is deleted out of it.
  //
  // The newcomer is the one tile with no previous box. It grows in after the
  // others have finished moving, because the slot it grows into is the slot
  // they are still clearing.
  const gridRef = useRef(null);
  const placedRef = useRef(new Map());
  useLayoutEffect(() => {
    const grid = gridRef.current;
    if (!grid) { placedRef.current = new Map(); return undefined; }
    const before = placedRef.current;
    const after = new Map();
    const moved = [];
    const arrived = [];
    for (const tile of grid.children) {
      const id = tile.dataset.draft;
      const box = tile.getBoundingClientRect();
      after.set(id, { left: box.left, top: box.top });
      const was = before.get(id);
      if (!was) { if (before.size) arrived.push(tile); continue; }
      if (was.left !== box.left || was.top !== box.top) {
        moved.push([tile, was.left - box.left, was.top - box.top]);
      }
    }
    placedRef.current = after;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    for (const tile of arrived) tile.classList.add('ses-tile--new');
    if (!moved.length) return undefined;
    for (const [tile, dx, dy] of moved) {
      tile.style.transition = 'none';
      tile.style.transform = `translate(${dx}px, ${dy}px)`;
    }
    // Let go on the next frame — or on a timer if no frame comes. A tab that
    // is not being painted runs no rAF callback at all, and the cost of that
    // here is not a missing animation but tiles left sitting where they used
    // to be, holding a transform nothing will ever clear. The same pair guards
    // the beacon's words in HomeNav, for the same reason.
    let gone = false;
    const release = () => {
      if (gone) return;
      gone = true;
      for (const [tile] of moved) {
        tile.style.transition = `transform ${FILE_MS}ms cubic-bezier(0.22, 0.61, 0.36, 1)`;
        tile.style.transform = '';
      }
    };
    const frame = requestAnimationFrame(release);
    const late = setTimeout(release, 120);
    return () => { cancelAnimationFrame(frame); clearTimeout(late); };
  }, [drafts]);

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
      artUrl: hand.art.trim(),
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
          {/* ── The cover, since nowhere is going to hand us one ─────────────
              A record typed in by hand is a record Apple Music does not have —
              a small press, a Bandcamp release, a tape (Miyel, 2026-09-18:
              "this is for smaller indie projects, or maybe albums not on
              iTunes"). Every other record on this site arrives with its cover
              attached; this is the one that has to be told where to find one.

              Not required. A listen has had no requirements since this morning
              and this is not the place to bring one back — a beacon with no
              cover draws its own quiet square, and it can be filled in later
              from the entry. But it is asked for here rather than left to be
              discovered, because the blank square is the first thing you see
              and the link is easiest to fetch while you are already looking at
              the record's page. */}
          <label className="ses-field">
            <span className="ses-label">Album art</span>
            <input
              className="ses-input"
              type="url"
              inputMode="url"
              placeholder="Link to a cover image"
              value={hand.art}
              onChange={e => setHand(h => ({ ...h, art: e.target.value }))}
            />
          </label>
          {/* What is different about this way in, said before you take it
              rather than found out on the next screen. */}
          <p className="ses-hand-note">
            Nowhere has this record, so nothing can be looked up for it. You
            will be asked to type the tracklist in yourself, one title a line,
            on the screen after this.
          </p>
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
          {/* Boxed on the pane too, from 2026-09-18. It was a hairline and a
              magnifier there on the reasoning that the floor had just become
              the picker and said so already — and Miyel, comparing the two:
              "bring back the boxed search, I did like that from the last
              version. The search bar being an actual box that was white."
              The floor says less than it did now that the drafts are squares
              rather than a list: a grid of album art looks the same whether
              or not you may type at it, and the box is what says you may. */}
          <label className="ses-search">
            <MagnifyingGlass size={18} weight="regular" aria-hidden="true" />
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
            {/* The door to it is shut. Miyel, 2026-09-18: "let's remove the
                manual entry button from the session, juuuust until I build it
                correctly — I don't want people using it messed up. We'll keep
                it to what currently works."

                Everything behind this still stands — the form, `byHand`, the
                hand-typed tracklist it hands on to — and it is a word away
                from being offered again. It is held rather than deleted
                because what is wrong with it is the shape, not the code, and
                nobody has said yet what the right shape is (MANUAL ENTRY in
                NOTES).

                What this costs, plainly: there is no way to log a record Apple
                Music does not have. That is the trade she made, knowingly, for
                not shipping a way in that does the wrong thing. */}
            {BY_HAND_OFFERED && (
              <button type="button" className="ses-quiet" onClick={() => setByHand(true)}>
                Manual entry
              </button>
            )}
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
            /* ── Drafts, as the same squares a search gives ────────────────
               They were rows — a small cover, a name, and the step they were
               left on — under a heading, beside a grid of album art. Two
               shapes for one act. Miyel, 2026-09-18: "making the drafts and
               the album search look the same. Instead of a list and a grid,
               they should all be a grid… so that when I search something, it
               doesn't really change the motion that needs to happen between a
               draft and choosing a fresh album."

               So a draft is a tile, and it is the same tile: the same art, the
               same name, the same second line. Where a search result says the
               year, a draft says how long ago it was — "I do like them saying
               when the last time you worked on them is" — which is the one
               thing a draft has that a record has not, put where the record's
               own extra already goes rather than in a row of its own.

               The step it was left on is gone. "We don't need overview,
               tracks, we don't need where it left off." It was what made a
               draft need a wider row than a square, and it answers a question
               nobody was asking: opening it puts you where you were.

               Only the discard is extra, and it sits on the art, so the tile's
               footprint is a search result's to the pixel. */
            <div className="ses-grid" ref={gridRef}>
              {drafts.map(draft => {
                const armed = confirmDiscard === draft.id;
                return (
                  <div key={draft.id} data-draft={draft.id} className={'ses-tile ses-tile--draft' + (armed ? ' ses-tile--armed' : '')}>
                    <button
                      type="button"
                      className="ses-tile-open"
                      onPointerDown={() => hold(draft.id)}
                      onPointerUp={letGo}
                      onPointerLeave={letGo}
                      onPointerCancel={letGo}
                      /* iOS offers its own menu on a long press and Safari
                         starts selecting text; both are the gesture being
                         taken away from us. */
                      onContextMenu={e => e.preventDefault()}
                      onClick={e => {
                        // The press that ends a long press is not a tap.
                        if (held.current) { held.current = false; e.preventDefault(); return; }
                        // Armed, this one is the yes. Armed elsewhere, this
                        // one is the no, and nothing else happens — pressing
                        // past a question should answer it, not act on it.
                        if (armed) { discardDraft(draft.id); return; }
                        if (confirmDiscard !== null) { setConfirmDiscard(null); return; }
                        const img = e.currentTarget.querySelector('img');
                        onResume(draft, img ? img.getBoundingClientRect() : null);
                      }}
                      aria-label={armed
                        ? `Delete the draft of ${draft.album}`
                        : `${draft.album}. Press and hold to delete.`}
                    >
                      <span className="ses-tile-art">
                        {draft.album_art ? <img src={draft.album_art} alt="" loading="lazy" /> : null}
                        {armed && (
                          <span className="ses-tile-sure">
                            <Trash size={20} weight="fill" aria-hidden="true" />
                            Delete
                          </span>
                        )}
                      </span>
                      {/* The words underneath do not change and do not turn
                          red. Miyel, 2026-09-18: "a red field over just the
                          art, not the text." The question is a thing that has
                          come down over the record, and the record's name is
                          still its name while it is being asked. It said
                          "press again" here and the name went red with it,
                          which made the whole tile the question. */}
                      <span className="ses-tile-name">{draft.album}</span>
                      <span className="ses-tile-year">
                        {draft.artist}{draft.artist ? ' · ' : ''}{sinceLabel(draft.updated_at)}
                      </span>
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
