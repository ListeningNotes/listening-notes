// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/@layer/(.)printer/page.js
// The printer, opened over whatever you were reading.
//
// Press the printer beside the pencil — on an entry or on the card — and this
// comes up from the foot of the screen on the same sheet the inbox and the
// send form arrive on. See app/@layer/(.)entries/[slug]/page.js for what the
// folder name means. Open /printer cold and app/printer/page.js answers.

import LayerEntry from '@/components/main_components/LayerEntry';
import PrinterPage from '../../printer/page';

export default function PrinterOverThePage() {
  return (
    <LayerEntry label="Printer" scrolls arrives="bottom">
      <PrinterPage layered />
    </LayerEntry>
  );
}
