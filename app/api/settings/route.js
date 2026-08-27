// SPDX-License-Identifier: AGPL-3.0-or-later
// The journal's own details.
//
// GET is public because everything in here is: the name on the cover, the
// keeper, the portrait, the links. It is what a visitor already sees rendered,
// just in the form a program reads. Nothing secret lives in this table, and
// nothing secret should be added to it — secrets stay in environment variables.
//
// PATCH is not public, for the obvious reason.

import { requireWristband } from '@/library/wristband';
import { pull_settings, save_settings } from '@/library/settings_actions';

export async function GET() {
  const settings = await pull_settings();
  return Response.json({ settings });
}

export async function PATCH(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    const settings = await save_settings(body);
    return Response.json({ settings });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
