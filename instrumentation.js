// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// instrumentation.js
// The one thing that happens before this copy takes any requests.
//
// The filename is Next's, not a choice: register() is called once when a
// server instance starts and has to finish before the first request is served.
// That is the only startup hook an app like this has, and bringing the
// database up to date is the only thing that genuinely belongs in one — a
// request should never reach a schema older than the code answering it.
//
// The runtime guard matters. This file is loaded in the Edge runtime as well,
// where there is no filesystem and no Postgres driver, so the import has to be
// inside the check rather than at the top. A static import would be resolved
// for Edge whether or not the branch ever runs.
//
// Failure is logged and swallowed. A copy whose migration fails should show
// its owner a broken site with a legible reason in the logs, not refuse to
// start with a stack trace nobody asked for — and the alternative, a server
// that will not boot, is the worse of the two failures when the person who has
// to fix it is also the person reading the homepage.

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const { bringUpToDate } = await import('./library/migrator.js');
  try {
    const { applied, skipped } = await bringUpToDate({
      log: message => console.log(`[migrations] ${message}`),
    });
    if (skipped) return;
    if (applied.length) console.log(`[migrations] applied ${applied.length}: ${applied.join(', ')}`);
    else console.log('[migrations] up to date');
  } catch (error) {
    console.error('[migrations] FAILED —', error?.message || error);
  }
}
