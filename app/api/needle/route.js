// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/needle/route.js
// Where a listen says what it is on.
//
// Behind the wristband, both ways. Only the keeper can say what the keeper is
// logging, or a stranger could light somebody else's beacon with a record
// they invented — the beacon is the one claim this journal makes about its
// owner in real time, and it should be worth as much as the writing is.
//
// The reading side is /api/public/beacon, which answers anybody. This route
// only writes.
import { set_needle, lift_needle } from '@/library/needle';
import { requireWristband } from '@/library/wristband';

// A record went on the desk, or the track turned. Called by the listen a
// couple of seconds after whatever happened, so a typed sentence is one
// request rather than one per keystroke — see hooks/useListeningSession.js.
export async function POST(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    const { album, artist, album_art, track } = await request.json();
    if (!album) return Response.json({ error: 'A record is needed' }, { status: 400 });
    await set_needle({
      album: String(album).slice(0, 300),
      artist: String(artist || '').slice(0, 300),
      album_art: String(album_art || '').slice(0, 1000),
      track: String(track || '').slice(0, 300),
    });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// The listen was saved, or the record came off the desk. A listen that simply
// stops — a closed tab, a locked phone — never reaches this, and the read
// expires it instead (library/needle.js).
export async function DELETE(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    await lift_needle();
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
