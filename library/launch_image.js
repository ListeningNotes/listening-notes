// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// The launch image, 2026-11-25 (Miyel: "add the launch image").
//
// A journal saved to an iPhone's home screen shows a picture the instant its
// icon is tapped, before anything has loaded — and before the page can
// arrive at all, since the server reads the journal's details first and a
// sleeping database takes a few seconds to wake. The picture is the
// screensaver's ground with the LN. mark where the screensaver draws it
// (nav.css, .saver-mark), so the covers fill in around the mark as the page
// comes and it reads as one screen (HomeNav, the screensaver).
//
// An iPhone takes the picture only at its own screen's exact size, so there
// is one per size: the screen in points, and how many pixels to a point.
// app/layout.js names them all; app/launch-image/[size] draws each.

export const LAUNCH_SCREENS = [
  [440, 956, 3], [430, 932, 3], [428, 926, 3], [420, 912, 3], [414, 896, 3], [414, 896, 2],
  [402, 874, 3], [393, 852, 3], [390, 844, 3], [375, 812, 3], [375, 667, 2], [320, 568, 2],
];

export const launchName = ([w, h, r]) => `${w}x${h}x${r}`;

export function launchMedia([w, h, r]) {
  return `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${r}) and (orientation: portrait)`;
}

// Where the mark stands, in points from the top of the screen to the top of
// the mark: since 2026-11-27 the screensaver is also the profile and its mark
// is at the top (nav.css, .saver--profile .saver-mark) — 14 and its button's
// 10 of padding, under the status bar: about 47 on a phone with a notch or an
// island (taller than two to one), 20 on one with a home button.
export function markTop([w, h]) {
  return 14 + 10 + (h / w > 2 ? 47 : 20);
}
