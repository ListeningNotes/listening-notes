// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/FolderDots.js
// The one piece of chrome a folder adds: a row of dots in the header.
//
// A record with more than one entry is a folder, and a folder opens to an
// entry and flips sideways for the rest (Miyel's brief, 2026-09-25). These
// say there is more here and where you are, and nothing else: one dot for
// each entry, oldest first, all the same size, the one you are on in ink.
// Pressing one goes to that page of the folder; so does a swipe (useFolder,
// in LayerEntry.js). Under them, the one line an entry in a folder carries:
// its month — "August 2025" — and no word for what kind of entry it is,
// because the page's own shape says that.
//
// `folder` is the record's entries, oldest first; `slug` the one on screen;
// `onPick` what useFolder hands back.

'use client';

export default function FolderDots({ folder, slug, onPick }) {
  const at = folder.findIndex(e => e.slug === slug);
  // Each entry's month, in the folder's order.
  const months = folder.map(e => (e.posted_at ? new Date(e.posted_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : ''));
  return (
    <div className={'fdots' + (folder.length > 10 ? ' fdots--many' : '')}>
      <div className="fdots-row" role="group" aria-label={`Entry ${at + 1} of ${folder.length}`}>
        {folder.map((e, i) => (
          <button
            key={e.slug}
            type="button"
            className={'fdots-dot' + (i === at ? ' fdots-dot--here' : '')}
            onClick={() => onPick?.(e)}
            aria-label={`${i + 1} of ${folder.length}${months[i] ? `, ${months[i]}` : ''}`}
            aria-current={i === at ? 'page' : undefined}
          />
        ))}
      </div>
      {at >= 0 && <span className="fdots-when">{months[at]}</span>}
    </div>
  );
}
