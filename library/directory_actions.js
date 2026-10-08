// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/directory_actions.js
// The `directory` table: the journals that chose to be findable, and the
// last beacon seen from each (migrations/031_directory.sql).
//
// Only the copy that the others' DIRECTORY_URL names ever fills it, but every
// copy carries the code, as every copy carries the reports table. Three kinds
// of caller: a reader, who gets the list straight from the table and never
// waits on a journal; a journal, asking to be listed or to leave
// (app/api/directory/listings/route.js); and the scheduled job, which is the
// only thing that asks the journals what they are logging
// (app/api/directory/gather/route.js) — never a reader's visit, or one
// unlucky visitor would set off a fetch to every listed journal (Miyel's
// directory instructions, 2026-10-07).

import database from './database_connection.js';
import { journalUrl } from './return_address.js';

// Thirty rows and a cursor, never the whole table.
export const PAGE = 30;
// How long one journal gets to answer the job.
const EACH_MS = 2500;
// A needle untouched this long has lifted (library/needle.js). A journal last
// seen logging longer ago than this is shown as having logged, rather than as
// logging on the strength of an old answer.
const NEEDLE_MINUTES = 20;
// ── The asking rate decays ────────────────────────────────────────────────
// Most journals are not listening at any moment, and asking them all every
// minute is the thing that would melt the registry as the list grows. Seen
// logging within the hour: asked every minute. Otherwise: every thirty
// minutes. A journal that does not answer is asked half as often each time,
// up to three hours apart, and as usual again on its first good answer.
const LIVE_SECONDS = 60;
const IDLE_SECONDS = 30 * 60;
const SLOWEST_SECONDS = 3 * 60 * 60;
// How many journals one run of the job asks. The most overdue first; the
// rest wait for the next run rather than stretching this one past a
// function's time.
const MOST_PER_RUN = 40;

// What a reader sees of a row: logging only while the needle could still be
// down, logged once there is a record, nothing before. Never a number.
function shown(row) {
  const state = row.live ? 'logging' : (row.album ? 'logged' : 'nothing');
  return {
    address: row.address,
    name: row.name || '',
    state,
    album: row.album || '',
    artist: row.artist || '',
    art: row.art || '',
  };
}

const LIVE_SQL = `(state = 'logging' AND last_logging_at > now() - interval '${NEEDLE_MINUTES} minutes')`;

// The cursor is where the last page stopped, in the page's own order.
const encode = row => Buffer.from(JSON.stringify({
  l: row.live ? 1 : 0, t: new Date(row.listed_at).toISOString(), a: row.address,
})).toString('base64url');
function decode(cursor) {
  try {
    const c = JSON.parse(Buffer.from(String(cursor), 'base64url').toString('utf8'));
    if ((c.l !== 0 && c.l !== 1) || !c.t || !c.a) return null;
    return { live: c.l === 1, listedAt: new Date(c.t).toISOString(), address: String(c.a) };
  } catch {
    return null;
  }
}

// ── The list ──────────────────────────────────────────────────────────────
// Logging first, then newest listed — which rewards nothing — thirty at a
// time, with how many journals are listed and how many are logging right
// now. Counts of the whole community, never of a person (AGENTS, Never).
export async function pull_directory_page(cursor = '') {
  const after = cursor ? decode(cursor) : null;
  const params = [];
  let where = 'true';
  if (after) {
    params.push(after.live, after.listedAt, after.address);
    where = `(live < $1)
      OR (live = $1 AND listed_at < $2::timestamptz)
      OR (live = $1 AND listed_at = $2::timestamptz AND address > $3)`;
  }
  params.push(PAGE + 1);
  const rows = await database.query(
    `SELECT * FROM (
       SELECT address, name, state, album, artist, art, listed_at, ${LIVE_SQL} AS live
       FROM directory
     ) d
     WHERE ${where}
     ORDER BY live DESC, listed_at DESC, address ASC
     LIMIT $${params.length}`,
    params,
  );
  const [counts] = await database.query(
    `SELECT count(*)::int AS listed, count(*) FILTER (WHERE ${LIVE_SQL})::int AS logging FROM directory`,
  );
  const page = rows.slice(0, PAGE);
  return {
    listed: counts?.listed || 0,
    logging: counts?.logging || 0,
    journals: page.map(shown),
    next: rows.length > PAGE ? encode(page[page.length - 1]) : null,
  };
}

// ── The Board's first screen, 2026-10-08 ──────────────────────────────────
// Everybody logging right now, community-wide — the band — and a dozen of
// everybody else, shuffled: "further out". One request draws the Board's
// first screen. Neither half is ordered by how much anybody logs (AGENTS,
// Never): the band is everyone on at this moment, in no order but chance,
// and the dozen is a fresh draw; `shuffle` is only there to make a new draw
// a new address for a shared cache.
const BAND_MOST = 30;
const DOZEN = 12;
// A row the job has never seen, or one not logging, is not live.
const NOT_LIVE_SQL = `NOT COALESCE(${LIVE_SQL}, false)`;

