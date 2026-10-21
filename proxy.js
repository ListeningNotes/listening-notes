// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// proxy.js
// Tells the layout which page it is rendering, and tells the browser which
// scripts it may run — and does nothing else.
//
// The filename is Next's. `middleware` was renamed to `proxy` in this version,
// which is the sort of thing AGENTS.md warns about — the docs are in
// node_modules/next/dist/docs/.../proxy.md.
//
// ── Why it exists at all ──────────────────────────────────────────────────
// A copy nobody has set up yet holds its whole site behind a plain page, and
// /setup has to stay reachable through that hold. Deciding it needs the path,
// and a server layout is not given one — so the path arrives as a header the
// layout can read, which is the mechanism the docs point at for passing
// anything from here into the app.
//
// ── Why it does no work ───────────────────────────────────────────────────
// This runs on every request, including ones a CDN would otherwise answer
// without waking anything. The docs say a proxy may be deployed to the edge
// and should not lean on shared modules or globals, and this repo has its own
// reason to keep it empty: a database read here would be a read per request,
// which is precisely the shape of the thing that spent the transfer allowance
// in the first place.
//
// So it reads nothing, writes nothing, and decides nothing. It copies the
// pathname into a header. The decision, and the one cached read behind it,
// belong to the layout.
//
// ── Which scripts may run, 2026-10-20 ─────────────────────────────────────
// Every page goes out with a content security policy (Miyel's pick, for the
// tricks nobody has thought of yet): a browser runs only the scripts this
// page was sent with, each stamped with a number made fresh for this one
// request, and the scripts those load. A script slipped onto a page some
// other way — through a bug, a pasted link, a word a keeper typed — is not
// stamped, and the browser refuses it. Next stamps its own scripts when it
// finds the number here; the layout stamps the one it writes itself. Still
// no read and no decision: a number from the platform's own random source
// and a header, which costs this request nothing it was not already spending.
//
// The rest of the policy says what a journal really loads, so nothing it
// needs is refused: its own files, album art and faces from anywhere over
// https, other journals' public routes over https, Apple's previews, and
// styles written inline (React writes them; a style cannot run anything).
// Nothing may frame a journal, so no other page can lay a button over one.
// The dev server, plain http over a home network, is allowed what it needs
// to reload itself and nothing more.

import { NextResponse } from 'next/server';

export const PATH_HEADER = 'x-ln-path';
// And the query, the same way, 2026-09-28. One reader: app/get/layout.js,
// which leaves the nav row out of /get when the link carries no gift, so the
// page can draw the mark in the middle with its two lines. Still no decision
// made here — the string is copied, the layout reads it.
export const SEARCH_HEADER = 'x-ln-search';

export const NONCE_HEADER = 'x-nonce';

function policy(nonce) {
  const dev = process.env.NODE_ENV === 'development';
  const plain = dev ? ' http:' : '';
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src 'self' data: blob: https:${plain}`,
    `media-src 'self' blob: https:${plain}`,
    "font-src 'self' data:",
    `connect-src 'self' https:${dev ? ' http: ws: wss:' : ''}`,
    "worker-src 'self' blob:",
    "frame-src 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "manifest-src 'self'",
    ...(dev ? [] : ['upgrade-insecure-requests']),
  ].join('; ');
}

export function proxy(request) {
  const headers = new Headers(request.headers);
  headers.set(PATH_HEADER, request.nextUrl.pathname);
  headers.set(SEARCH_HEADER, request.nextUrl.search);
  const nonce = btoa(crypto.randomUUID());
  const rule = policy(nonce);
  headers.set(NONCE_HEADER, nonce);
  headers.set('Content-Security-Policy', rule);
  const response = NextResponse.next({ request: { headers } });
  response.headers.set('Content-Security-Policy', rule);
  return response;
}

export const config = {
  // Everything except Next's own assets, the files served straight from
  // /public, and /api. Matching any of them would cost a function invocation
  // for a header nothing reads.
  //
  // /api came off the list on 2026-09-16, with the beacon's cost. A route
  // handler never draws the layout, so the one reader of this header is not
  // even called — holdTheDoor() in app/layout.js says as much itself, in the
  // line that returns early for /api/. The beacon is asked every fifteen
  // seconds by every open tab, so it was the busiest path on the site running
  // a function to hand an address to nobody.
  matcher: ['/((?!api/|_next/static|_next/image|favicon.ico|icon-|apple-icon|.*\\.png$).*)'],
};
