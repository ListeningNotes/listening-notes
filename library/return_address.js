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
//
// Except an @, 2026-09-15. An email address passes every other part of this
// — something, a dot, something — so three sends from before the email field
// was retired have `josejunior770@gmail.com` sitting in `sender_url`, and the
// inbox turned each one into a link to `https://josejunior770@gmail.com`,
// which goes nowhere. It is also the one mistake somebody makes at a field
// asking where their journal is, because an email is the address people are
// used to being asked for. Nothing here ever wants one (DECISIONS, The
// network: no email anywhere on the site), so an @ disqualifies rather than
// being stripped — a guess at the host after it would file somebody under
// gmail.com. This is the only place the test lives, so the send form, the
// address book, the comment form and every route reject it alike.
const LOOKS_LIKE_A_HOST = /^[^\s.\/@]+(\.[^\s.\/@]+)+$/;

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
  tell();
  return kept;
}

// ── Arriving from your own copy ────────────────────────────────────────────
// A keeper reading somebody else's journal is a stranger to it. This
// browser, at this address, has never been told who they are — and their
// own copy, which knows both their name and their journal, cannot say so
// from where it stands: its storage is its origin's, like its cookies, and
// nothing at another address can read it (DECISIONS, The network).
//
// So it says so in the link. Every link out of a copy to another journal —
// the address book's, the person's page's, the feed's, the inbox's — carries
// the keeper's own name and address; the journal landed on reads them once,
// keeps them here as the return address, and takes them back off the
// address bar. The send form then knows who is sending, and a keeper who
// arrived through their own address book is never asked for a URL — which
// was the one place the address book's promise broke (NOTES, 2026-09-14).
//
// Only surfaces the owner alone can reach may add them: a public link that
// carried the journal's name would introduce every reader as its keeper.
const FROM = 'from';
const AS = 'as';
// Whether the journal landed on is already in the visitor's address book —
// the address book's, the feed's and the person's page's links say so, and
// the inbox's says so when the sender is filed. The card hides its Add pill
// on the strength of it, which is the one thing a journal cannot otherwise
// know about a visitor's book.
const KNOWN = 'known';
const KNOWN_KEY = 'ln-known-journal';

// Who wants to know when what is held here changes. The card reads the
// sender and the known flag through useSyncExternalStore, so nothing is set
// into state from an effect to get there.
const watchers = new Set();
export function subscribeSender(listener) {
  watchers.add(listener);
  return () => watchers.delete(listener);
}
const tell = () => { for (const listener of watchers) listener(); };

// Whether this journal is in the visitor's address book, as far as their
// own copy said on the way in. Read off the address as well as storage,
// because the card asks before the arrival has been noted — a child's
// effect runs before its parent's — and the flag is still on the bar then.
export function knownHere() {
  if (typeof window === 'undefined') return false;
  try {
    if (new URL(window.location.href).searchParams.has(KNOWN)) return true;
    return window.localStorage.getItem(KNOWN_KEY) === '1';
  } catch {
    return false;
  }
}

// A link out, carrying who this copy belongs to. Given no address to carry,
// or anything that is not a URL, the link comes back untouched — a link that
// stops working is worse than a visitor who has to type once.
export function carrySender(href, { name = '', address = '' } = {}, { known = false } = {}) {
  const journal = tidyJournal(address);
  if (!href || !journal) return href;
  try {
    const url = new URL(href);
    url.searchParams.set(FROM, journal);
    const who = String(name || '').trim();
    if (who) url.searchParams.set(AS, who);
    if (known) url.searchParams.set(KNOWN, '1');
    return url.toString();
  } catch {
    return href;
  }
}

// Read on landing, on every page. Keeps what the link carried as the return
// address and clears the bar; returns what was kept, or null when the link
// carried nothing, carried something that is not an address, or carried
// this journal's own — a link back to itself must not introduce a visitor
// as its keeper. A name held from before is kept when the link carries
// none; an address is always the link's, which is the fresher fact.
export function noteArrival(ownAddress) {
  if (typeof window === 'undefined') return null;
  let from = '';
  let as = '';
  let known = false;
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has(FROM)) return null;
    from = tidyJournal(url.searchParams.get(FROM));
    as = String(url.searchParams.get(AS) || '').trim();
    known = url.searchParams.has(KNOWN);
    url.searchParams.delete(FROM);
    url.searchParams.delete(AS);
    url.searchParams.delete(KNOWN);
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    return null;
  }
  if (!from || from === tidyJournal(ownAddress)) return null;
  // Set or cleared on every arrival from a copy: a person taken out of the
  // book and reached again through the inbox should get the pill back.
  try {
    if (known) window.localStorage.setItem(KNOWN_KEY, '1');
    else window.localStorage.removeItem(KNOWN_KEY);
  } catch { /* storage off; the pill simply shows */ }
  const held = recallSender();
  const kept = keepSender({ name: as || held.name, address: from });
  tell();
  return kept;
}
