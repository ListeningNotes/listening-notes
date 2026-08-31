// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
import { redirect } from 'next/navigation';
import { pull_random_slug } from '@/library/database_actions';

export const dynamic = 'force-dynamic';

export default async function ShufflePage() {
  // Was: read the entire journal, then pick one at random in JS — 330 kB
  // across the wire on a 39-entry journal, and growing, to produce a single
  // slug. The database can pick one.
  const slug = await pull_random_slug();
  if (!slug) redirect('/');
  redirect(`/entries/${slug}`);
}
