// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/@layer/(.)dashboard/people/[id]/words/page.js
// All the words with one friend, opened over the journal — from a friend's
// page, or from Words on something they wrote under their face. It rises
// from the foot like the friend's page, and a pull down puts it away.
import LayerEntry from '@/components/main_components/LayerEntry';
import Words from '@/components/main_components/Words';

export default function WordsOverTheJournal() {
  return (
    <LayerEntry label="Words" scrolls arrives="bottom" over="spine">
      <Words layered />
    </LayerEntry>
  );
}
