// SPDX-License-Identifier: AGPL-3.0-or-later
// The dashboard screensavers are drawn at desktop proportions: a 250px album
// card on a 1440px screen is a detail drifting behind the hub. The same 250px
// on a 375px phone is two thirds of the width — it stops reading as a
// background and starts competing with the cards in front of it.
//
// This returns the factor that keeps artwork at the share of the screen it
// holds on a desktop. Above the mobile breakpoint it is exactly 1, so nothing
// about the desktop rendering changes.
//
// Two ways to use it, depending on how a screensaver draws:
//
//   canvas — divide the canvas's pixel dimensions by the scale. The element
//   still fills the viewport (inset:0), so a bigger coordinate space means
//   everything inside it renders proportionally smaller, motion included, and
//   not a single drawing constant has to move.
//
//   DOM — multiply the size constants by the scale.
export const DESKTOP_REFERENCE = 1280;
export const MOBILE_BREAKPOINT = 768;

export function backgroundScale(width) {
  const w = width ?? (typeof window === 'undefined' ? DESKTOP_REFERENCE : window.innerWidth);
  if (w > MOBILE_BREAKPOINT) return 1;
  // The floor stops a very narrow window from shrinking the art to confetti.
  return Math.max(0.26, w / DESKTOP_REFERENCE);
}
