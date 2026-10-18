// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/restore/route.js
// Bring your journal: a journal put into a copy nobody has claimed yet, from
// the copy its keeper made in Settings, and the copy claimed with it.
//
// ── Why it exists ─────────────────────────────────────────────────────────
// Make a copy hands a keeper their whole journal, and until 2026-10-08 the
// only way back in was scripts/restore.mjs, from a terminal. A way out that
// only a developer can come back through is half of one. So setup offers it
// on its first screen (app/setup/page.js): the browser reads journal.json out
// of the zip, says whose journal it is and how much is in it, asks for a
// password, and posts both here.
//
// ── Only on a copy nobody has claimed ─────────────────────────────────────
// Behind the wristband, which on an unclaimed copy is bought with the claim
// code or the half hour after a build — setup's own door (app/api/setup). A
// claimed journal is refused outright: putting a file over a journal
// somebody keeps empties every table it holds, and that stays a terminal's
// job, with its dry run in front of it.
//
// ── What it does ──────────────────────────────────────────────────────────
// library/unpacking.mjs, the restore the script runs, with two differences.
// The vault is never taken from a file — this copy keeps its own key, and the
// password is the one chosen in setup, since a copy never carries one. And
// the claim is sealed inside the same transaction: the password, the end of
// the claim code, this copy's own address in place of the old one, setup
// complete. Either the journal arrives claimed or nothing changed.
//
// The body is the journal and the password as JSON, gzipped where the
// browser can: a journal is mostly text, and a request past a few megabytes
// is refused by the platform before it arrives.

import { NextResponse } from 'next/server';
import { gunzipSync } from 'node:zlib';
import { Client } from '@neondatabase/serverless';
import { requireWristband } from '@/library/wristband';
import { isSetUp } from '@/library/settings_actions';
import { directDatabaseUrl } from '@/library/migrator';
import { hashPassword, seal_claim } from '@/library/secrets';
import { addressFrom } from '@/library/return_address';
import { from_document, plan_unpacking, unpack } from '@/library/unpacking.mjs';

// Setup's floor, for setup's reason (app/api/setup).
const PASSWORD_FLOOR = 8;
// The most a gzipped body may open up to. A journal is a few megabytes at
// most; a body that unfolds past this is not one.
const UNFOLDED_MOST = 64 * 1024 * 1024;

export async function POST(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  // Fail the way the hold does: a question that cannot be answered is a
  // journal that is somebody's.
  try {
    if (await isSetUp()) return NextResponse.json({ error: 'This journal is already set up.' }, { status: 409 });
  } catch {
    return NextResponse.json({ error: 'This copy can’t tell whether it’s set up yet. Try again in a moment.' }, { status: 503 });
  }

  let password;
  let journal;
  try {
    const raw = Buffer.from(await request.arrayBuffer());
    const squeezed = (request.headers.get('content-type') || '').includes('gzip');
    ({ password, journal } = JSON.parse((squeezed ? gunzipSync(raw, { maxOutputLength: UNFOLDED_MOST }) : raw).toString('utf8')));
  } catch {
    return NextResponse.json({ error: 'That journal couldn’t be read. Choose the file again.' }, { status: 400 });
  }

  const chosen = String(password || '');
  if (chosen.length < PASSWORD_FLOOR) {
    return NextResponse.json({ error: `At least ${PASSWORD_FLOOR} characters.` }, { status: 400 });
  }
  if (!Array.isArray(journal?.tables?.entries) || !journal.tables.settings?.length) {
    return NextResponse.json({ error: 'That file has no journal in it.' }, { status: 400 });
  }

  const backup = from_document(journal);
  const password_hash = await hashPassword(chosen);
  const address = addressFrom(request);

  // A session from BEGIN to COMMIT, on the direct endpoint for the
  // migrator's reason: the pooler can hand one transaction's statements to
  // different backends (library/migrator.js).
  const client = new Client(directDatabaseUrl());
  try {
    await client.connect();
    const planned = await plan_unpacking(client, backup, { leave: ['secrets'] });
    if (planned.refusals.length) {
      // The refusals are written for a terminal, which prints how to bring a
      // database up to date under them; here the first one is enough.
      return NextResponse.json(
        { error: `This copy can’t take that journal yet. ${planned.refusals[0].replace(' (below)', '')}` },
        { status: 409 },
      );
    }
    await unpack(client, planned, {
      within: async query => {
        // The journal is this copy's now: it is reached here, and it is set
        // up. The rest of the card came with it — the name, the founding
        // date and the serial are the journal's, not the copy's. The Board's
        // code goes: it was issued to the old address, and kept it would
        // tell this copy it is listed already, so the new address would
        // never be. Cleared, the journal lists itself here the first time
        // it is opened — if its keeper had it on the Board, which is theirs
        // to keep (findable is untouched).
        await query(
          'UPDATE settings SET site_address = $1, setup_complete = true, listing_code = NULL WHERE id = 1',
          [address],
        );
        await seal_claim(query, password_hash);
      },
    });
    const count = table => planned.plan.find(([t]) => t === table)?.[1].length ?? 0;
    return NextResponse.json({ ok: true, entries: count('entries'), people: count('people') });
  } catch (error) {
    return NextResponse.json(
      { error: `Your journal couldn’t be brought in, and nothing was changed. ${error?.message || ''}`.trim() },
      { status: 500 },
    );
  } finally {
    await client.end().catch(() => {});
  }
}
