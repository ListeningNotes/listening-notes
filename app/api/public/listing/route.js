// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/public/listing/route.js
// The code this journal was issued by the directory, as plain text, or 404.
//
// This is how the registry proves an address belongs to whoever asked to be
// listed, and nothing else (Miyel's directory instructions, 2026-10-07): the
// keeper presses Be findable, the registry issues this journal a code, the
// journal serves it here, and the registry reads it back once and keeps the
// row only if it comes back. While the journal is not listed there is
// nothing here.
//
// Never cached: the registry has to read what is true this second.

import { pull_listing_code } from '@/library/settings_actions';

export async function GET() {
  const code = await pull_listing_code();
  if (!code) return new Response('Not listed.', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  return new Response(code, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
