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
// it. That is the same honest limit dog_ear.js documents at more length, and
// it is what to revisit if there are ever accounts to hang it off instead.
//
// Deliberately free of imports and of anything server-only — same reason as
// dog_ear.js and receipts.js, which this is modelled on.

// One key, shared by the send form, the comment form and — when it exists —
// the compare affordance. Not one per feature: fill it in anywhere and it is
// filled in everywhere after, which is also what lets a journal offer Compare
// to a visitor. The offer depends on the browser holding an address, not on
// which form happened to ask for it.
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

// Testing seam. Nothing in the app calls this.
export function forgetSender() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(KEY); } catch {}
}
