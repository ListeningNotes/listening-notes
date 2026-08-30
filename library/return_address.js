// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/return_address.js
// The address on the back of the envelope — the sender's own journal, kept so
// they only have to paste it once.
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

// What to put in the field when the page opens. Empty string rather than null,
// because it goes straight into a controlled input and null would make it
// uncontrolled halfway through the first keystroke.
export function recallAddress() {
  // Called from a component that also renders on the server, so window is
  // genuinely absent sometimes. A corrupt value should not take the page down
  // either — losing this costs a sender one paste.
  if (typeof window === 'undefined') return '';
  try {
    return tidyAddress(window.localStorage.getItem(KEY) || '');
  } catch {
    return '';
  }
}

// Called once a send has actually gone through, never while typing. A half
// typed address saved on every keystroke would be prefilled next time as
// whatever the sender had got to before they changed their mind.
//
// An address that does not pass tidyAddress clears what is kept rather than
// leaving the old one in place: somebody who empties the field meant to.
export function keepAddress(value) {
  if (typeof window === 'undefined') return '';
  const tidy = tidyAddress(value);
  try {
    if (tidy) window.localStorage.setItem(KEY, tidy);
    else window.localStorage.removeItem(KEY);
  } catch {
    // Private browsing, a full quota, storage switched off — none of them
    // worth a broken send. The field simply starts empty next time.
  }
  return tidy;
}

// Testing seam. Nothing in the app calls this.
export function forgetAddress() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(KEY); } catch {}
}
