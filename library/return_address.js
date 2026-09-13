// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/return_address.js
// The back of the envelope: a name and a journal, kept so nobody types either
// twice.
//
// Both, not just the URL, because a return address is a name and an address —
// and because being asked your own name on every comment is the kind of small
// friction that stops somebody leaving the second one.
//
// ── Why this cannot be read from the session ──────────────────────────────
// Somebody arriving here to send an album may well be keeping a journal of
// their own, and there is no way for this journal to find out. Cookies are
// scoped per origin, so a copy running at one address cannot see anything set
// by a copy running at another, and that isolation is not an obstacle to route
// around — it is the reason nobody can be followed from one journal to the
// next. The cost is one paste, once.
//
// So the URL is kept here instead, in the sender's own browser, the first time
// they type it. Which makes this per browser and not per person: the same
// sender on a phone and a laptop pastes it twice, and a cleared browser forgets
// it. That is the honest limit of doing this without accounts, and it is what
// to revisit if there are ever accounts to hang it off instead.
//
// ── What this is not ──────────────────────────────────────────────────────
// For two days in September 2026 it was also how a journal knew a visitor
// kept one: the owner's copy stamped its links out with ?from=<its address>,
// the journal landed on kept that here and offered Compare. Retired, because
// it only worked for somebody who arrived from a link their own copy had
// written — an inbox link, and nowhere else. A text, a scanned code, a shared
// card carry no such thing, and those are how people arrive. Everything
// social lives on the visitor's own copy now: their address book, their
// comparing (DECISIONS, The network). This file is the send form's and the
// comment form's, and nothing reads it to decide what a visitor is.
//
// Deliberately free of imports and of anything server-only — same reason as
// receipts.js, which this is modelled on — so the address helpers below are
// safe to read from the browser and from a route alike.

// One key, shared by the send form and the comment form. Not one per feature:
// fill it in anywhere and it is filled in everywhere after.
const KEY = 'ln-return-address';

// What counts as an address worth keeping. Deliberately loose: this is a
// convenience, so the cost of turning away something valid is higher than the
// cost of keeping something that turns out not to resolve. A dot with
// something either side of it is the whole test — enough to reject a name
// typed into the wrong box, which is the mistake actually being caught.
const LOOKS_LIKE_A_HOST = /^[^\s.\/]+(\.[^\s.\/]+)+$/;

// Everything is stored the way it will be shown: no scheme, no trailing
// slash, lower case. A sender who types their address three different ways
// over three sends should see one address prefilled, not whichever spelling
// they used last.
export function tidyAddress(value) {
  const said = String(value ?? '').trim();
  if (!said) return '';
  const bare = said
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
    .toLowerCase();
  return LOOKS_LIKE_A_HOST.test(bare.split('/')[0]) ? bare : '';
}

// The same, cut down to the host. An entry's code carries a path and a
// pasted link may carry anything; a journal read, compared or filed in the
// address book is the whole journal, so only the origin matters.
export function tidyJournal(value) {
  return tidyAddress(value).split('/')[0];
}

// The scheme an address is reached at. Stored without one on purpose, so
// this is the one place it is put back — the inbox's links, the address
// book's faces, a route asking a journal its name. Plain http for a copy on
// this machine, which is only ever a rehearsal. Empty for anything that is
// not an address, so a link built from it is visibly nothing rather than
// quietly wrong.
export function journalUrl(address) {
  const host = tidyJournal(address);
  if (!host) return '';
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  return (local ? 'http://' : 'https://') + host;
}

// What to put in the fields when a form opens. Always both strings, never
// null: they go straight into controlled inputs, and null would make one
// uncontrolled halfway through the first keystroke.
//
// The stored value used to be a bare URL string and may still be one in
// somebody's browser, so a string is read as an address with no name rather
// than thrown away. Nobody should have to re-paste because the shape changed.
export function recallSender() {
  // Called from components that also render on the server, so window is
  // genuinely absent sometimes. A corrupt value should not take the page down
  // either — losing this costs somebody one paste.
  if (typeof window === 'undefined') return { name: '', address: '' };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { name: '', address: '' };
    if (raw[0] !== '{') return { name: '', address: tidyAddress(raw) };
    const held = JSON.parse(raw);
    return {
      name: String(held?.name || '').trim(),
      address: tidyAddress(held?.address || ''),
    };
  } catch {
    return { name: '', address: '' };
  }
}

// Called once something has actually posted, never while typing. A half typed
// name saved on every keystroke would come back next time as whatever somebody
// had got to before they changed their mind.
//
// Emptying a field clears that half rather than leaving the old value behind:
// somebody who deleted their name meant to. Clearing both removes the key, so
// there is nothing left in the browser for a person who wanted nothing left.
export function keepSender({ name = '', address = '' } = {}) {
  if (typeof window === 'undefined') return { name: '', address: '' };
  const kept = { name: String(name).trim(), address: tidyAddress(address) };
  try {
    if (kept.name || kept.address) window.localStorage.setItem(KEY, JSON.stringify(kept));
    else window.localStorage.removeItem(KEY);
  } catch {
    // Private browsing, a full quota, storage switched off — none of them
    // worth a broken send. The fields simply start empty next time.
  }
  return kept;
}
