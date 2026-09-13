// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/@layer/(.)dashboard/report/page.js
// Report a problem, opened over the desk — the same sheet the inbox and the
// address book arrive on, so writing one never feels like leaving.

import LayerEntry from '@/components/main_components/LayerEntry';
import ReportPage from '../../../dashboard/report/page';

export default function ReportOverTheDesk() {
  return (
    <LayerEntry label="Report a problem" scrolls arrives="bottom">
      <ReportPage layered />
    </LayerEntry>
  );
}
