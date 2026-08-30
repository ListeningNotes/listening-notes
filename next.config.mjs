// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
/** @type {import('next').NextConfig} */
const nextConfig = {
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
  allowedDevOrigins: ['192.168.*.*', '10.*.*.*', '172.16.*.*', '*.local'],
  // Dev-only route indicator badge (bottom-left "N") — never shows in
  // production, just noise while testing locally.
  devIndicators: false,
};

export default nextConfig;
