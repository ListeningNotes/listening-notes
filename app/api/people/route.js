// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// The address book, owner-only both ways: the list, and filing one more.
//
// The body of a POST carries an address and nothing else. The name is read
// off the journal itself, because that is where it is kept — and if the
// journal cannot be reached just now the address is filed without one, and
// the answer says so, rather than refusing to write down where somebody
// lives because they were out.

import { requireWristband } from '@/library/wristband';
import { pull_people, save_person, ask_journal_name } from '@/library/people_actions';
import { tidyJournal } from '@/library/return_address';
import { pull_settings } from '@/library/settings_actions';

export async function GET(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const people = await pull_people();
    return Response.json({ people });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const body = await request.json().catch(() => ({}));
    const address = tidyJournal(body?.address);
    if (!address) {
      return Response.json({ error: "That doesn't look like a web address." }, { status: 400 });
    }
    // A journal compared with itself is nothing, and a keeper in their own
    // address book is a row that can only confuse the feed.
    const own = tidyJournal((await pull_settings()).site_address);
    if (own && address === own) {
      return Response.json({ error: 'That is this journal.' }, { status: 400 });
    }
    const name = await ask_journal_name(address);
    const person = await save_person({ address, name });
    return Response.json({ person, reached: name !== null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
