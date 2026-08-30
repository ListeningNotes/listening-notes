// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
export const colors_light = {
  background:     '#f5f3ee',
  background_warm:'#efebe2',
  panel:          'rgba(255, 255, 255, 0.55)',
  panel_solid:    '#ffffff',
  panel_border:   'rgba(255, 255, 255, 0.6)',
  text:           '#1a1a1a',
  text_soft:      '#6b6b6b',
  text_faint:     '#a8a8a8',
  accent:         '#b5b2ab',
  border:         'rgba(26, 26, 26, 0.08)',
  gold:           '#E8B84B',
  fav:            '#f0484f',
  mp:             '#4a9bf0',
  // The third flag. --formative has been in globals.css all along; it was
  // never mirrored here, so every JS-drawn mark could reach two of the three.
  formative:      '#3fa96b',
  shadow_soft:    '0 2px 12px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.04)',
  shadow_lift:    '0 4px 20px rgba(0,0,0,0.06), 0 16px 48px rgba(0,0,0,0.06)',
};

export const colors_dark = {
  background:     '#0e0e0e',
  background_warm:'#161616',
  panel:          'rgba(20, 20, 20, 0.55)',
  panel_solid:    '#161616',
  panel_border:   'rgba(255, 255, 255, 0.08)',
  text:           '#e8e4dc',
  text_soft:      '#888888',
  text_faint:     '#555555',
  accent:         '#b5b2ab',
  border:         'rgba(255, 255, 255, 0.08)',
  gold:           '#E8B84B',
  fav:            '#f0484f',
  mp:             '#4a9bf0',
  formative:      '#3fa96b',
  shadow_soft:    '0 2px 12px rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.2)',
  shadow_lift:    '0 4px 20px rgba(0,0,0,0.4), 0 16px 48px rgba(0,0,0,0.3)',
};

// Backwards-compatible alias — light is the primary identity of the site.
export const colors = colors_light;

export const fonts = {
  serif:  "'Nunito', sans-serif",
  mono:   "'Nunito', sans-serif",
  sans:   "'Nunito', sans-serif",
  museo:  "'Nunito', sans-serif",
};
