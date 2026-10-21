// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// ── Forwarding, 2026-10-20 ────────────────────────────────────────────────
// On a deployment that hosts journals, the front door's address used to be
// one journal's (library/hosting_directory.js, forwarding): Miyel's, at
// www.listeningnotes.blog until the front door took the domain. Its pages
// are sent on to where it lives now (FORWARDING_ADDRESS, her name), here at
// the edge, before anything runs, so a forward costs nothing:
//
//   www.      every page, at any path. Not /api, which the journal answers
//             there itself, because a report sent from a browser cannot
//             follow a forward.
//   the bare  everything the front door does not answer itself, which was
//   domain    the same journal's before the move; and its home, when the
//             link says the journal is what it wants — a visit from a copy
//             (?from=, ?as=) or an Add from another journal's beacon (?add=).
//
// Permanent, with the query carried along, so a link or a card's code that
// knew the old address learns the new one. Read when the site is built, so a
// change to either setting is a redeploy.
function forwards() {
  const tidy = value => String(value || '').trim().toLowerCase()
    .replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/\.$/, '');
  const domain = tidy(process.env.HOSTED_DOMAIN).replace(/:\d+$/, '');
  const to = tidy(process.env.FORWARDING_ADDRESS);
  if (!process.env.HOSTING_DIRECTORY_URL || !domain || !to) return [];
  // Plain http for a test on this machine, where the journals are
  // name.localhost (docs/OPERATIONS.md, The hosting directory).
  const there = `${/^([a-z0-9-]+\.)*localhost(:\d+)?$/.test(to) ? 'http' : 'https'}://${to}`;
  const at = host => ({ type: 'host', value: host.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') });
  const frontDoorAnswers = [
    'api/front-door(?:/|$)', 'get$', '_next/',
    'icon\\.png$', 'apple-icon\\.png$', 'manifest\\.webmanifest$', 'favicon\\.ico$',
  ];
  return [
    { source: '/:path((?!api(?:/|$)).*)', has: [at(`www.${domain}`)], destination: `${there}/:path`, permanent: true },
    { source: `/:path((?!${frontDoorAnswers.join('|')}).+)`, has: [at(domain)], destination: `${there}/:path`, permanent: true },
    ...['from', 'as', 'add'].map(key => ({
      source: '/', has: [at(domain), { type: 'query', key }], destination: `${there}/`, permanent: true,
    })),
  ];
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return forwards();
  },
  // Who is allowed to ask the dev server for dev-only things. Next blocks
  // every origin but localhost by default, and the block is quiet in the worst
  // way: the page still server-renders, so it looks like it loaded, and then
  // nothing on it works. No beacon, no entries, an empty card — which reads as
  // the site being broken rather than as a permission being refused.
  //
  // This was one hard-coded address, `192.168.1.154`, with a comment saying to
  // update it whenever the Mac's LAN IP changed. It changed — a different
  // house hands out 10.0.0.x — and the note only helps somebody who already
  // knows that is what went wrong.
  //
  // So: the private ranges a home router actually assigns, by wildcard, plus
  // any *.local name. Wildcards are supported (see
  // node_modules/next/dist/docs/.../allowedDevOrigins.md). This does not widen
  // what the setting protects against, which is a public web page reaching
  // into your dev server — such a page's origin is its own domain and matches
  // none of these. What it allows is you, on your own network.
  //
  // And 127.0.0.1, the same machine by number, 2026-10-07: the one way to see
  // your own journal signed out in the same browser (the wristband belongs to
  // localhost), and where a test's mock journals live. Without it the page
  // there never starts — no error, just a page that does not answer a press.
  //
  // And *.localhost, 2026-10-20: two test journals on one dev server, each at
  // its own address (one.localhost, two.localhost), the way a deployment that
  // hosts journals tells them apart (library/hosting_directory.js).
  allowedDevOrigins: ['127.0.0.1', '192.168.*.*', '10.*.*.*', '172.16.*.*', '*.local', '*.localhost'],
  // Dev-only route indicator badge (bottom-left "N") — never shows in
  // production, just noise while testing locally.
  devIndicators: false,
  // Required from node_modules at run time rather than bundled: sharp is a
  // native binary and does not survive being folded into a route handler.
  // Only the press behind /api/portrait/code asks for it.
  serverExternalPackages: ['sharp'],
  // The migration files, shipped beside /api/restore. A journal brought in
  // from a copy made before messages has its comments brought into the inbox
  // by two statements read out of migrations 027 and 028, so there is one
  // copy of them (library/unpacking.mjs) — and a file read at run time only
  // travels with a route when the route is told about it.
  //
  // And with every route since 2026-10-20: a deployment that hosts journals
  // brings each one up to date the first time it is opened, from whichever
  // route opens it (library/database_connection.js).
  outputFileTracingIncludes: {
    '/*': ['./migrations/*.sql'],
    '/**': ['./migrations/*.sql'],
  },
};

export default nextConfig;
