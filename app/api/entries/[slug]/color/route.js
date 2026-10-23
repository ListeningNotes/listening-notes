// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/entries/[slug]/color/route.js
// One entry's cover color, for the wall's By color, read here only for a
// cover that a page is not allowed to read — one kept on Bandcamp or Discogs
// rather than Apple, which the browser's canvas refuses (Journal.js,
// askServerForColor). Miyel, 2026-10-22: her oldest records came over from
// Tumblr with covers Apple does not carry, and By color put them at the end.
//
// It reads the cover the entry has saved and nothing else: the address is
// looked up by the slug, never taken from the request, so this can only ever
// fetch an image this journal already shows. The reading is the browser's own
// (library/music_data_api.js, colorOfArt), on the same small square, so a
// cover read here sits where it would have if the page could read it.
//
// Public, like the cover's code beside it, because the cover already is, and
// counted on the same door: a reader asks for two or three of these a visit.
// Cached for a day; the wall puts the cover's address on the question, so a
// corrected cover is asked about afresh.

import sharp from 'sharp';
import { pull_entry_by_slug } from '@/library/database_actions';
import { COLOR_SIDE, colorOfArt, sizedAlbumArt } from '@/library/music_data_api';
import { mayKnock, tooSoon, whoIsKnocking } from '@/library/doorman';
import { answerNoJournal } from '@/library/hosting_directory';

export async function GET(request, { params }) {
  const knock = await mayKnock('cover', whoIsKnocking(request));
  if (!knock.allowed) return tooSoon(knock.retryAfter);

  const { slug } = await params;
  try {
    const entry = await pull_entry_by_slug(slug);
    const address = entry?.album_art_source || entry?.album_art;
    if (!address) return new Response('No cover', { status: 404 });

    const art = await fetch(sizedAlbumArt(address, 60), { signal: AbortSignal.timeout(8000) });
    if (!art.ok) return new Response('No cover', { status: 502 });
    const bytes = Buffer.from(await art.arrayBuffer());
    // Stretched to the square the way the browser draws it, with an alpha
    // channel so the bytes come in the canvas's order: red, green, blue, alpha.
    const pixels = await sharp(bytes)
      .rotate()
      .resize(COLOR_SIDE, COLOR_SIDE, { fit: 'fill' })
      .ensureAlpha()
      .raw()
      .toBuffer();

    return Response.json(colorOfArt(pixels), {
      headers: { 'Cache-Control': 'public, max-age=86400, s-maxage=86400' },
    });
  } catch (error) {
    const nowhere = answerNoJournal(error);
    if (nowhere) return nowhere;
    console.error('[cover color]', slug, error?.message || error);
    return new Response('No color', { status: 500 });
  }
}
