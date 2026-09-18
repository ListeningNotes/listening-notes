// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/definitions.js
// What the marks mean, in words that install.
//
// These used to sit in app/about/page.js written in the first person, which
// made them one journal's opinions hardcoded into everyone's software. They
// ship in the second person instead, so a fresh copy reads as an explanation
// of the scale rather than as somebody else's diary.
//
// Every one is editable. The owner can rewrite any label or body from their
// settings and their version is stored; anything they leave alone is not
// stored at all and keeps falling back to what is written here. A copy that
// never touches them holds nothing in its database.
//
// The keys are fixed. Custom marks are deliberately not a feature — a
// vocabulary everyone can redefine is a vocabulary nobody can compare across,
// and comparing is the point of two journals meeting.
//
// ── Three, from 2026-09-17 ────────────────────────────────────────────────
// It held the whole rating scale as well: a paragraph each for 5.0 down to
// 1.0 and one for half stars. They went on Miyel's call, and the reason is
// that stars are ubiquitous — "I should assume that". A paragraph explaining
// what four stars means is a site explaining something its reader learned
// somewhere else years ago, and it buried the three that genuinely need it.
//
// First listen, Revisit and Study went at the same time. They were values of
// `relationship`, and that column is dropped — the note here claiming entries
// still carried those words had outlived the data by months.
//
// What is left is the three marks this site invented the meaning of, and
// Masterpiece is the one that most needs saying, now that nobody sets it by
// hand (DECISIONS, 2026-09-17).

export const DEFAULT_DEFINITIONS = {
  // ── the three marks ────────────────────────────────────────────────────
  masterpiece: {
    label: 'Masterpiece',
    body: 'An album with an entire five-star tracklist. Flawless.',
  },
  favorite: {
    label: 'Favorite',
    body: 'A track or album you reach for, separate from how you rated it. Plenty of five-star listens aren\u2019t favorites, and some favorites sit lower than expected.',
  },

  formative: {
    label: 'Formative',
    body: 'An album that shaped how you listen, whenever you first found it. Usually one you\u2019ve spent years with.',
  },
};

// Folds whatever the owner has stored over the shipped text, one key at a
// time. Per key rather than a whole-object spread, so someone who rewrote a
// label but not its body keeps the shipped body instead of losing it.
//
// Only known keys come out. A stored key that is not in the defaults is
// ignored rather than rendered, so old data from a previous shape of this
// file cannot put a stray row on the page.
export function mergeDefinitions(stored) {
  const out = {};
  for (const [key, shipped] of Object.entries(DEFAULT_DEFINITIONS)) {
    out[key] = { ...shipped, ...(stored?.[key] || {}) };
  }
  return out;
}
