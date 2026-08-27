// SPDX-License-Identifier: AGPL-3.0-or-later
import { pull_all_entries, save_new_entry } from '@/library/database_actions';
import { checkWristband, requireWristband } from '@/library/wristband';

// The dashboard reads this list too, and its source picker needs the chain.
// Anyone else gets it stripped — see withoutChain in database_actions.
export async function GET(request) {
  try {
    const entries = await pull_all_entries({ includeChain: await checkWristband(request) });
    return Response.json({ entries });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    const body = await request.json();
    const entry = await save_new_entry(body);
    return Response.json({ entry });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
