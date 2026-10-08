// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/public/people/route.js
// The people this journal's keeper added who are on the Board themselves: a
// name and an address each, and nothing else.
//
// What makes "a friend away" on the Board (Miyel's Board brief, 2026-10-08;
// "all my testers are asking for this, they feel too alone, this will be how
// they find people"). A friend's journal reads this during the round it
// already makes for this journal's beacon (app/api/friends/beacons), and the
// people here become that friend's second ring.
//
// Three filters, all of them the brief's:
// - nothing at all while this journal's keeper is off the Board — 404, the
//   same answer a copy too old to have this route gives;
// - never anybody added privately (people.private);
// - only people who are on the Board themselves. That is asked of the
//   directory with hashes (library/directory_actions.js, boardHash), so
//   somebody who left the Board is never named to it, and kept for a minute.
//   When the directory cannot be asked, nobody is published rather than
//   everybody.
//
// Kept a minute here and at the edge: a book does not change by the second,
// and the friends asking are asking once a minute themselves.

import { pull_findable } from '@/library/settings_actions';
import { pull_public_people } from '@/library/people_actions';
import { boardHash } from '@/library/directory_actions';
import { ask_directory_among } from '@/library/outbox';

const KEPT_MS = 60 * 1000;
const EDGE = 'public, max-age=0, s-maxage=60, stale-while-revalidate=60';
let kept = { at: 0, people: null };

export async function GET() {
  try {
    if (!(await pull_findable())) {
      return new Response('Not on the board.', { status: 404, headers: { 'Cache-Control': EDGE } });
    }
    if (!kept.people || Date.now() - kept.at > KEPT_MS) {
      const book = await pull_public_people();
      const on = book.length ? await ask_directory_among(book.map(p => boardHash(p.address))) : [];
      if (on) {
        const listed = new Set(on.map(j => j.address));
        kept = {
          at: Date.now(),
          people: book.filter(p => listed.has(p.address)).map(p => ({ name: p.name || '', address: p.address })),
        };
      } else if (!kept.people) {
        kept = { at: 0, people: [] };
      }
    }
    return Response.json({ people: kept.people }, { headers: { 'Cache-Control': EDGE } });
  } catch {
    return Response.json({ people: [] }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
  }
}
