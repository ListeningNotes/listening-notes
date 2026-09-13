// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/printer/page.js
// The share printer.
//
// The press itself is components/main_components/SharePrinter.js: paper
// sizes, the looks you turn through, Save and Send. What it prints arrives as
// a plate, and the first plate is the record — EntryPlate.js — because an
// entry is the thing people share constantly and a card the thing they share
// once. `?entry=slug` is what the printer glyph beside the pencil sends, so
// the press opens on the record that was being read.
//
// ── Who gets the press ────────────────────────────────────────────────────
// The keeper, decided here before anything is drawn (DECISIONS: the printer
// makes an artifact out of the owner's writing — owner-only, server-checked).
// The doors that reach this page are only drawn for the keeper anyway; for
// anyone else, and for a record that does not exist, the page is the sentence
// it was before the press landed. The card's own plate is still to come, so
// the card's door — which sends nobody — gets the sentence too.
//
// ── Two ways in, one page ─────────────────────────────────────────────────
// Pressed from an entry, this rises on the layer sheet (app/@layer/(.)printer)
// and the press renders in place so it rises with the sheet. Opened cold at
// /printer it is the page itself and the press portals onto the body as it
// always did. `layered` is the only difference.

import { pull_entry_by_slug } from '@/library/database_actions';
import { pull_settings } from '@/library/settings_actions';
import { wristbandOnHand } from '@/library/wristband';
import { entryAddress } from '@/library/cover_code';
import SiteNav from '../../components/main_components/SiteNav';
import EntryPlate from '../../components/main_components/EntryPlate';

export const metadata = { title: 'Printer' };

export default async function PrinterPage({ layered = false, searchParams }) {
  const query = searchParams ? await searchParams : {};
  const wanted = Array.isArray(query.entry) ? query.entry[0] : query.entry;
  const slug = typeof wanted === 'string' && wanted.trim() ? wanted.trim() : null;

  if (slug && await wristbandOnHand()) {
    const [entry, settings] = await Promise.all([pull_entry_by_slug(slug), pull_settings()]);
    if (entry) {
      return (
        <EntryPlate
          entry={entry}
          keeper={(settings?.keeper_name || '').trim()}
          address={entryAddress(settings?.site_address, slug)}
          layered={layered}
        />
      );
    }
  }

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
