// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/directory/page.js
// The directory, on every copy — and nowhere on a copy that has none.
//
// One page, one behaviour, every copy (Miyel's directory instructions,
// 2026-10-07): it asks the registry DIRECTORY_URL names and draws what comes
// back. A fork that empties DIRECTORY_URL has no directory, so the page is
// not there at all rather than there and empty. The screen is Directory.js.

import { notFound } from 'next/navigation';
import { DIRECTORY_URL } from '@/library/version';
import Directory from './Directory';

export default function DirectoryPage() {
  if (!DIRECTORY_URL) notFound();
  return <Directory />;
}
