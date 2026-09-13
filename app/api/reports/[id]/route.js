// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// One report: read, or dismissed. Owner-only.

import { update_report_status } from '@/library/report_actions';
import { requireWristband } from '@/library/wristband';

export async function PATCH(request, { params }) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const { id } = await params;
    const { status } = await request.json();
    if (!['pending', 'read', 'dismissed'].includes(status)) {
      return Response.json({ error: 'Invalid status' }, { status: 400 });
    }
    const report = await update_report_status(id, status);
    if (!report) return Response.json({ error: 'Not found' }, { status: 404 });
    return Response.json({ report });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
