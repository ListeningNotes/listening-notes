// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
import { redirect } from 'next/navigation';
import { pull_all_entries } from '@/library/database_actions';

export const dynamic = 'force-dynamic';

export default async function ShufflePage() {
  const entries = await pull_all_entries();
  if (!entries.length) redirect('/');
  const random = entries[Math.floor(Math.random() * entries.length)];
  redirect(`/entries/${random.slug}`);
}