export async function pull_board() {
  const live = await database.query(
    `SELECT address, name, state, album, artist, art, true AS live
     FROM directory WHERE ${LIVE_SQL}
     ORDER BY random() LIMIT $1`,
    [BAND_MOST],
  );
  const further = await database.query(
    `SELECT address, name, state, album, artist, art, false AS live
     FROM directory WHERE ${NOT_LIVE_SQL}
     ORDER BY random() LIMIT $1`,
    [DOZEN],
  );
  const [counts] = await database.query(
    `SELECT count(*)::int AS listed, count(*) FILTER (WHERE ${LIVE_SQL})::int AS logging FROM directory`,
  );
  return {
    listed: counts?.listed || 0,
    logging: counts?.logging || 0,
    live: live.map(shown),
    further: further.map(shown),
  };
}

// ── Looking somebody up by name ───────────────────────────────────────────
// The Board's search, for a name: never an address, which is not something a
// person types and not something the Board prints. Alphabetical, thirty at
// most.
export async function find_by_name(q) {
  const term = String(q || '').trim().slice(0, 60);
  if (!term) return { journals: [] };
  const like = `%${term.replace(/[\\%_]/g, c => '\\' + c)}%`;
  const rows = await database.query(
    `SELECT address, name, state, album, artist, art, ${LIVE_SQL} AS live
     FROM directory WHERE name ILIKE $1
     ORDER BY lower(name), address LIMIT $2`,
    [like, PAGE],
  );
  return { journals: rows.map(shown) };
}

// ── Being listed ──────────────────────────────────────────────────────────
export async function pull_listing(address) {
  const [row] = await database`SELECT address, code FROM directory WHERE address = ${address}`;
  return row || null;
}

export async function save_listing(address, code) {
  await database`
    INSERT INTO directory (address, code) VALUES (${address}, ${code})
    ON CONFLICT (address) DO UPDATE SET code = EXCLUDED.code
  `;
}

// Delisting removes the only thing that was there.
export async function remove_listing(address) {
  await database`DELETE FROM directory WHERE address = ${address}`;
}

// ── Asking a journal what it is logging ───────────────────────────────────
// Its public beacon, and its keeper's name off its public settings when
// wanted — the name changes rarely, so the job asks for it on the slow round
// only. A name that does not come back is no reason to lose the beacon.
export async function read_journal(address, { withName = false } = {}) {
  const base = journalUrl(address);
  if (!base) throw new Error('Not an address.');
  const ask = path => fetch(`${base}${path}`, {
    signal: AbortSignal.timeout(EACH_MS),
    headers: { accept: 'application/json' },
  }).then(answer => {
    if (!answer.ok) throw new Error(String(answer.status));
    return answer.json();
  });
  const [beacon, settings] = await Promise.all([
    ask('/api/public/beacon'),
    withName ? ask('/api/settings').catch(() => null) : Promise.resolve(null),
  ]);
  const state = beacon?.state === 'logging' || beacon?.state === 'logged' ? beacon.state : 'nothing';
  return {
    state,
    album: String(beacon?.album || ''),
    artist: String(beacon?.artist || ''),
    art: String(beacon?.art || ''),
    name: settings ? String(settings?.settings?.keeper_name || '').trim() : null,
  };
}

// What the journal said, written down. A name that was not asked for keeps
// the one already there.
export async function record_seen(address, seen) {
  await database`
    UPDATE directory SET
      state = ${seen.state},
      album = ${seen.album},
      artist = ${seen.artist},
      art = ${seen.art},
      name = COALESCE(${seen.name}, name),
      checked_at = now(),
      last_logging_at = CASE WHEN ${seen.state} = 'logging' THEN now() ELSE last_logging_at END,
      fail_count = 0
    WHERE address = ${address}
  `;
}

// A journal that did not answer: asked, and counted, and nothing else
// changes. A failed fetch is unknown, not offline — the last state stands,
// and a dot is never darkened because somebody's deployment was slow.
export async function record_missed(address) {
  await database`
    UPDATE directory SET checked_at = now(), fail_count = LEAST(fail_count + 1, 30)
    WHERE address = ${address}
  `;
}

// ── The scheduled job's one run ───────────────────────────────────────────
// Every journal whose turn has come, the most overdue first, asked at once.
export async function gather() {
  // The casts are needed: a CASE of two bare parameters is read as text, and
  // text times a number is an error, not a number.
  const due = await database.query(
    `SELECT address, name, last_logging_at FROM directory
     WHERE checked_at IS NULL
        OR checked_at + LEAST(
             (CASE WHEN last_logging_at > now() - interval '1 hour' THEN $1::integer ELSE $2::integer END)
               * power(2, fail_count),
             $3::integer
           ) * interval '1 second' <= now()
     ORDER BY checked_at ASC NULLS FIRST
     LIMIT $4`,
    [LIVE_SECONDS, IDLE_SECONDS, SLOWEST_SECONDS, MOST_PER_RUN],
  );
  const hour = Date.now() - 60 * 60 * 1000;
  await Promise.all(due.map(async row => {
    const idle = !row.last_logging_at || new Date(row.last_logging_at).getTime() < hour;
    try {
      await record_seen(row.address, await read_journal(row.address, { withName: idle || !row.name }));
    } catch {
      await record_missed(row.address).catch(() => {});
    }
  }));
  return due.length;
}
