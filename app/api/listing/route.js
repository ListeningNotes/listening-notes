// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/listing/route.js
// Be findable — the keeper's switch, behind the wristband both ways.
//
// GET says whether this journal is listed. POST { listed } presses the switch,
// and pressing it is the only way this copy ever speaks to the directory:
// listing is a press and delisting is a press; nothing reports on its own
// (Miyel's directory instructions, 2026-10-07).
//
// On: ask the registry to list this journal. It issues a code; this journal
// stores it and serves it at /api/public/listing; asked again, the registry
// reads it back and keeps the row. Off: forget the code first, then ask the
// registry to delist with it — the registry takes the row only once the
// journal has forgotten it (app/api/directory/listings/route.js). Either
// way, when the registry does not answer, nothing here is left changed.

import { requireWristband } from '@/library/wristband';
import { pull_listing_code, save_listing_code, pull_settings } from '@/library/settings_actions';
import { ask_directory } from '@/library/outbox';
import { tidyJournal } from '@/library/return_address';

export async function GET(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  return Response.json({ listed: Boolean(await pull_listing_code()) });
}

export async function POST(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const body = await request.json().catch(() => ({}));
    const mine = tidyJournal((await pull_settings()).site_address);
    if (!mine) {
      return Response.json(
        { error: "This journal has no address set yet, so there is nothing to list. It's the first thing in Settings." },
        { status: 400 },
      );
    }

    if (body?.listed === true) {
      const first = await ask_directory('POST', { address: mine });
      if (!first.ok) return Response.json({ error: first.error }, { status: 502 });
      if (first.status === 201) return Response.json({ listed: true });
      if (!first.code) return Response.json({ error: 'The directory did not issue a code. Nothing changed.' }, { status: 502 });
      await save_listing_code(first.code);
      const second = await ask_directory('POST', { address: mine });
      if (!second.ok || second.status !== 201) {
        await save_listing_code(null);
        return Response.json(
          { error: second.error || "The directory could not see this journal's code, so it was not listed." },
          { status: 502 },
        );
      }
      return Response.json({ listed: true });
    }

    const had = await pull_listing_code();
    if (!had) return Response.json({ listed: false });
    await save_listing_code(null);
    const left = await ask_directory('DELETE', { address: mine, code: had });
    if (!left.ok) {
      // Still listed, so still saying so: the code goes back, and the switch
      // stays on with the reason beside it.
      await save_listing_code(had);
      return Response.json({ error: left.error }, { status: 502 });
    }
    return Response.json({ listed: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
