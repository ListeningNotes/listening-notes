// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/entries/[slug]/code/route.js
// The code for one entry's address, drawn out of its cover — what the art
// turns into when a reader taps it. Public, because an address travels
// freely: only the contents of a journal are the owner's. Pressed on request
// and never stored; see library/cover_code.js for why, and for the one small
// thing the row does keep.
//
// ?theme=dark asks for the dark page's file — the same picture with its ink
// flipped, the way /api/portrait?of=code serves the card's. Cached for a day
// in the browser and at the edge: long enough that a tap costs the press
// once, short enough that a re-pressed style reaches every copy without a
// new address for the picture. A corrected cover changes the address the
// page asks for (FullPostPage stamps the art onto it), so it is never a day
// stale.
//
// Rate-limited like the other doors anybody may knock on. A press is a
// quarter of a second of work and a fetch from Apple; a script asking for
// every entry's code at once is the only caller that ever needs more than a
// handful a minute, and it can wait.

import { pressCoverCode } from '@/library/cover_code';
import { mayKnock, tooSoon, whoIsKnocking } from '@/library/doorman';

export async function GET(request, { params }) {
  const knock = mayKnock('cover', whoIsKnocking(request));
  if (!knock.allowed) return tooSoon(knock.retryAfter);

  const { slug } = await params;
  const theme = new URL(request.url).searchParams.get('theme') === 'dark' ? 'dark' : 'light';
  try {
    const pressed = await pressCoverCode(slug, { theme });
    console.info('[cover code]', slug, pressed.report);
    if (!pressed.png) {
      return new Response('No code', { status: pressed.kind === 'missing' ? 404 : 503 });
    }
    return new Response(pressed.png, {
      headers: {
        'Content-Type': 'image/png',
        'Content-Length': String(pressed.png.length),
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error) {
    console.error('[cover code]', slug, error?.message || error);
    return new Response('No code', { status: 500 });
  }
}
