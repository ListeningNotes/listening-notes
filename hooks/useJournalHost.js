// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// hooks/useJournalHost.js
// The address this journal is being read at, for filing a password under.
//
// A password manager keys an entry on a username and a password; with no
// username there is nothing to name the entry, so it stays quiet. There is
// no username here — one owner, one password — so every screen that asks for
// or sets the password carries a hidden username field, and this is its
// value. The host rather than the keeper's name, because the name may not be
// set yet on the setup screen and can change afterwards, while the address
// is the same on the day the password is chosen and the day it is typed
// again. The same value on all three screens is what makes the entry saved
// at setup the one offered at login.
//
// Read through useSyncExternalStore so the server renders an empty value and
// the client fills it in without a second render or a hydration mismatch.

'use client';

import { useSyncExternalStore } from 'react';

const noop = () => () => {};
const read = () => window.location.host;
const onServer = () => '';

export function useJournalHost() {
  return useSyncExternalStore(noop, read, onServer);
}
