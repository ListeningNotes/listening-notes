// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// The journal's own details.
//
// GET is public because everything in here is: the name on the cover, the
// keeper, the portrait, the links. It is what a visitor already sees rendered,
// just in the form a program reads. Nothing secret lives in this table, and
// nothing secret should be added to it — secrets stay in environment variables.
//
// PATCH is not public, for the obvious reason.
//
// `hosted`, 2026-10-20: whether this journal lives on a deployment that hosts
// many (library/hosting_directory.js). There its address is the one the
// hosting directory gives it, so Settings draws no field to change it and a
// PATCH that names one leaves it as it is; and it is updated with each
// release, so Settings draws no updater.

import { requireWristband } from '@/library/wristband';
import { pull_settings, save_settings } from '@/library/settings_actions';
import { hosting } from '@/library/hosting_directory';

export async function GET() {
  const settings = await pull_settings();
  return Response.json({ settings, hosted: hosting() });
}

export async function PATCH(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const body = await request.json();
    if (hosting()) delete body.site_address;
    const settings = await save_settings(body);
    return Response.json({ settings });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
