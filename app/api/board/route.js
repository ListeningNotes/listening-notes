// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/board/route.js
// Everything the Board reads, through one door on this journal.
//
// ── One route, the way the friends' beacons are, 2026-10-08 ────────────────
// Miyel: "keep the fan-out behind a single route, the way /api/friends/beacons
// already is. When hosting lands you can swap what's behind that route from
// 'crawl on demand in the browser' to 'read one cached crawl done on the
// server' without touching a single component. Free hedge, costs nothing
// today." So the Board (app/directory/Directory.js) asks this and nothing
// else — never the directory, never another journal:
//
// - GET /api/board                the first screen: everybody logging right
//                                 now, a shuffled dozen of everybody else,
//                                 the last day's records, the two counts
// - ?shuffle=<anything>           a new draw of the dozen
// - ?q=<words>                    a name or a record looked up
// - ?alike                        the keeper's own records, matched against
//                                 everybody else's — behind the wristband
// - ?lines=<address|slug>,…       a line of each keeper's own writing
//
// Today the first three are the directory's answers, passed through and
// kept a moment. The lines are read on demand, by this server, from each
// keeper's own journal — the same way the friends' round reads beacons: 2.5
// seconds each, kept ten minutes, a journal that does not answer left alone
// for longer each time (a minute, two, four… ten at most). Only journals on
// the Board are ever read, asked of the directory with hashes, so this door
// cannot be turned into a way of knocking on anybody else's server; and the
// asking is counted against whoever asks (library/doorman.js, `board`). No
// writing is kept past the ten minutes, and none of it goes to the directory.

import { checkWristband } from '@/library/wristband';
import { mayKnock, tooSoon, whoIsKnocking } from '@/library/doorman';
import { ask_directory_read, ask_directory_among } from '@/library/outbox';
import { boardHash } from '@/library/directory_actions';
import { pull_record_keys } from '@/library/database_actions';
import { journalUrl, tidyJournal } from '@/library/return_address';
import { splitNotes } from '@/library/entry_formatter';

const EDGE = s => `public, max-age=0, s-maxage=${s}, stale-while-revalidate=${s * 2}`;
const PRIVATE = 'private, no-store';

// The first screen, kept half a minute: the directory keeps it as long.
const SCREEN_KEPT_MS = 30 * 1000;
let screen = { at: 0, body: null };

// ── A line from what they wrote ───────────────────────────────────────────
const EACH_MS = 2500;
const LINE_KEPT_MS = 10 * 60 * 1000;
const LINES_MOST = 12;
const LINE_MOST = 150;
const BACK_OFF_MS = 60 * 1000;
const BACK_OFF_MOST_MS = 10 * 60 * 1000;
const ON_BOARD_KEPT_MS = 60 * 1000;
const lines = new Map();      // 'address|slug' → { line, at }
const quiet = new Map();      // address → { failures, nextAt }
const onBoard = new Map();    // address → { on, at }

// The opening of an album note: cut at a sentence's end past halfway, or at
// a word with an ellipsis.
function opening(text) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= LINE_MOST) return clean;
  const cut = clean.slice(0, LINE_MOST);
  const stop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('! '), cut.lastIndexOf('? '));
  if (stop > LINE_MOST / 2) return cut.slice(0, stop + 1);
  const space = cut.lastIndexOf(' ');
  return `${cut.slice(0, space > 0 ? space : LINE_MOST).replace(/[,;:—-]$/, '')}…`;
}

// Which of these addresses are on the Board — the only journals this door
// ever reads — asked of the directory with hashes and kept a minute.
async function whichOnBoard(addresses) {
  const now = Date.now();
  const ask = addresses.filter(a => !(onBoard.get(a) && now - onBoard.get(a).at < ON_BOARD_KEPT_MS));
  if (ask.length) {
    const listed = await ask_directory_among(ask.map(boardHash));
    if (listed) {
      const on = new Set(listed.map(j => j.address));
      for (const a of ask) onBoard.set(a, { on: on.has(a), at: now });
    }
  }
  return new Set(addresses.filter(a => onBoard.get(a)?.on));
}

