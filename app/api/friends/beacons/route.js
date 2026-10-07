// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/friends/beacons/route.js
// Everyone in the address book's beacon, asked through one door.
//
// The Friends pane shows who is logging right now (Miyel's friends-room
// brief, 2026-10-06). Each friend's journal already answers that at
// /api/public/beacon, cached ten seconds at its edge — but a browser asking
// ten journals every minute, from every tab and device the keeper has open,
// is forty requests a minute landing on ten other people's hosting from one
// idle phone. So the browser asks this route once, and this route asks the
// friends once: in parallel, each given a short time to answer, and the
// round kept for a minute, so every tab and device the keeper owns costs
// their friends one round rather than one each.
//
// ── A journal that does not answer is unknown, never off ──────────────────
// A timeout or an error keeps the last thing that journal said and says
// nothing new. A dot that went dark because somebody's deployment was slow
// would be the page telling a lie about a person, and that is the one thing
// this feature could get badly wrong. `unknown` is only ever the answer for
// a journal this instance has never heard from.
//
// ── And it is asked less and less, not more ───────────────────────────────
// Each journal that fails is left alone for twice as long as last time —
// one minute, two, four, eight, ten at most — and asked at the usual rate
// again on its first good answer. Everyone else carries on. Without this a
// friend whose copy is asleep is asked every minute forever, by every keeper
// who has them in their book (Miyel, 2026-10-07).
//
// ── Thirty on the timer, the rest when they are looked at ─────────────────
// A round asks the first thirty people in the book's own order — pinned
// first, then by name — and nobody past them. A book of a hundred would
// otherwise be a hundred fetches a minute, which is the browser's mistake
// moved to the server. The rest are asked when the whole grid is opened
// (`?all`) and on a pull down (`?fresh`), which is somebody asking now; in
// between they stand at whatever they last said, and a "logging" heard
// longer ago than a needle lives is handed back as "logged", which is what
// their own beacon would say by then.
//
// ── What the minute can and cannot promise ────────────────────────────────
// The round lives in this module's memory, which on a copy running as one
// long process is one round a minute, exactly. On serverless each instance
// keeps its own, so it is a ceiling on the asking rather than a guarantee of
// one round — the same honesty library/doorman.js keeps about its buckets.
// Nothing is swept on a timer; staleness is decided when the next ask comes.
//
// Nothing here is stored. A round is read when a page asks and gone when the
// process is; there is no table, no column, and nothing to delete or leak.

import { requireWristband } from '@/library/wristband';
import { pull_people } from '@/library/people_actions';
import { journalUrl } from '@/library/return_address';

// How long one friend's journal gets. Short, because this answer is wanted
// now and a slow friend must not hold up nine fast ones; the feed gives a
// journal eight seconds because it asks once, and this asks every minute.
const EACH_MS = 2500;
// How long a round of answers is handed back before the friends are asked
// again. Nobody changes records that often, and the pull down is the way to
// ask sooner.
const KEEP_MS = 60 * 1000;
// How many are asked on the timer, in the book's order.
const MOST = 30;
// How long a journal that did not answer is left alone, doubling with each
// failure, and the most it is ever left.
const BACK_OFF_MS = 60 * 1000;
const BACK_OFF_MOST_MS = 10 * 60 * 1000;
// How long their needle stays down untouched (library/needle.js): a "logging"
// heard longer ago than this, from a journal not asked since, is "logged".
const LIFTS_AFTER_MS = 20 * 60 * 1000;

// The last round and when it was asked for, and the ask in flight — so two
// tabs arriving in the same second share one round rather than start two.
let round = { at: 0, all: false, friends: [] };
let asking = null;
// What each journal last said and when, how many times in a row it has not
// answered, and when it may be asked again. By address, for as long as this
// instance lives.
const known = new Map();

// A journal this instance has never heard from. The one honest answer, and
// the page draws nothing for it — no dot, dark or lit.
function unknown(person) {
  return {
    id: person.id, name: person.name || '', address: person.address,
    state: 'unknown', album: '', artist: '', art: '', track: '', at: null,
  };
}

// What the journal last said, under the person's current name and id — the
// book may have learned their name since. A journal that failed to answer
// keeps exactly what it said, lit dot and all (the brief's rule). One that
// was simply not asked, being past the thirty, is `settled`: a "logging"
// heard longer ago than a needle lives is handed back as "logged", which is
// what its own beacon would say by now.
function lastHeard(person, now, settled = false) {
  const was = known.get(person.address);
  if (!was?.heard) return unknown(person);
  const row = { ...was.heard, id: person.id, name: person.name || '' };
  if (settled && row.state === 'logging' && now - was.heardAt > LIFTS_AFTER_MS) row.state = 'logged';
  return row;
}

// The same read ask_journal_name makes (library/people_actions.js), of the
// beacon instead of the name: the keeper's own server asking a public route
// on the keeper's say-so. The beacon route does not say it may be read
// across origins, and it should not have to.
async function ask(person, now) {
  const was = known.get(person.address);
  if (was && now < was.nextAt) return lastHeard(person, now);
  const url = journalUrl(person.address);
  if (!url) return lastHeard(person, now);
  let heard = null;
  try {
    const answer = await fetch(`${url}/api/public/beacon`, {
      signal: AbortSignal.timeout(EACH_MS),
      headers: { accept: 'application/json' },
    });
    if (answer.ok) {
      const said = await answer.json();
      // 'none' is their word for a journal with nothing to say; 'nothing' is
      // the brief's. Anything else a copy might one day answer is nothing too.
      const state = said?.state === 'logging' || said?.state === 'logged' ? said.state : 'nothing';
      heard = {
        id: person.id, name: person.name || '', address: person.address,
        state,
        album: String(said?.album || ''),
        artist: String(said?.artist || ''),
        art: String(said?.art || ''),
        track: String(said?.track || ''),
        // When, from a copy new enough to say (the beacon's `at`, 2026-10-06).
        // An older copy never sends it, and the row says so with null.
        at: typeof said?.at === 'string' && said.at ? said.at : null,
      };
    }
  } catch {
    heard = null;
  }
  if (heard) {
    known.set(person.address, { heard, heardAt: now, failures: 0, nextAt: 0 });
    return heard;
  }
  const failures = (was?.failures || 0) + 1;
  known.set(person.address, {
    heard: was?.heard || null,
    heardAt: was?.heardAt || 0,
    failures,
    nextAt: now + Math.min(BACK_OFF_MOST_MS, BACK_OFF_MS * 2 ** (failures - 1)),
  });
  return lastHeard(person, now);
}

// Everyone in the book, in its order; the first thirty asked, the rest asked
// only when `all`, and otherwise handed back as they last stood.
async function askEveryone(all) {
  const now = Date.now();
  const people = await pull_people();
  const friends = await Promise.all(people.map((person, i) =>
    (all || i < MOST ? ask(person, now) : Promise.resolve(lastHeard(person, now, true)))));
  round = { at: now, all, friends };
  return round;
}

export async function GET(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const asked = new URL(request.url).searchParams;
    // A pull down asks everyone, now. Opening the whole grid asks everyone,
    // unless everyone was asked within the minute.
    const fresh = asked.has('fresh');
    const all = fresh || asked.has('all');
    const stale = Date.now() - round.at >= KEEP_MS;
    let answer = round;
    if (fresh || stale || (all && !round.all)) {
      if (!asking) asking = askEveryone(all).finally(() => { asking = null; });
      answer = await asking;
    }
    return Response.json(
      { at: new Date(answer.at).toISOString(), friends: answer.friends },
      // The keeper's own, and about other people: never for a shared cache.
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
