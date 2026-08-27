// SPDX-License-Identifier: AGPL-3.0-or-later
// library/dog_ear.js
// The fold a reader leaves in their own copy — how far into the archive they
// had got the last time they were here. Everything posted past the fold is
// new to them; everything behind it, they've already been shown.
//
// This lives in the reader's browser, not the database, because readers don't
// have accounts. That means it is per browser, not per person: the same
// visitor on a phone and a laptop keeps two folds and each will disagree with
// the other. That's the honest limit of doing this without an account, and
// it's what to revisit once there are accounts to hang it off instead.
//
// The fold is an entry's timestamp, never a wall clock — that distinction is
// load-bearing. entries.created_at is a "timestamp without time zone" holding
// UTC, so the driver reads each naive value as local time and hands the
// browser an instant shifted by the reader's own offset. Comparing a row
// against Date.now() therefore calls anything from the last few hours "new"
// forever. Comparing rows against other rows cancels the shift exactly,
// because both sides came through the same pipe — and it stays correct once
// the column is fixed, since nothing here assumes the shift exists.
//
// Deliberately free of imports and of anything server-only — same reason as
// receipts.js, which this is modelled on.

const KEY = 'ln-dog-ear';

// How long a gap makes the next page view a separate sitting rather than a
// continuation of this one. Without it the fold would move on every page
// load, so a reload — or a trip to an album and back — would clear the marks
// off records the reader hadn't actually looked at yet.
//
// This one is wall-clock, and safe to be: it compares the browser's clock
// against the browser's own earlier reading of it, and never against a row.
const SITTING_GAP_MS = 30 * 60 * 1000;

const asTime = value => {
  const t = new Date(value).getTime();
  return Number.isFinite(t) ? t : null;
};

function read() {
  // Called from a component that also renders on the server, so window is
  // genuinely absent sometimes. A corrupt value shouldn't take the page down
  // either — losing the fold costs a reader one round of "New" badges.
  if (typeof window === 'undefined') return null;
  try {
    const kept = JSON.parse(window.localStorage.getItem(KEY) || 'null');
    if (!kept || typeof kept.fold !== 'number' || typeof kept.newestSeen !== 'number'
        || typeof kept.seenAt !== 'number') return null;
    return kept;
  } catch {
    return null;
  }
}

function write(state) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private browsing, a full quota, storage switched off — none of them
    // worth a broken page. Nothing shows as new and the site is fine.
  }
}

// Call once when a page that shows New badges has its entries. Give it the
// newest created_at on the page; it advances the fold if this is a fresh
// sitting and hands back the timestamp to compare entries against, or null
// when there's nothing to compare with.
export function beginVisit(newestCreatedAt, now = Date.now()) {
  const newest = asTime(newestCreatedAt);
  if (newest === null) return null;

  const kept = read();

  // First time here. The fold starts at the newest thing already posted, so a
  // newcomer meets the archive as it is rather than a wall of badges on all
  // thirty-nine records.
  if (!kept) {
    write({ fold: newest, newestSeen: newest, seenAt: now });
    return newest;
  }

  // Still the same sitting — leave the fold where it is. This is what lets a
  // reader reload, or open an album and come back, without the badges
  // vanishing out from under them.
  if (now - kept.seenAt < SITTING_GAP_MS) {
    write({ fold: kept.fold, newestSeen: Math.max(kept.newestSeen, newest), seenAt: now });
    return kept.fold;
  }

  // A new sitting: the fold moves up to the newest record the reader was
  // shown last time. Anything posted since then is what they haven't seen.
  write({ fold: kept.newestSeen, newestSeen: Math.max(kept.newestSeen, newest), seenAt: now });
  return kept.newestSeen;
}

// Was this posted past the reader's fold? Anything unparseable is not new —
// a badge that appears on everything says less than no badge at all.
export function isNewSince(created_at, fold) {
  if (!fold) return false;
  const posted = asTime(created_at);
  return posted !== null && posted > fold;
}

// Testing seam. Nothing in the app calls this.
export function forgetFold() {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(KEY); } catch {}
}
