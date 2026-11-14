// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/issue/route.js
// This journal's door to the issue, for Community: the publication's answer,
// asked server to server and kept, so a page never waits on another site and
// a publication that cannot be reached leaves Community drawn from what was
// kept, with `stale` saying so (library/the_issue.js). Public, as the issue
// is: a visitor's Community reads it too.
import { read_issue } from '@/library/the_issue';
import { answerNoJournal } from '@/library/hosting_directory';
import { pull_wall_entries, pull_entry_by_slug } from '@/library/database_actions';
import { SANDBOX } from '@/library/version';

// TEMPORARY, for feeling the globe on alpha and the sandbox before the
// publication runs this code: there only, with no records to show, an issue made of this
// journal's own records under made-up names. Removed before community merges.
const STAND_IN_NAMES = ['Ada', 'Rui', 'Noor', 'Tomas', 'Bea', 'Kofi', 'Lena', 'Ines', 'Sol', 'Mika', 'Odile', 'Pax'];
async function standIn() {
  const seen = new Set();
  const mine = (await pull_wall_entries()).filter(e => e.album_art && !seen.has(e.album_key) && seen.add(e.album_key)).slice(0, 30);
  const records = await Promise.all(mine.map(async (e, i) => {
    const whole = await pull_entry_by_slug(e.slug).catch(() => null);
    return {
      key: `stand-in-${i}`, album: e.album, artist: e.artist, year: e.year || '', art: e.album_art,
      song: e.song || '', note: String(whole?.notes || '').slice(0, 600),
      name: STAND_IN_NAMES[i % STAND_IN_NAMES.length], journal: '', slug: '',
      rating: e.rating || '', favorite: !!e.favorite, masterpiece: !!e.masterpiece, formative: !!e.formative,
      at: e.posted_at,
    };
  }));
  // The first album sent a second time, so its card shows two voices.
  if (records.length > 1) records.splice(3, 0, { ...records[0], key: 'stand-in-again', name: 'Juno', rating: '4', favorite: true, masterpiece: false, formative: false, note: String(records[1].note || '').slice(0, 240) });
  return { number: 1, standIn: true, prompt: { id: 'stand-in', said: 'An album on repeat for you this month?', month: '', ends_at: '2026-11-30T23:59:00Z' }, records };
}

export async function GET() {
  try {
    let { issue, stale } = await read_issue();
    if (!issue?.records?.length && (process.env.NODE_ENV === 'development' || SANDBOX)) { issue = await standIn(); stale = false; }
    return Response.json({ issue, stale }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    const nowhere = answerNoJournal(error);
    if (nowhere) return nowhere;
    return Response.json({ issue: null, stale: true }, { headers: { 'Cache-Control': 'no-store' } });
  }
}
