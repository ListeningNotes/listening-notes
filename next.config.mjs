// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Lets the dev server's hot-reload connection work when opened from a phone
  // or another computer on the LAN via this Mac's IP, not just localhost.
  // Next.js blocks it by default; update this if the Mac's LAN IP changes.
  allowedDevOrigins: ['192.168.1.154'],
  // Dev-only route indicator badge (bottom-left "N") — never shows in
  // production, just noise while testing locally.
  devIndicators: false,
};

export default nextConfig;
