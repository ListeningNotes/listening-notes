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

// Where the mark stands, in points from the foot of the screen to the foot of
// the mark: the screensaver's 44 and its button's 14 of padding, over the
// home bar's 34 on a phone with one (taller than two to one) and none on one
// with a home button.
export function markFoot([w, h]) {
  return 44 + 14 + (h / w > 2 ? 34 : 0);
}
