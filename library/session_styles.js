// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// Shared style utilities for the session UI.
// Import these instead of redefining tx/bdr/lbl in every session component.

import { fonts } from './sitewide_visuals';

export const tx  = (a) => `rgba(255,255,255,${a})`;
export const bdr = (a) => `rgba(255,255,255,${a})`;
export const dk  = (a) => `rgba(15,12,10,${a})`;

export const lbl = {
  fontFamily: fonts.mono,
  fontSize: 10,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  color: tx(0.38),
};
