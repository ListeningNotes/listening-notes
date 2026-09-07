// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/@layer/(.)settings/page.js
// Settings, opened over the desk.
//
// The Settings door on the desk and the Sign in line on the pitch pane both
// go to /settings, which used to be a full navigation away from the cross —
// and once there, the only way back was the browser. It comes up from the
// foot of the screen now on the same sheet the inbox and the printer use,
// with the same pull down, Escape and back button. Signed out, what rises is
// the password gate, which is what /settings is when nobody is wearing a
// wristband. See app/@layer/(.)entries/[slug]/page.js for the folder name;
// open /settings cold and app/settings/page.js answers.

import LayerEntry from '@/components/main_components/LayerEntry';
import SettingsPage from '../../settings/page';

export default function SettingsOverTheDesk() {
  return (
    <LayerEntry label="Settings" scrolls arrives="bottom">
      <SettingsPage layered />
    </LayerEntry>
  );
}
