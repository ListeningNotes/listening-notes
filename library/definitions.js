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
// The keys are fixed. Custom rating levels and custom relationship types are
// deliberately not a feature — a scale everyone can redefine is a scale nobody
// can compare across, and comparing is the point of two journals meeting.

export const DEFAULT_DEFINITIONS = {
  // ── the scale ──────────────────────────────────────────────────────────
  '5.0': {
    label: '5.0',
    body: 'A full-body yes. Complete and emotionally alive. Worth returning to willingly and often; even the rough edges feel necessary.',
  },
  '4.0': {
    label: '4.0',
    body: 'Strong and memorable. The core vision lands, even if a few moments don\u2019t. The highs are real. Earns repeat listens.',
  },
  '3.0': {
    label: '3.0',
    body: 'Interesting, but uneven. The ideas hold up better than the execution, or the experience better than the replay value. More compelling in theory than in feeling.',
  },
  '2.0': {
    label: '2.0',
    body: 'Respect more than attachment. Glad it exists, glad you heard it, not drawn back. Some good moments, but the immersion keeps breaking.',
  },
  '1.0': {
    label: '1.0',
    body: 'Not for you. Either uncomfortable to sit with or missing whatever it takes to stay engaged. This never means bad \u2014 only disconnected.',
  },
  half: {
    label: 'Half stars',
    body: 'When two ratings both feel true. Too strong to place lower, not quite enough to place higher. A decision to meet in the middle.',
  },

  // ── the two marks that are not scores ──────────────────────────────────
  masterpiece: {
    label: 'Masterpiece',
    body: 'An album with an entire five-star tracklist. Flawless.',
  },
  favorite: {
    label: 'Favorite',
    body: 'A track or album you reach for, separate from how you rated it. Plenty of five-star listens aren\u2019t favorites, and some favorites sit lower than expected.',
  },

  // ── how a listen happened ──────────────────────────────────────────────
  // First listen, Revisit and Study are on their way out as things anyone
  // picks — the listen number answers the first two and the third was barely
  // used. They stay defined because entries already carry those words, and a
  // reader looking at one of them still deserves to know what it meant.
  first_listen: {
    label: 'First listen',
    body: 'Front to back with intention for the first time. A few tracks may already be familiar; the album as a whole is not.',
  },
  revisit: {
    label: 'Revisit',
    body: 'An album you\u2019ve lived with before, returned to with fresh attention. Often a new setup, or a different frame of mind.',
  },
  formative: {
    label: 'Formative',
    body: 'An album that shaped how you listen, whenever you first found it. Usually one you\u2019ve spent years with.',
  },
  study: {
    label: 'Study',
    body: 'A listen rooted in history, influence, or research. The album matters culturally or technically, whether or not it\u2019s built for repeat play.',
  },
  submission: {
    label: 'Submission',
    body: 'An album someone sent you, listened to as a reply.',
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
