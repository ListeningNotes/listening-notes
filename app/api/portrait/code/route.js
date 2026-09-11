// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/portrait/code/route.js
// The press: make the journal's code out of the portrait on the row, prove
// it, and keep it. Owner-only, and it takes no body — everything it needs is
// already stored: the photograph, where the card frames it, and the address.
//
// Asked for by the card's editor after a save (the framing or the address
// may have moved), by setup after the photo, by Settings after the address,
// and by the card itself when the owner opens a journal that has a portrait
// and no code yet. It used to happen in the owner's browser, which meant the
// check depended on which phone the owner had; library/portrait_code.js has
// what that cost.

import { requireWristband } from '@/library/wristband';
import { pressStoredPortraitCode } from '@/library/portrait_code';

export async function POST(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    const pressed = await pressStoredPortraitCode();
    return Response.json(pressed);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
