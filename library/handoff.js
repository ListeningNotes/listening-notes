// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/handoff.js
// What the wall leaves for the layer on the way past.
//
// ── Why it exists ─────────────────────────────────────────────────────────
// Tapping a cover navigates to the entry's real address, and the entry is
// read from the database on the way. That read is the pause after the tap.
// The wall already holds everything the entry's first screen prints — the
// cover, the title, the artist, the score, the marks — from the same row the
// tile was drawn from, so it leaves them here and the layer draws them at
// once while the writing is fetched underneath. Nothing is corrected later,
// because nothing here was guessed.
//
// ── And now the order, 2026-09-02 ─────────────────────────────────────────
// The wall also leaves the list it is currently showing, in the order it is
// showing it — after search, filters and sort — so a swipe on the entry can
// go to the record that was beside it on the wall rather than the next one
// in the database. The list is whatever the person was looking at; that is
// what "next" means to them. Opened cold from a shared link there is no
// wall, no list and no swipe, which is right: there is nothing beside it.
//
// A module variable rather than context or storage, on purpose. It lives for
// the life of the page, it is written by one component and read by two, and
// a context would have to wrap the whole site to carry a value that matters
// for about four hundred milliseconds.

let passing = null;
let order = [];

function stripped(entry) {
  return {
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

export function handOff(entry) {
  passing = entry ? stripped(entry) : null;
}

export function handedOver(slug) {
  return passing && passing.slug === slug ? passing : null;
}

// The wall's current list, in the wall's current order. Called by the wall
// whenever what it shows changes; the layer only ever reads it.
export function handOffOrder(entries) {
  order = Array.isArray(entries) ? entries.map(stripped) : [];
}

// The records either side of this one on the wall, or null at either end.
// Null both ways when the wall never said — a cold open, or a slug that is
// not on the wall as currently filtered.
export function neighboursOf(slug) {
  const at = order.findIndex(e => e.slug === slug);
  if (at < 0) return { prev: null, next: null, known: false };
  return {
    prev: at > 0 ? order[at - 1] : null,
    next: at < order.length - 1 ? order[at + 1] : null,
    known: true,
  };
}

// Where a record's cover is on screen right now, if its tile is mounted —
// which it is whenever the wall is under the layer. The layer flies the
// cover out of this box on the way in and back into it on the way out.
export function coverBoxOf(slug) {
  if (typeof document === 'undefined') return null;
  const tile = document.querySelector(`[data-tile-slug="${CSS.escape(slug)}"] .ft-art`);
  if (!tile) return null;
  const box = tile.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) return null;
  return { x: box.left, y: box.top, w: box.width, h: box.height };
}
