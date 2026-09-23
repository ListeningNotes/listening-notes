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
    credit_by_hand: entry.credit_by_hand === true,
    listen_total: entry.listen_total ?? 0,
    posted_at: entry.posted_at || null,
    // Who sent it, 2026-09-15: the first screen prints a Sent by line now
    // rather than a chip that opened one, and a face and a name arriving a
    // beat after the entry lands is the row moving under the eye — the same
    // mistake the rating and the flags above were left out for. The wall's
    // read already carries both (WALL_FIELDS + CREDIT_FIELDS), so this is two
    // fields already in memory rather than a second request.
    received_from: entry.received_from || '',
    received_from_url: entry.received_from_url || '',
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
// Anything else a layer can grow out of: an element that declares, in
// data-grows, the address it opens — a row in the address book, a face in
// the feed. The entry keeps its own lookup above; this is the general one
// (2026-09-13, so a person's page opens from the row you pressed the way an
// entry opens from its cover).
export function growBoxOf(path) {
  if (typeof document === 'undefined' || !path) return null;
  const from = document.querySelector(`[data-grows="${CSS.escape(path)}"]`);
  if (!from) return null;
  const box = from.getBoundingClientRect();
  if (box.width === 0 || box.height === 0) return null;
  return { x: box.left, y: box.top, w: box.width, h: box.height };
}

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
    credit_by_hand: entry.credit_by_hand === true,
    listen_total: entry.listen_total ?? 0,
    posted_at: entry.posted_at || null,
    // The credit too, for the same reason handOff keeps it.
    received_from: entry.received_from || '',
    received_from_url: entry.received_from_url || '',
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

// ── Reading on, one record to the next ────────────────────────────────────
// Whether the record you are leaving had already collapsed into the header —
// Miyel: "if you're in the mini version of the card, scrolling left and right
// should keep it at mini, the next one should come up mini." The entry writes
// it as it scrolls and the next one asks once, on the way in, so a swipe
// carries where you were reading rather than the top of an album you did not
// ask to see again.
// Two variables and not one, because the moment matters. `atTheNotes` is
// live — the entry keeps it true while its cover is up in the header — and it
// goes false again the instant the outgoing record's scroller is emptied,
// which happens while the swipe is still in the air. So the swipe takes a
// copy on its way out, and the record arriving reads the copy.
// Stamped rather than spent, the same shape `wentBack` has and for the same
// reason turned inside out: React calls a state initializer twice in
// development, so a one-shot read answers the first caller and lies to the
// second, and which of the two React keeps is not something to build on. A
// timestamp can be read as often as anybody likes. Closing a layer clears it,
// so a record opened from the wall a moment later is not told it arrived
// mid-read.
let carriedAt = 0;
// ── Asked of the page, not of a running total, 2026-09-20 ─────────────────
// The entry kept this up to date as it scrolled, and that is a promise the
// browser does not make: a scroll that has not been painted yet has not told
// anybody anything, so a swipe taken straight after one carried the answer
// from before it. The question is about what is on the screen, so it is put
// to the screen — the record is in the header when the cover up there is the
// size of a cover in a header.
//
// Sixty, which is comfortably over the forty-four it lands at and far under
// anything on its way there.
export function carryReading() {
  if (typeof document === 'undefined') { carriedAt = 0; return; }
  // Whether the header is showing the record. It asked whether the cover up
  // there was small, which was true while the cover travelled and became
  // true of every listen the moment it stopped travelling — so a swipe from
  // a full card landed in the header state (Miyel: "if I'm on the full card
  // it shouldn't switch to the mini beacon"). What is actually being asked
  // is whether the changeover has happened, and the header says so.
  // How far through the header's handover the reader is. Asked of the
  // document rather than of a node, because the row is a portal and its
  // nodes are replaced — and asked as a number rather than by measuring a
  // cover, which stopped meaning anything once the cover stopped travelling.
  const turn = Number(getComputedStyle(document.documentElement).getPropertyValue('--ln-turn'));
  carriedAt = turn > 0.5 ? Date.now() : 0;
}
export function cameReadingOn() { return Boolean(carriedAt) && Date.now() - carriedAt < 1500; }
// Closing a record ends the read: what comes next is an arrival, not a page
// turn. Deliberately not in arrivingBack, which the history listener also
// calls — and a turn to a neighbour is a history move, so that cleared the
// answer the turn had just given.
export function endReading() { carriedAt = 0; }
// Asked by the wait state, which draws before the record does and must not
// spend the answer the record is coming for.
export function stillReadingOn() { return cameReadingOn(); }

// ── Opened from somewhere that does not browse ────────────────────────────
// The wall's order is a module variable and it outlives the wall, which is
// what lets a tapped cover know its neighbours. It also meant an entry opened
// from the ID pane arrived with the wall's order behind it and could be
// swiped through — the ID pane handing out an order it has no business
// handing out (2026-09-15). You browse on the wall and nowhere else.
//
// A one-shot rather than clearing `order`, and that is the point: clearing it
// would take the wall's neighbours away for good, because the wall only calls
// handOffOrder when what it shows changes and it would not say it again. This
// says "not this time" and is spent on the way in, the same shape as
// arrivingBySwipe/tookASwipe below.
let alone = false;
export function arrivingAlone() { alone = true; }
export function cameAlone() { const was = alone; alone = false; return was; }

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

// Going back to a sheet is not arriving at it. The book's sheet is a new
// mount when the page about a person closes over it, and left alone it
// rises from the foot of the screen again as if its door had just been
// pressed. So whoever closes a layer says so first, and the next layer to
// mount draws at rest. Stamped, and good for a moment only: if nothing
// mounts — the way back led to the desk — the flag must not linger to
// silence the next door somebody presses (2026-09-13).
let wentBack = 0;
export function arrivingBack() {
  wentBack = Date.now();
  // ── And the next press spends it, 2026-09-20 ────────────────────────────
  // The clock alone was not enough once an album started rising. Closing one
  // and opening another takes well under a second and a half, so the second
  // album mounted, found this still stamped, and drew itself at rest — Miyel:
  // "if I open one and slide it down and open the next one, it doesn't slide
  // up, it just kind of opens."
  //
  // What this is actually for is a layer that remounts *because* another one
  // closed over it, and that happens with no hand near the screen. A press is
  // therefore proof that this is not that. The clock stays as the backstop
  // for a close that leads nowhere and is never followed by anything.
  if (typeof document === 'undefined') return;
  const spend = () => { wentBack = 0; document.removeEventListener('pointerdown', spend, true); };
  document.addEventListener('pointerdown', spend, true);
}
export function cameBack() {
  const recent = wentBack && Date.now() - wentBack < 1500;
  wentBack = 0;
  return recent;
}
