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
// who has them in their book (Miyel, 2026-10-07). The courtesy is against
// the timer, not against a person: a pull down asks a journal in its
// quiet spell too, once, because a press is somebody asking now.
//
// ── Thirty on the timer, the rest when they are looked at ─────────────────
// A round asks the first thirty people in the book's own order — pinned
// first, then by name — and nobody past them. A book of a hundred would
// otherwise be a hundred fetches a minute, which is the browser's mistake
// moved to the server. The rest are asked when the whole grid is opened
// (`?all`), which asks only them while the first thirty's answers are still
// within the minute, and on a pull down (`?fresh`), which asks everyone; in
// between they stand at whatever they last said, and a "logging" heard
// longer ago than a needle lives is handed back as "logged", which is what
// their own beacon would say by then. A pull within ten seconds of a round
// — their edge's own cache time — is handed that round: their edge would
// answer the same thing.
//
// ── What the minute can and cannot promise ────────────────────────────────
// The round lives in this module's memory, which on a copy running as one
// long process is one round a minute, exactly. On serverless each instance
// keeps its own, so it is a ceiling on the asking rather than a guarantee of
// one round — the same honesty library/doorman.js keeps about its buckets.
// Nothing is swept on a timer; staleness is decided when the next ask comes.
// Two asks never run at once: an ask that wants more than the one in
// flight (everyone, or everyone now) waits for it and then runs.
//
// Nothing here is stored. A round is read when a page asks and gone when the
// process is; there is no table, no column, and nothing to delete or leak.
//
// ── And their friends: a friend away, 2026-10-08 ─────────────────────────
// The Board's second ring (Miyel's Board brief): the people the friends
// added. Folded into this round rather than asked by the browser — "one more
// fetch per friend on the same round, same 2.5s per-friend timeout, same 60s
// cache, same per-friend back-off, same cap of thirty per round." Each
// friend's /api/public/people is read beside their beacon; what it names,
// less the keeper and the people already in the book, is `away`, each with
// the friends it came through. Two rings only: nobody's friends' friends are
// ever asked for their books — ten times ten times ten is where this stops
// being affordable to other people's hosting. What each of them is playing
// comes from the directory, asked once a round with hashes, never from them.

import { requireWristband } from '@/library/wristband';
import { pull_people } from '@/library/people_actions';
import { pull_settings } from '@/library/settings_actions';
import { boardHash } from '@/library/directory_actions';
import { ask_directory_among } from '@/library/outbox';
import { journalUrl, tidyJournal } from '@/library/return_address';

// How long one friend's journal gets. Short, because this answer is wanted
// now and a slow friend must not hold up nine fast ones; the feed gives a
// journal eight seconds because it asks once, and this asks every minute.
const EACH_MS = 2500;
// How long a round of answers is handed back before the friends are asked
// again. Nobody changes records that often, and the pull down is the way to
// ask sooner.
const KEEP_MS = 60 * 1000;
// The least a pull waits after a round: the ten seconds a friend's edge
// keeps their beacon (EDGE_TTL in app/api/public/beacon/route.js).
const FRESH_FLOOR_MS = 10 * 1000;
// How many are asked on the timer, in the book's order.
const MOST = 30;
// How long a journal that did not answer is left alone, doubling with each
// failure, and the most it is ever left.
const BACK_OFF_MS = 60 * 1000;
const BACK_OFF_MOST_MS = 10 * 60 * 1000;
// How long their needle stays down untouched (library/needle.js): a "logging"
// heard longer ago than this, from a journal not asked since, is "logged".
const LIFTS_AFTER_MS = 20 * 60 * 1000;
// How many of the friends' friends one round hands back at most.
const AWAY_MOST = 60;

// The last round, when it was asked for, and whether it reached past the
// first thirty; and the ask in flight — what it covers and its promise — so
// two tabs arriving in the same second share one round rather than start two.
let round = { at: 0, all: false, friends: [], away: [] };
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
// book may have learned their name since. A journal in the first thirty that
// failed to answer keeps exactly what it said, lit dot and all (the brief's
// rule). One past the thirty is `settled`, whichever path handed it back: a
// "logging" heard longer ago than a needle lives is "logged", which is what
// its own beacon would say by now.
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
// Their book, beside their beacon (app/api/public/people): a list when it
// answers, an empty one when they are off the Board or too old to say (404),
// and null when it did not answer — unknown, which keeps the last list.
async function askBook(url) {
  try {
    const answer = await fetch(`${url}/api/public/people`, {
      signal: AbortSignal.timeout(EACH_MS),
      headers: { accept: 'application/json' },
    });
    if (answer.status === 404) return [];
    if (!answer.ok) return null;
    const said = await answer.json();
    if (!Array.isArray(said?.people)) return null;
    return said.people
      .map(p => ({ name: String(p?.name || ''), address: tidyJournal(p?.address) }))
      .filter(p => p.address);
  } catch {
    return null;
  }
}

