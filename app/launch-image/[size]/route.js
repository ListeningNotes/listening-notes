// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/launch-image/[size]/route.js
// The launch image at one iPhone's size (library/launch_image.js): the
// screensaver's ground and the LN. mark, white, where the screensaver draws
// it. Drawn once, when the site is built, and the same for every journal.

import { ImageResponse } from 'next/og';
import { LAUNCH_SCREENS, launchName, markTop } from '@/library/launch_image';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return LAUNCH_SCREENS.map(screen => ({ size: launchName(screen) }));
}

// The mark's two letters, as HomeNav draws them (mark), and its dot.
const LETTERS = [
  { transform: 'translate(73.734177, 220.794814)', d: 'M 44.65625 0 C 37.46875 0 31.160156 -1.601562 25.734375 -4.8125 C 20.304688 -8.019531 16.097656 -12.28125 13.109375 -17.59375 C 10.128906 -22.90625 8.640625 -28.773438 8.640625 -35.203125 L 8.640625 -116.21875 L 36.53125 -116.21875 L 36.53125 -33.203125 C 36.53125 -30.546875 37.46875 -28.222656 39.34375 -26.234375 C 41.226562 -24.242188 43.550781 -23.25 46.3125 -23.25 L 77.03125 -23.25 L 77.03125 0 Z M 44.65625 0 ' },
  { transform: 'translate(153.915942, 220.794814)', d: 'M 91.96875 2 C 85 2 78.742188 0.476562 73.203125 -2.5625 C 67.671875 -5.613281 63.300781 -9.847656 60.09375 -15.265625 C 56.882812 -20.691406 55.28125 -26.835938 55.28125 -33.703125 L 55.28125 -84.5 C 55.28125 -86.269531 54.835938 -87.875 53.953125 -89.3125 C 53.066406 -90.75 51.90625 -91.910156 50.46875 -92.796875 C 49.03125 -93.679688 47.425781 -94.125 45.65625 -94.125 C 43.882812 -94.125 42.28125 -93.679688 40.84375 -92.796875 C 39.40625 -91.910156 38.269531 -90.75 37.4375 -89.3125 C 36.601562 -87.875 36.1875 -86.269531 36.1875 -84.5 L 36.1875 0 L 8.96875 0 L 8.96875 -82.515625 C 8.96875 -89.484375 10.539062 -95.625 13.6875 -100.9375 C 16.84375 -106.25 21.21875 -110.453125 26.8125 -113.546875 C 32.40625 -116.648438 38.6875 -118.203125 45.65625 -118.203125 C 52.738281 -118.203125 59.046875 -116.648438 64.578125 -113.546875 C 70.109375 -110.453125 74.476562 -106.25 77.6875 -100.9375 C 80.90625 -95.625 82.515625 -89.484375 82.515625 -82.515625 L 82.515625 -31.703125 C 82.515625 -29.929688 82.957031 -28.300781 83.84375 -26.8125 C 84.726562 -25.320312 85.859375 -24.160156 87.234375 -23.328125 C 88.617188 -22.492188 90.144531 -22.078125 91.8125 -22.078125 C 93.582031 -22.078125 95.210938 -22.492188 96.703125 -23.328125 C 98.203125 -24.160156 99.394531 -25.320312 100.28125 -26.8125 C 101.164062 -28.300781 101.609375 -29.929688 101.609375 -31.703125 L 101.609375 -116.21875 L 128.65625 -116.21875 L 128.65625 -33.703125 C 128.65625 -26.835938 127.050781 -20.691406 123.84375 -15.265625 C 120.632812 -9.847656 116.265625 -5.613281 110.734375 -2.5625 C 105.203125 0.476562 98.945312 2 91.96875 2 Z M 91.96875 2 ' },
];

export async function GET(request, { params }) {
  const { size } = await params;
  const screen = LAUNCH_SCREENS.find(s => launchName(s) === size);
  if (!screen) return new Response('Not found', { status: 404 });
  const [w, h, r] = screen;
  // The mark is 22 points tall on the profile (nav.css, .saver--profile .saver-mark-svg).
  const tall = 22 * r, wide = Math.round(tall * 241 / 140);
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#16140f', position: 'relative' }}>
        <svg
          viewBox="76 96 241 140"
          width={wide}
          height={tall}
          style={{ position: 'absolute', left: (w * r - wide) / 2, top: markTop(screen) * r }}
        >
          {LETTERS.map(l => <path key={l.transform} transform={l.transform} d={l.d} fill="#ffffff" />)}
          <circle cx="297.0547" cy="216.71875" r="14.1328" fill="#ffffff" />
        </svg>
      </div>
    ),
    { width: w * r, height: h * r },
  );
}
