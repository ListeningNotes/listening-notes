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
  };
}

// Picked up by the layer as it mounts. The slug has to match: coming to an
// entry any other way — a link in somebody's notes, a QR, the back button
// landing on a different record — must not draw the last cover that happened
// to be tapped.
export function handedOver(slug) {
  return passing && passing.slug === slug ? passing : null;
}