async function readLine(address, slug) {
  const key = `${address}|${slug}`;
  const now = Date.now();
  const had = lines.get(key);
  if (had && now - had.at < LINE_KEPT_MS) return had.line;
  const waiting = quiet.get(address);
  if (waiting && now < waiting.nextAt) return had?.line ?? null;
  const url = journalUrl(address);
  if (!url) return null;
  try {
    const answer = await fetch(`${url}/api/entries/${encodeURIComponent(slug)}`, {
      signal: AbortSignal.timeout(EACH_MS),
      headers: { accept: 'application/json' },
    });
    if (!answer.ok) throw new Error(String(answer.status));
    const said = await answer.json();
    const line = opening(splitNotes(said?.entry?.notes || '').albumNotes) || null;
    lines.set(key, { line, at: now });
    quiet.delete(address);
    return line;
  } catch {
    const failures = (waiting?.failures || 0) + 1;
    quiet.set(address, { failures, nextAt: now + Math.min(BACK_OFF_MOST_MS, BACK_OFF_MS * 2 ** (failures - 1)) });
    return had?.line ?? null;
  }
}

async function theLines(request, asked) {
  const knock = mayKnock('board', whoIsKnocking(request));
  if (!knock.allowed) return tooSoon(knock.retryAfter);
  const pairs = String(asked || '').split(',').slice(0, LINES_MOST).map(p => {
    const bar = p.indexOf('|');
    return { address: tidyJournal(p.slice(0, bar)), slug: p.slice(bar + 1).slice(0, 200) };
  }).filter(p => p.address && p.slug);
  const on = await whichOnBoard([...new Set(pairs.map(p => p.address))]);
  const said = {};
  await Promise.all(pairs.filter(p => on.has(p.address)).map(async p => {
    const line = await readLine(p.address, p.slug);
    if (line) said[`${p.address}|${p.slug}`] = line;
  }));
  return Response.json({ lines: said }, { headers: { 'Cache-Control': EDGE(600) } });
}

// The keeper's own records, by hash, matched against everybody else's.
async function theAlike() {
  const keys = await pull_record_keys();
  const mine = {};
  for (const k of keys) mine[boardHash(k.album_key)] = k.posted_at ? new Date(k.posted_at).toISOString() : null;
  const hashes = Object.keys(mine);
  if (hashes.length === 0) return Response.json({ records: [], mine }, { headers: { 'Cache-Control': PRIVATE } });
  const said = await ask_directory_read(`alike=${hashes.join(',')}`);
  if (!said) return Response.json({ error: 'The board could not be read just now.' }, { status: 503 });
  return Response.json({ records: Array.isArray(said.records) ? said.records : [], mine }, { headers: { 'Cache-Control': PRIVATE } });
}

export async function GET(request) {
  try {
    const asked = new URL(request.url).searchParams;
    if (asked.has('lines')) return await theLines(request, asked.get('lines'));
    if (asked.has('alike')) {
      if (!(await checkWristband(request))) return Response.json({ error: 'Not yours to ask.' }, { status: 401 });
      return await theAlike();
    }
    if (asked.has('q')) {
      const said = await ask_directory_read(`q=${encodeURIComponent(String(asked.get('q')).slice(0, 60))}`);
      if (!said) return Response.json({ error: 'The board could not be read just now.' }, { status: 503 });
      return Response.json(said, { headers: { 'Cache-Control': EDGE(30) } });
    }
    const shuffle = asked.has('shuffle');
    if (!shuffle && screen.body && Date.now() - screen.at < SCREEN_KEPT_MS) {
      return Response.json(screen.body, { headers: { 'Cache-Control': EDGE(30) } });
    }
    const said = await ask_directory_read(`board=1${shuffle ? `&shuffle=${Date.now()}` : ''}`);
    if (!said) {
      if (screen.body) return Response.json(screen.body, { headers: { 'Cache-Control': PRIVATE } });
      return Response.json({ error: 'The board could not be read just now.' }, { status: 503 });
    }
    if (!shuffle) screen = { at: Date.now(), body: said };
    return Response.json(said, { headers: { 'Cache-Control': shuffle ? PRIVATE : EDGE(30) } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
