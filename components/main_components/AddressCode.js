// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/AddressCode.js
// A plain code for an address, drawn in the browser. The card shows it where
// no portrait could be made into one, and an entry shows it where the server
// could not press its cover — a worse picture and a working one, so that
// something scannable always ships. It lived inside IdentityCard until the
// entry needed it too.

'use client';
import { useMemo } from 'react';
import QRCode from 'qrcode';
import { CODE_QUIET } from '../../library/code_shape';

// ── The code ──────────────────────────────────────────────────────────────
// A plain one. It carried the Ln. mark knocked out of the middle for a while,
// which is a nice object and the wrong one for this slot: the mark is already
// at the top of the column, printed larger, and a code has one job.
//
// Losing the mark changes the numbers underneath it. Version 10 at correction
// level H was not carrying the URL — an address this short needs a fraction of
// that — it was carrying the redundancy a hole punched in the middle costs. No
// hole, no need: the encoder picks the smallest version that fits at level M,
// which for an address of this length is a quarter as many modules across the
// same box. Each one ends up several times larger, and a larger module is the
// only thing that actually makes a code easier to read.
//
// Ink and paper stay fixed rather than theme-aware. A camera looks for dark on
// light, and inverting the code for a dark page asks every scanner in the world
// to be one of the ones that cope.
const CODE_INK = '#191917';
const CODE_PAPER = '#f5f4ef';

// Built once per address, at module scope. The two cards on the landing page —
// the desktop markup and the mobile markup — are separate trees asking for the
// same code, and an address only changes if its owner moves house.
const CODE_CACHE = new Map();

function buildCode(url) {
  if (CODE_CACHE.has(url)) return CODE_CACHE.get(url);
  let built = null;
  try {
    const { modules } = QRCode.create(url, { errorCorrectionLevel: 'M' });
    // Whole cells, no inset and no radius: neighbouring modules meet and read
    // as one block, which is what a scanner is looking at. One path rather than
    // a few hundred rects — same picture, one node.
    let d = '';
    for (let row = 0; row < modules.size; row++) {
      for (let col = 0; col < modules.size; col++) {
        if (modules.data[row * modules.size + col]) d += `M${col} ${row}h1v1h-1z`;
      }
    }
    built = { d, size: modules.size };
  } catch {
    // A card with no code on it is still a card; a card that throws while
    // rendering is a blank page.
    built = null;
  }
  CODE_CACHE.set(url, built);
  return built;
}

// The address, as the thing you point a phone at.
//
// Drawn by hand from the module matrix rather than handed to a hosted code
// service: a service would mean every journal running this software quietly
// telling a third party what its address is, every time somebody opened the
// card. The matrix is computed here and the picture is ours.
export default function AddressCode({ text, className = 'idc-qr' }) {
  const code = useMemo(() => buildCode(text), [text]);
  if (!code) return null;

  const span = code.size + CODE_QUIET * 2;
  return (
    <svg
      className={className}
      viewBox={`${-CODE_QUIET} ${-CODE_QUIET} ${span} ${span}`}
      shapeRendering="crispEdges"
      role="img"
      aria-label={`Scannable code for ${text}`}
    >
      {/* The quiet zone is part of the code, not padding around it — a scanner
          needs the clear margin to find the edges. Painting it here means the
          code carries its own margin wherever the box puts it. */}
      <rect x={-CODE_QUIET} y={-CODE_QUIET} width={span} height={span} fill={CODE_PAPER} />
      <path d={code.d} fill={CODE_INK} />
    </svg>
  );
}

