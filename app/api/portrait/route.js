// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/portrait/route.js
// The keeper's picture: in, out, and away again.
//
// There is no storage bucket anywhere in this software and adding one would
// tie every copy of it to whoever's bucket it was. A copy already has a
// database, so the picture lives there — base64 in a column, handed back by
// this route with the right content type. One portrait, downscaled in the
// browser before it is sent, is on the order of a hundred kilobytes; that is
// a reasonable thing to keep in a row and an unreasonable thing to build an
// account with a third party for.
//
// The bytes never touch the page. settings.portrait_url holds the short path
// to this route and the layout hands that to every page; the column holding
// the actual image is not on the allow-list, so a portrait cannot end up
// inlined into the HTML of the archive.

import database from '@/library/database_connection';
import { requireWristband } from '@/library/wristband';
import { pull_settings, save_settings } from '@/library/settings_actions';

// Generous for a downscaled photograph and mean enough that this cannot be
// used to push a film into the settings table. The browser aims at roughly a
// tenth of it; anything near this ceiling did not go through the resizer.
const MAX_BYTES = 2 * 1024 * 1024;

const ALLOWED = new Set(['image/jpeg', 'image/png', 'image/webp']);

// GET is public, because the picture is: it is the face on the front of a
// journal anybody can read. Cached hard and busted by the ?v= the writer puts
// on the URL, so a portrait is fetched once and a new one is fetched at once.
export async function GET(request) {
  // ?of=code asks for the portrait rendered as the journal's QR code rather
  // than the photograph itself. Same row, same caching, one route — they are
  // the same picture twice and they change at the same moment.
  const wantsCode = new URL(request.url).searchParams.get('of') === 'code';
  try {
    const [row] = await database`
      SELECT portrait_data, portrait_mime, portrait_code FROM settings WHERE id = 1`;

    const stored = wantsCode ? row?.portrait_code : row?.portrait_data;
    if (!stored) return new Response('No portrait', { status: 404 });

    const bytes = Buffer.from(stored, 'base64');
    return new Response(bytes, {
      headers: {
        'Content-Type': wantsCode ? 'image/png' : (row.portrait_mime || 'image/jpeg'),
        'Content-Length': String(bytes.length),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('No portrait', { status: 404 });
  }
}

export async function POST(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const { data, mime } = await request.json();

    if (typeof data !== 'string' || !data) {
      return Response.json({ error: 'No image sent.' }, { status: 400 });
    }
    if (!ALLOWED.has(mime)) {
      return Response.json({ error: 'That is not an image this can hold.' }, { status: 415 });
    }
    // Base64 runs about a third longer than the bytes it stands for, so the
    // ceiling is checked against what will actually be stored.
    if (Math.ceil((data.length * 3) / 4) > MAX_BYTES) {
      return Response.json({ error: 'That picture is too large.' }, { status: 413 });
    }

    // The path is stamped rather than fixed. It is the same URL every time
    // otherwise, and a reader who has already cached one portrait would go on
    // seeing it after its owner changed it — the response above is cached for
    // a year precisely so that this is the only thing that can change it.
    const portrait_url = `/api/portrait?v=${Date.now()}`;
    await save_settings({ portrait_data: data, portrait_mime: mime, portrait_url });

    return Response.json({ portrait_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

// Taking the picture down. Clears the bytes and the pointer together: leaving
// the pointer behind would mean a card asking this route for an image it has
// just thrown away, which is a broken picture rather than an empty frame.
export async function DELETE(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const current = await pull_settings();
    // Only clear the pointer if it is pointing here. Somebody who uploaded a
    // photograph and then pasted a link to a different one should keep the
    // link when they clear the upload.
    // The code is made out of the photograph, so it goes when the photograph
    // goes — a code built from a face nobody can see any more is a picture of
    // nothing that still scans.
    const patch = { portrait_data: '', portrait_mime: '', portrait_code: '', portrait_code_url: '' };
    if ((current.portrait_url || '').startsWith('/api/portrait')) patch.portrait_url = '';
    await save_settings(patch);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
