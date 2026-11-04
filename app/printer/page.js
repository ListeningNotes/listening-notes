// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/printer/page.js
// The share printer.
//
// The press for a record is a mode of the record's own page — press the
// printer glyph beside the pencil and the first screen becomes the flyer
// (FullPostPage.js, hooks/usePress.js). An old `?entry=` link lands there.
//
// This address prints the journal itself: the wall's line opens it, with what
// the wall is showing, and it is the keeper's alone — the room is
// JournalPlate.js. A visitor is sent to the card, which is what they came for;
// nothing here is theirs to print.
import { redirect } from 'next/navigation';
import SiteNav from '../../components/main_components/SiteNav';
import JournalPrinter from '../../components/main_components/JournalPlate';
import { wristbandOnHand } from '../../library/wristband';

export const metadata = { title: 'Printer' };

export default async function PrinterPage({ layered = false, searchParams }) {
  const query = searchParams ? await searchParams : {};
  const wanted = Array.isArray(query.entry) ? query.entry[0] : query.entry;
  const slug = typeof wanted === 'string' && wanted.trim() ? wanted.trim() : null;

  // A record's print is a mode of the record's own page now (2026-09-13);
  // an old link with ?entry= lands there.
  if (slug) redirect(`/entries/${encodeURIComponent(slug)}`);
  if (!(await wristbandOnHand())) redirect('/');

  return (
    <div className={'own-screen' + (layered ? ' own-screen--layered' : '')}>
      {!layered && <SiteNav />}
      <JournalPrinter layered={layered} />
    </div>
  );
}
