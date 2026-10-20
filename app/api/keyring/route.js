// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/keyring/route.js
// The keys to this journal, for its keeper: Settings → Your keys.
//
// All of it behind the wristband. GET lists the keys — which device, when
// it was added, when last used; never a key — with the spare key's state and
// where the password comes from. POST makes one: called without an answer it
// hands the device the options, called with the device's answer it keeps the
// key (library/keyring.js), and called with `spare` it makes a spare key and
// hands it back, the one time it is ever shown (library/secrets.js). DELETE
// takes a key off the ring, except the last way in: a journal with no
// password and no spare key keeps its only key, or nobody could open it.

import { NextResponse } from 'next/server';
import { requireWristband } from '@/library/wristband';
import { pull_keys, remove_key, begin_adding, finish_adding, spent } from '@/library/keyring';
import { passwordSource, spareKeyState, makeSpareKey } from '@/library/secrets';

const NO_STORE = { 'Cache-Control': 'no-store' };

export async function GET(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    return NextResponse.json({
      keys: await pull_keys(),
      spare: await spareKeyState(),
      password: await passwordSource(),
    }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: 'Your keys could not be read just now.' }, { status: 500, headers: NO_STORE });
  }
}

export async function POST(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    const body = await request.json().catch(() => ({}));
    if (body?.spare === true) {
      const code = await makeSpareKey();
      return NextResponse.json({ code, spare: await spareKeyState() }, { headers: NO_STORE });
    }
    if (!body?.response) {
      const { options, cookie } = await begin_adding(request);
      const response = NextResponse.json({ options }, { headers: NO_STORE });
      response.cookies.set(cookie.name, cookie.value, cookie.options);
      return response;
    }
    const done = await finish_adding(request, body.response, body.device);
    if (!done.ok) return NextResponse.json({ error: done.error }, { status: 400, headers: NO_STORE });
    const response = NextResponse.json({ ok: true, keys: await pull_keys() }, { headers: NO_STORE });
    const used = spent('add');
    response.cookies.set(used.name, used.value, used.options);
    return response;
  } catch {
    return NextResponse.json({ error: 'The key could not be added just now. Try again.' }, { status: 500, headers: NO_STORE });
  }
}

export async function DELETE(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    const id = Number(new URL(request.url).searchParams.get('id'));
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: 'Which key?' }, { status: 400 });
    const keys = await pull_keys();
    if (!keys.some(k => k.id === id)) return NextResponse.json({ keys }, { headers: NO_STORE });
    if (keys.length <= 1 && !(await passwordSource()) && !(await spareKeyState()).ready) {
      return NextResponse.json(
        { error: 'This is your only way in. Add another key, or a password, first.' },
        { status: 409, headers: NO_STORE },
      );
    }
    await remove_key(id);
    return NextResponse.json({ ok: true, keys: await pull_keys() }, { headers: NO_STORE });
  } catch {
    return NextResponse.json({ error: 'The key could not be removed just now.' }, { status: 500, headers: NO_STORE });
  }
}