async function ask(person, now, { settled = false, fresh = false } = {}) {
  const was = known.get(person.address);
  if (!fresh && was && now < was.nextAt) return lastHeard(person, now, settled);
  const url = journalUrl(person.address);
  if (!url) return lastHeard(person, now, settled);
  let heard = null;
  const theirs = askBook(url);
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
        // When it was sat with, from a copy new enough to say (the beacon's
        // `at`, 2026-10-06). An older copy never sends it; the row says null.
        at: typeof said?.at === 'string' && said.at ? said.at : null,
      };
    }
  } catch {
    heard = null;
  }
  const book = (await theirs) ?? was?.book ?? null;
  if (heard) {
    known.set(person.address, { heard, heardAt: now, failures: 0, nextAt: 0, book });
    return heard;
  }
  const failures = (was?.failures || 0) + 1;
  known.set(person.address, {
    heard: was?.heard || null,
    heardAt: was?.heardAt || 0,
    failures,
    nextAt: now + Math.min(BACK_OFF_MOST_MS, BACK_OFF_MS * 2 ** (failures - 1)),
    book,
  });
  return lastHeard(person, now, settled);
}

// The second ring: everybody the friends' books name, less the keeper and
// the people already in the book, each with up to two of the friends they
// came through, in the book's order. Only those the directory says are on
// the Board, with what they are playing; in no order but chance (AGENTS,
// Never: nothing ordered by how much anybody logs). When the directory does
// not answer, the last round's second ring stands.
async function friendsAway(people) {
  const mine = tidyJournal((await pull_settings().catch(() => ({})))?.site_address);
  const inBook = new Set(people.map(p => p.address));
  const away = new Map();
  for (const person of people) {
    for (const theirs of known.get(person.address)?.book || []) {
      if (theirs.address === mine || inBook.has(theirs.address)) continue;
      const row = away.get(theirs.address) || { address: theirs.address, name: theirs.name, through: [] };
      if (person.name && row.through.length < 2 && !row.through.includes(person.name)) row.through.push(person.name);
      away.set(theirs.address, row);
    }
  }
  if (away.size === 0) return [];
  const rows = [...away.values()].slice(0, 200);
  const on = await ask_directory_among(rows.map(r => boardHash(r.address)));
  if (!on) return round.away;
  const playing = new Map(on.map(j => [j.address, j]));
  const found = rows.filter(r => playing.has(r.address)).map(r => {
    const j = playing.get(r.address);
    return {
      address: r.address,
      name: j.name || r.name || '',
      state: j.state, album: j.album, artist: j.artist, art: j.art,
      through: r.through,
    };
  });
  for (let i = found.length - 1; i > 0; i--) {
    const k = Math.floor(Math.random() * (i + 1));
    [found[i], found[k]] = [found[k], found[i]];
  }
  return found.slice(0, AWAY_MOST);
}

// Everyone in the book, in its order. On the timer the first thirty are
// asked and the rest handed back as they last stood; `all` asks the rest as
// well, and leaves the first thirty alone when their round is still within
// the minute; `fresh` asks everyone, now.
async function askEveryone({ all, fresh }) {
  const now = Date.now();
  if (fresh && now - round.at < FRESH_FLOOR_MS) return round;
  const since = round.at;
  const recent = !fresh && now - since < KEEP_MS;
  const people = await pull_people();
  const friends = await Promise.all(people.map((person, i) => {
    const past = i >= MOST;
    if (past && !all) return Promise.resolve(lastHeard(person, now, true));
    if (!past && recent) return Promise.resolve(lastHeard(person, now));
    return ask(person, now, { settled: past, fresh });
  }));
  const away = await friendsAway(people);
  // A round that left the first thirty as they were keeps their clock, so
  // the timer asks them again when it would have anyway.
  round = { at: recent ? since : now, all: all || (recent && round.all), friends, away };
  return round;
}

// One ask at a time. An ask that wants more than the one in flight waits
// its turn rather than joining it, so opening the whole book during a timer
// round still reaches past thirty, and a pull during one is still a pull.
function startAsk(want) {
  const after = asking ? asking.promise.catch(() => {}) : Promise.resolve();
  const mine = { all: want.all, promise: after.then(() => askEveryone(want)) };
  const clear = () => { if (asking === mine) asking = null; };
  mine.promise.then(clear, clear);
  asking = mine;
  return mine;
}

export async function GET(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const asked = new URL(request.url).searchParams;
    const fresh = asked.has('fresh') && Date.now() - round.at >= FRESH_FLOOR_MS;
    const all = fresh || asked.has('all');
    const stale = Date.now() - round.at >= KEEP_MS;
    let answer = round;
    if (fresh || stale || (all && !round.all)) {
      const covered = asking && !fresh && (!all || asking.all);
      answer = await (covered ? asking : startAsk({ all, fresh })).promise;
    }
    return Response.json(
      { at: new Date(answer.at).toISOString(), friends: answer.friends, away: answer.away || [] },
      // The keeper's own, and about other people: never for a shared cache.
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
