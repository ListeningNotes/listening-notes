// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/@layer/(.)dashboard/share/page.js
// The album exporter, opened over the desk — same door as the inbox, see
// app/@layer/(.)dashboard/inbox/page.js.

import LayerEntry from '@/components/main_components/LayerEntry';
import SharePage from '../../../dashboard/share/page';

export default function ShareOverTheDesk() {
  return (
    <LayerEntry label="Share" scrolls arrives="bottom">
      <SharePage layered />
    </LayerEntry>
  );
}
