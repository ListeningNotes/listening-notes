// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/setup/route.js
// The one write that turns a built database into somebody's journal.
//
// Behind the wristband like every other write here. On an unclaimed copy the
// wristband is issued against the claim code rather than a password — see
// /api/auth/login — so the person making this call is the person who read the
// build log, which is the person who deployed it.
//
// It also refuses to run twice. Not for safety, since save_settings drops
// write-once fields on a second pass anyway, but for honesty: a second run
// would answer 200 having changed almost nothing, and a route that says yes
// while doing nothing is worse than one that says no.
//
// ── What it asks and what it works out ────────────────────────────────────
// Asked: the name, and the password. Everything else the old form asked for
// is derived here instead. The address is the host the request arrived on —
// nobody has bought a domain at install time, and the one they later buy is
// edited in Settings. The founding date is today: an editable date anyone can
// set to anything says nothing, and the only value it ever had was that it
// could not be moved afterwards.

import { NextResponse } from 'next/server';
import { requireWristband } from '@/library/wristband';
import { isSetUp, save_settings } from '@/library/settings_actions';
import { claim_journal } from '@/library/database_actions';
import { tidyAddress } from '@/library/return_address';
import { hashPassword, passwordSource, save_secrets } from '@/library/secrets';

// Eight is the floor. There is no strength meter — one password, chosen once,
// saved by a password manager the field is shaped for — but a floor keeps
// "1234" out.
const PASSWORD_FLOOR = 8;

// What the setup screen needs to know before it draws anything: whether the
// copy is already somebody's, and whether it already has a password from the
// environment. Public, and nothing in it is a secret — an unclaimed copy
// already says so on its holding page.
export async function GET() {
  try {
    const claimed = await isSetUp();
    const password = await passwordSource();
    return NextResponse.json({ claimed, has_password: Boolean(password) });
  } catch {
    // Cannot be answered: fail the same direction the hold does, and treat
    // the copy as claimed.
    return NextResponse.json({ claimed: true, has_password: true });
  }
}

export async function POST(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    if (await isSetUp()) {
      return NextResponse.json({ error: 'This journal is already set up.' }, { status: 409 });
    }

    const { keeper_name, password } = await request.json();

    // The keeper's name is the only thing asked for that anything depends on,
    // and even it is allowed to be blank — coverName() has a fallback and the
    // schema note says somebody may finish setup without naming themselves.
    const name = String(keeper_name || '').trim();

    // A password is required, even on a copy that has SESSION_PASSWORD in
    // its environment: under this flow nobody typed one at deploy, so there
    // is nothing to keep, and the one chosen here takes over.
    const chosen = String(password || '');
    if (chosen.length < PASSWORD_FLOOR) {
      return NextResponse.json({ error: `At least ${PASSWORD_FLOOR} characters.` }, { status: 400 });
    }

    // The owner row first, and separately, because it is the half with no
    // other writer. Every entry files against it through a COALESCE, and until
    // it exists the unique index on (user_id, slug) enforces nothing —
    // Postgres counts NULLs as distinct.
    await claim_journal(name);

    await save_settings({
      keeper_name: name,
      // The host this request arrived on, tidied the way every other address
      // on the site is. A local run has no address worth printing on a card,
      // so localhost is left blank rather than stored.
      site_address: addressFrom(request),
      founded_at: new Date().toISOString().slice(0, 10),
      // Minted rather than asked. WRITE_ONCE means this is the only chance the
      // copy will ever get, and nothing about it is the keeper's business —
      // it is the copy's identity, not theirs. Short enough to print on a card
      // one day, random rather than derived, because anything derived from a
      // name or a date is frozen wrong the moment either is corrected.
      serial: mintSerial(),
      setup_complete: true,
    });

    // The password, and the end of the claim code. Both in one write: from
    // here the code is not an answer to anything, and a stale one left in the
    // row would be a second key to a door that now has a real one.
    await save_secrets({
      password_hash: await hashPassword(chosen),
      claim_code: null,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'Setup failed' }, { status: 500 });
  }
}

// Where this copy is reached. Vercel and every proxy in front of it say so in
// x-forwarded-host; a bare `next start` says so in host.
function addressFrom(request) {
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host') || '';
  const bare = host.split(',')[0].trim();
  if (/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(bare)) return '';
  return tidyAddress(bare);
}

// Ten characters from an alphabet with no 0/O or 1/I/l in it, so it survives
// being read off a card and typed back in.
function mintSerial() {
  const alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, b => alphabet[b % alphabet.length]).join('');
}
