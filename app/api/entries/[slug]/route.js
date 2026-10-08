// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
import { pull_entry_by_slug, update_entry, delete_entry } from '@/library/database_actions';
import { checkWristband, requireWristband } from '@/library/wristband';

// ── Readable from another journal's Board, 2026-10-08 ─────────────────────
// The Board quotes a line of a keeper's own entry beside their record (Miyel:
// that is them on their journal, not somebody writing on yours), and reads
// it from here, from the reader's browser, so the line never passes through
// anybody else's server. So a GET may be read across origins. Without
// credentials, which `*` never carries: a read from anywhere else is always
// the public entry — the chain fields stay behind the keeper's own wristband.
// Writing (PATCH, DELETE) is not offered across origins.
const ACROSS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

export async function GET(request, { params }) {
  try {
    const { slug } = await params;
    const entry = await pull_entry_by_slug(slug, { includeChain: await checkWristband(request) });
    if (!entry) return Response.json({ error: 'Not found' }, { status: 404, headers: ACROSS });
    return Response.json({ entry }, { headers: ACROSS });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500, headers: ACROSS });
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: ACROSS });
}

export async function PATCH(request, { params }) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    const { slug } = await params;
    const body = await request.json();
    const { slug: _ignore, ...fields } = body;
    const entry = await update_entry(slug, fields);
    if (!entry) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json({ entry });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    const { slug } = await params;
    const result = await delete_entry(slug);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
