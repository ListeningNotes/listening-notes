// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/handoff.js
// What the journal already knows, handed to the layer on the way past.
//
// Tapping a cover opens that entry over the journal, and the entry has to be
// read from the database before it can be drawn. That read is quick and it is
// never instant, so for a few hundred milliseconds there is a layer on screen
// with nothing on it — and a blank page that arrived promptly is worse than a
// page that took a moment to arrive.
//
// The fix is not a better spinner. It is that the wait is unnecessary for the
// part you are looking at: the journal has already loaded every entry to draw
// the wall, so at the moment of the tap the cover, the album, the artist and
// the rating are all sitting in memory. The layer can open with the record
// already on it and let the writing catch up.
//
// So the tile leaves them here on its way out, and the layer picks them up.
//
// ── Why a module variable and not context ─────────────────────────────────
// The layer is a different route subtree — a parallel slot, rendered beside
// the journal rather than inside it — so there is no shared React state
// between the two and no provider that could sit above both without wrapping
// the entire site in a context that exists for one hand-off.
//
// It is deliberately not state. Nothing subscribes to it and nothing re-renders
// when it changes: the layer reads it once, as it mounts, which is the only
// moment it is wanted. Written the other way it would be a store, and a store
// implies somebody is watching.
//
// ── What it is not ────────────────────────────────────────────────────────
// Not a cache, and never read as one. It holds one record, only the handful of
// fields printed on the first screen, and only until the real entry arrives a
// few hundred milliseconds later. The entry the page renders is always the one
// the database returned — this is a picture to look at while that happens, and
// if it is ever missing or stale the answer is simply the plainer wait.

let passing = null;
// The wall's current list, in the wall's current order — after search,
// filters and sort — so a sideways swipe on the entry goes to the record that
// was beside it on the wall, not the next one in the database. Opened cold
// from a shared link there is no wall, no list and no swipe. See
// handOffOrder and neighboursOf below.
let order = [];

// Called by a tile as it is pressed. Only the fields the first screen prints,
// rather than the whole row: what goes past here should be obvious from
// reading it, and an entry object handed over whole invites somebody to reach
// for a field that has not been checked and might be a version behind.
export function handOff(entry) {
  if (!entry) { passing = null; return; }
  passing = {
    slug: entry.slug,
    album: entry.album || '',
    artist: entry.artist || '',
    year: entry.year || '',
    album_art: entry.album_art || '',
    // Everything else the first screen prints. The rating and the flags were
    // left out of the first version of this on the theory that a score drawn
    // from memory and then corrected would be worse than one that arrived
    // late. That was wrong twice: it is the same row from the same request the
    // wall was drawn from, so there is nothing to correct — and leaving them
    // out is what made the open feel like two events, a cover and then, half a
    // second later, everything that says what you thought of it.
    rating: entry.rating ?? '',
    masterpiece: entry.masterpiece === true,
    favorite: entry.favorite === true || entry.favorite === 'true',
    entry_type: entry.entry_type || '',
    listen_total: entry.listen_total ?? 0,
    created_at: entry.created_at || null,
  };
}

// Picked up by the layer as it mounts. The slug has to match: coming to an
// entry any other way — a link in somebody's notes, a QR, the back button
// landing on a different record — must not draw the last cover that happened
// to be tapped.
export function handedOver(slug) {
  return passing && passing.slug === slug ? passing : null;
}

// Where a record's tile is on screen right now, if the wall is mounted under
// the layer. The layer grows out of this box on the way in, so the entry
// opens from the square that was pressed.
export function tileBoxOf(slug) {
  if (typeof document === 'undefined') return null;
  const tile = document.querySelector(`[data-tile-slug="${CSS.escape(slug)}"]`);
  if (!tile) return null;
  const box = tile.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) return null;
  return { x: box.left, y: box.top, w: box.width, h: box.height };
}

// What the first screen prints, and nothing more — the same fields handOff
// keeps, so a neighbour handed over before its address changes draws the
// way a tapped record does.
function firstScreen(entry) {
  return {
    slug: entry.slug,
    album: entry.album || '',
    artist: entry.artist || '',
    year: entry.year || '',
    album_art: entry.album_art || '',
    rating: entry.rating ?? '',
    masterpiece: entry.masterpiece === true,
    favorite: entry.favorite === true || entry.favorite === 'true',
    entry_type: entry.entry_type || '',
    listen_total: entry.listen_total ?? 0,
    created_at: entry.created_at || null,
  };
}

// Called by the wall whenever what it shows changes; the layer only reads it.
export function handOffOrder(entries) {
  order = Array.isArray(entries) ? entries.map(firstScreen) : [];
}

// The records either side of this one on the wall, or null at either end —
// and null both ways when the wall never said.
export function neighboursOf(slug) {
  const at = order.findIndex(e => e.slug === slug);
  if (at < 0) return { prev: null, next: null };
  return {
    prev: at > 0 ? order[at - 1] : null,
    next: at < order.length - 1 ? order[at + 1] : null,
  };
}

// A neighbour becoming the record on screen: leave its first screen where
// the layer's wait state will find it, so the swap draws at once.
export function handOffNeighbour(entry) {
  passing = entry ? firstScreen(entry) : null;
}

// ── How the layer arrived ─────────────────────────────────────────────────
// Moving to a neighbour is a new address, and the framework builds the layer
// afresh for it — so a layer cannot tell a swipe from a tap by looking at
// itself. The swipe says so here on its way out, and the next layer asks
// once as it mounts: a layer that arrived by swipe draws the record and
// does nothing else, no growth from a tile and no fade.
// The direction travels too: 1 for a swipe to the next record (the new one
// comes in from the right), -1 for the previous (from the left), 0 for no
// swipe at all.
let bySwipe = 0;
export function arrivingBySwipe(dir) { bySwipe = dir; }
export function tookASwipe() { const was = bySwipe; bySwipe = 0; return was; }
