// library/receipts.js
// The browser's side of a receipt. The signing and checking live in
// wristband.js, on the server, with the secret; this half only carries the
// stubs around.
//
// Deliberately free of imports and of anything server-only: this runs in the
// reader's browser, and pulling wristband.js in here would drag jose and
// SESSION_SECRET into the public bundle.

const KEY = 'ln-receipts';

// A cap so a browser that comments constantly doesn't grow this without limit.
// Receipts are only useful while a comment is still waiting, which is hours,
// not months — the oldest ones falling off costs nothing.
const KEEP = 50;

function read() {
  // Called during render on a page that also renders on the server, so window
  // is genuinely absent sometimes. A corrupt value shouldn't take the page
  // down either — losing your receipts is a smaller failure than a blank page.
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(t => typeof t === 'string') : [];
  } catch {
    return [];
  }
}

export function kept_receipts() {
  return read();
}

export function keep_receipt(token) {
  if (!token || typeof window === 'undefined') return;
  try {
    const next = [...read().filter(t => t !== token), token].slice(-KEEP);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Private browsing, a full quota, storage switched off. The comment still
    // posted — the writer just won't see it held, which is where we were
    // before any of this existed.
  }
}
