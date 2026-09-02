// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/secrets/route.js
// The vault's one door, and it is owner-only in both directions.
//
// GET says what is set — where the password comes from, whether each key
// exists and its last four characters — and never a value. A key that has
// been typed in is not typed back out; the settings page shows a tail so two
// keys can be told apart and offers a field to replace it.
//
// PATCH takes new values. A blank clears the stored one, after which the
// environment variable, if any, is what the copy falls back to. The password
// is hashed here and the hash is all that is kept.

import { NextResponse } from 'next/server';
import { requireWristband } from '@/library/wristband';
import { describe_secrets, hashPassword, save_secrets } from '@/library/secrets';

const PASSWORD_FLOOR = 8;

export async function GET(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  return NextResponse.json(await describe_secrets());
}

export async function PATCH(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const patch = {};
    if ('lastfm_key' in body) patch.lastfm_key = String(body.lastfm_key || '').trim();
    if ('anthropic_key' in body) patch.anthropic_key = String(body.anthropic_key || '').trim();
    if ('password' in body) {
      const chosen = String(body.password || '');
      if (chosen.length < PASSWORD_FLOOR) {
        return NextResponse.json({ error: `At least ${PASSWORD_FLOOR} characters.` }, { status: 400 });
      }
      patch.password_hash = await hashPassword(chosen);
    }
    await save_secrets(patch);
    return NextResponse.json(await describe_secrets());
  } catch (error) {
    return NextResponse.json({ error: error?.message || 'That did not save.' }, { status: 500 });
  }
}
