// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// proxy.js
// Tells the layout which page it is rendering, and does nothing else.
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

import { NextResponse } from 'next/server';

export const PATH_HEADER = 'x-ln-path';

export function proxy(request) {
  const headers = new Headers(request.headers);
  headers.set(PATH_HEADER, request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  // Everything except Next's own assets and the files served straight from
  // /public. Matching those would cost a function invocation per image for a
  // header nothing reads.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-|apple-icon|.*\\.png$).*)'],
};
