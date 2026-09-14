// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/printer/page.js
// The share printer.
//
// The press for a record is a mode of the record's own page — press the
// printer glyph beside the pencil and the first screen becomes the flyer
// (FullPostPage.js, hooks/usePress.js). This address is what the card's
// door opens, and what an old `?entry=` link lands on before being sent to
// the record.
//
import { redirect } from 'next/navigation';
import SiteNav from '../../components/main_components/SiteNav';

export const metadata = { title: 'Printer' };

export default async function PrinterPage({ layered = false, searchParams }) {
  const query = searchParams ? await searchParams : {};
  const wanted = Array.isArray(query.entry) ? query.entry[0] : query.entry;
  const slug = typeof wanted === 'string' && wanted.trim() ? wanted.trim() : null;

  // A record's print is a mode of the record's own page now (2026-09-13);
  // an old link with ?entry= lands there.
  if (slug) redirect(`/entries/${encodeURIComponent(slug)}`);

  return (
    <div className={'own-screen' + (layered ? ' own-screen--layered' : '')}>
      <SiteNav />
      <main className="pr-main">
        <div className="own-label">Share printer</div>
        <h1 className="pr-title">Coming soon.</h1>
      </main>
    </div>
  );
}
