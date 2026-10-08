// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/listing/route.js
// On the Board — whether this journal is listed in the directory, behind the
// wristband both ways.
//
// ── On by default, 2026-10-08 ──────────────────────────────────────────────
// Miyel: "on by default for everyone." Every journal already serves a public
// journal and a public beacon, so the Board publishes nothing new; a keeper
// who does not want to be on it switches it off in Settings. So GET — which
// the keeper's own journal asks when it opens (HomeNav.js) — lists a journal
// that is on the Board and not yet listed: after setup, or the first time
// its keeper opens it after the update. Not on a timer and not in the
// background: only while the keeper is there, at most once every ten minutes
// from one server, and only ever its own address. That is the one exception
// the No phone-home rule makes (AGENTS, Never).
//
// POST { listed } is the switch in Settings. On: on the Board, and listed.
// Off: off the Board, the code forgotten, then delisted with it — the
// registry takes the row only once the journal has forgotten the code
// (app/api/directory/listings/route.js). A delisting the registry did not
// hear is asked again the next time the keeper opens the journal.

import { requireWristband } from '@/library/wristband';
import {
  pull_listing_code, save_listing_code, pull_findable, save_findable, pull_settings,
} from '@/library/settings_actions';
import { ask_directory } from '@/library/outbox';
import { tidyJournal } from '@/library/return_address';
import { DIRECTORY_URL } from '@/library/version';

// How long one server waits before asking the registry again on its own,
// when the last time did not end with the journal listed (or delisted).
const AGAIN_MS = 10 * 60 * 1000;
let triedAt = 0;

// Ask, serve the code, ask again. Returns { listed } or { error }.
async function listMe(mine) {
  const first = await ask_directory('POST', { address: mine });
  if (!first.ok) return { error: first.error };
  if (first.status === 201) return { listed: true };
  if (!first.code) return { error: 'The directory did not issue a code. Nothing changed.' };
  await save_listing_code(first.code);
  const second = await ask_directory('POST', { address: mine });
  if (!second.ok || second.status !== 201) {
    await save_listing_code(null);
    return { error: second.error || "The directory could not see this journal's code, so it was not listed." };
  }
  return { listed: true };
}

// Forget the code, then ask to be taken off with it. Returns { listed: false }
// or { error }, with the code put back when the registry did not hear.
async function delistMe(mine, had) {
  await save_listing_code(null);
  const left = await ask_directory('DELETE', { address: mine, code: had });
  if (!left.ok) {
    await save_listing_code(had);
    return { error: left.error };
  }
  return { listed: false };
}

export async function GET(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    const [code, findable] = await Promise.all([pull_listing_code(), pull_findable()]);
    const settled = findable ? Boolean(code) : !code;
    if (settled || !DIRECTORY_URL || Date.now() - triedAt < AGAIN_MS) {
      return Response.json({ listed: Boolean(code), findable });
    }
    const mine = tidyJournal((await pull_settings()).site_address);
    if (!mine) return Response.json({ listed: false, findable });
    triedAt = Date.now();
    const done = findable ? await listMe(mine) : await delistMe(mine, code);
    if (!done.error) triedAt = 0;
    return Response.json({ listed: done.error ? Boolean(code) : done.listed, findable });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const body = await request.json().catch(() => ({}));
    const on = body?.listed === true;
    await save_findable(on);
    const mine = tidyJournal((await pull_settings()).site_address);
    if (!mine) {
      return Response.json(
        { error: "This journal has no address set yet, so there is nothing to list. It's the first thing in Settings.", findable: on },
        { status: 400 },
      );
    }
    if (on) {
      const done = await listMe(mine);
      if (done.error) return Response.json({ error: done.error, findable: true }, { status: 502 });
      return Response.json({ listed: true, findable: true });
    }
    const had = await pull_listing_code();
    if (!had) return Response.json({ listed: false, findable: false });
    const done = await delistMe(mine, had);
    if (done.error) return Response.json({ error: done.error, findable: false }, { status: 502 });
    return Response.json({ listed: false, findable: false });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
