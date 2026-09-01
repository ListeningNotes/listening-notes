// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/setup/route.js
// The one write that turns a built database into somebody's journal.
//
// Behind the wristband like every other write here. The gate on the page is a
// client-side fetch of /api/auth/check, which is the pattern the whole desk
// uses and is decorative on its own — what makes it real is this line.
//
// It also refuses to run twice. Not for safety, since save_settings drops
// write-once fields on a second pass anyway, but for honesty: a second run
// would answer 200 having changed almost nothing, and a route that says yes
// while doing nothing is worse than one that says no.

import { NextResponse } from 'next/server';
import { requireWristband } from '@/library/wristband';
import { isSetUp, save_settings } from '@/library/settings_actions';
import { claim_journal } from '@/library/database_actions';
import { tidyAddress } from '@/library/return_address';

export async function POST(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    if (await isSetUp()) {
      return NextResponse.json({ error: 'This journal is already set up.' }, { status: 409 });
    }

    const { keeper_name, site_address, lastfm_user, founded_at } = await request.json();

    // The keeper's name is the only thing asked for that anything depends on,
    // and even it is allowed to be blank — coverName() has a fallback and the
    // schema note says somebody may finish setup without naming themselves.
    const name = String(keeper_name || '').trim();

    // The owner row first, and separately, because it is the half with no
    // other writer. Every entry files against it through a COALESCE, and until
    // it exists the unique index on (user_id, slug) enforces nothing —
    // Postgres counts NULLs as distinct.
    await claim_journal(name);

    await save_settings({
      keeper_name: name,
      // tidyAddress rather than a hand-rolled strip, which is what the first
      // version was and which forgot to lowercase — so an address typed with
      // capitals was stored with them. Every other address on the site goes
      // through this one function for exactly that reason.
      site_address: tidyAddress(site_address),
      lastfm_user: String(lastfm_user || '').trim(),
      founded_at: String(founded_at || '').trim(),
      // Minted rather than asked. WRITE_ONCE means this is the only chance the
      // copy will ever get, and nothing about it is the keeper's business —
      // it is the copy's identity, not theirs. Short enough to print on a card
      // one day, random rather than derived, because anything derived from a
      // name or a date is frozen wrong the moment either is corrected.
      serial: mintSerial(),
      setup_complete: true,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Setup failed' }, { status: 500 });
  }
}

// Ten characters from an alphabet with no 0/O or 1/I/l in it, so it survives
// being read off a card and typed back in.
function mintSerial() {
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
}
