// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/printer/page.js
// The share printer's address, before there is a share printer.
//
// The press itself — the card, the QR, a cover as a plate — is built and
// parked on the branch `share-printer`. What ships now is the door to it: a
// printer glyph beside the pencil on an entry and on the card, and this page
// saying the thing is coming. The door goes in first so that when the press
// arrives it lands where people have already been pressing, rather than
// appearing somewhere new.
//
// `?entry=slug` is carried through from an entry's printer so the press can
// open on that record; the card's printer sends nobody, meaning the profile.
// Nothing reads it yet. Public: it is a sentence, and the buttons that reach
// it are only drawn for the keeper anyway.

import SiteNav from '../../components/main_components/SiteNav';

export const metadata = { title: 'Printer' };

export default function PrinterPage({ layered = false }) {
  return (
    <div className={'own-screen' + (layered ? ' own-screen--layered' : '')}>
      <SiteNav />
      <main className="pr-main">
        <div className="own-label">Share printer</div>
        <h1 className="pr-title">Coming soon.</h1>
        <p className="pr-note">
          This is where a record, or the card, becomes something you can hand
          to somebody — a picture, a card, a code. It is not built yet. For
          now, the address of an entry is the way to share it.
        </p>
      </main>
    </div>
  );
}
