// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/doorman.js
// Turns away anyone trying the door too fast.
//
// ── What this is protecting ───────────────────────────────────────────────
// The writing side has one password and no username, which is the right shape
// for a lock on a room only one person ever enters — but it means the only
// thing between a stranger and the dashboard is how many guesses they get. A
// login with no limit can be guessed at whatever speed the attacker's machine
// manages, and that is the difference between a strong password taking
// centuries and taking an afternoon. A few tries a minute is the whole fix.
//
// Comments and submissions are the other doors. Neither needs a password —
// anyone can leave a note or send a record, which is the point — and both
// would otherwise let one script fill the inbox overnight.
//
// ── Why the counting is in memory ─────────────────────────────────────────
// Two other places it could live, both rejected:
//
// A managed store (Vercel KV, Upstash, Redis) is the textbook answer and is
// ruled out by what this software is. Every copy is meant to be run by its
// keeper on their own server for nothing; a rate limiter that needs an account
// somewhere is a rate limiter most copies will run without.
//
// A database table would work and is honest, but it answers a flood of
// requests by writing a row for each one — spending the thing under pressure
// to protect the thing under pressure. It is also the wrong shape: this data
// is worthless in ten minutes and should not outlive the process.
//
// So: a Map, and the limits it can honestly promise.
//
// ── What it can and cannot promise ────────────────────────────────────────
// On a copy running as one long-lived process — a VPS, a Pi, a spare laptop,
// which is what self-hosting usually means — this is a real limit and holds
// exactly.
//
// On serverless it is weaker, and it is worth being exact about why rather
// than implying otherwise. Each instance has its own memory, so an attacker
// spread across enough concurrent instances gets the limit once per instance.
// What it still catches is the realistic attack: one machine hammering one
// endpoint, which lands on a warm instance and is stopped. It is a speed bump
// on a platform that cannot hold a bollard, and a speed bump is the difference
// between hours and centuries.
//
// If a copy ever does need the strict version, the seam is here: swap the Map
// for a store and nothing that calls this has to change.

// One bucket per caller per door, holding the timestamps of recent attempts.
// Trimmed on read rather than swept on a timer — a timer would keep a
// serverless instance alive for no reason, and a bucket nobody touches again
// is collected with the instance.
const buckets = new Map();

// Stops the Map growing without bound if something goes wrong upstream and
// every request arrives with a different address. Far above any real traffic,
// so it is a backstop and not a limit anybody meets.
const MOST_BUCKETS = 10000;

// Who is knocking. Vercel and most proxies put the real address at the front
// of x-forwarded-for; the rest of that header is the chain of proxies it came
// through and is not to be trusted.
//
// An address that cannot be read at all becomes one shared bucket rather than
// being waved through. That is deliberately the strict way round: an
// unidentifiable caller is exactly the one to be cautious about, and the only
// cost of being wrong is that a genuine visitor behind a strange proxy waits.
export function whoIsKnocking(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip')
    || request.headers.get('cf-connecting-ip')
    || 'unknown';
}

// The doors, and how patient each one is.
//
// The login is the strict one: five wrong guesses a minute is more than a
// person who has forgotten their password will ever need, and it takes a
// brute-force attempt from millions of tries an hour to three hundred.
//
// Comments and submissions are slower still in real use — somebody writing a
// paragraph takes minutes — so the numbers are about stopping a script rather
// than about pacing a person.
// Upvote is the odd one and is not really a rate limit. Keyed on the comment
// as well as the caller — see the route — one try in a long window is "you
// have already voted for this one", which is the actual rule an upvote wants.
// Rate limiting alone would still allow hundreds a day into a single count.
export const DOORS = {
  login:      { tries: 5,  windowMs: 60_000 },
  comment:    { tries: 5,  windowMs: 10 * 60_000 },
  submission: { tries: 5,  windowMs: 10 * 60_000 },
  upvote:     { tries: 1,  windowMs: 12 * 60 * 60_000 },
};

// Ask whether this caller may try this door.
//
// Returns { allowed, retryAfter } — retryAfter in whole seconds, for the
// Retry-After header and for telling somebody how long to wait in words.
//
// Counts the attempt when it allows it. A door that only counted failures
// would let somebody hammer away as long as they kept getting it right, which
// is not a thing that happens on a login but is exactly what a comment flood
// looks like.
export function mayKnock(door, caller) {
  const rule = DOORS[door];
  if (!rule) return { allowed: true, retryAfter: 0 };

  const now = Date.now();
  const key = `${door}:${caller}`;
  const since = now - rule.windowMs;

  const recent = (buckets.get(key) || []).filter(at => at > since);

  if (recent.length >= rule.tries) {
    // How long until the oldest attempt falls out of the window.
    const freeAt = recent[0] + rule.windowMs;
    buckets.set(key, recent);
    return { allowed: false, retryAfter: Math.max(1, Math.ceil((freeAt - now) / 1000)) };
  }

  if (buckets.size > MOST_BUCKETS) buckets.clear();
  recent.push(now);
  buckets.set(key, recent);
  return { allowed: true, retryAfter: 0 };
}

// Let a caller off the count. Called after a successful login, so that
// somebody who mistyped their password four times and then got it right is not
// still being counted against on their next device.
export function forgetKnocks(door, caller) {
  buckets.delete(`${door}:${caller}`);
}

// The refusal itself, as a Response. 429 is the status that says "you are not
// wrong, you are early", and Retry-After is what a well-behaved client reads.
// The message says how long in plain words because a person who has genuinely
// forgotten their password is the most likely reader of it.
export function tooSoon(retryAfter) {
  const wait = retryAfter >= 60
    ? `${Math.ceil(retryAfter / 60)} minutes`
    : `${retryAfter} seconds`;
  return Response.json(
    { error: `Too many attempts. Try again in ${wait}.` },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}
