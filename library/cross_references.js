// SPDX-License-Identifier: AGPL-3.0-or-later
// library/cross_references.js
// Turns a mention of something already in the archive into a link to it.
//
// The whole point is that this runs at display time, not at write time. The
// notes stay exactly as they were typed, and the matching happens fresh on
// every render — so an album mentioned in a 2024 review and logged tomorrow
// lights up in that old review the moment it exists, with nothing rewritten.
// Nothing is ever guessed: if it isn't in the archive, it stays plain text.
//
// Two ways a link happens:
//   [[Mk.gee]] or [[Blonde|that record]]  — explicit, always wins
//   a bare mention matching an indexed name — automatic
//
// See buildReferenceIndex for what gets indexed and COMMON_WORD_NAMES for what
// deliberately doesn't.

import { createElement } from 'react';

// Names that are also ordinary words. Auto-matching would light these up in
// sentences that have nothing to do with the record — "the engine idles", "an
// absolutely gorgeous bridge", "a palace of a chorus" — so they are left alone
// and only link when written as [[Palace]]. Edit this list freely; it is the
// one piece of the matcher that is a judgement call rather than a rule.
export const COMMON_WORD_NAMES = new Set([
  // from the spec
  'prince', 'air', 'yes', 'low',
  // album titles in the archive that are also everyday words
  'absolutely', 'blonde', 'lemonade', 'donuts', 'cathedral', 'shrines',
  'shoals', 'system', 'mayhem', 'slugger',
  // artist names in the archive that are also everyday words
  'palace', 'grip', 'debit', 'idles', 'castanets',
]);

// Below this a "name" is more likely to be an initialism inside a word than a
// record. Nothing in the archive is this short.
const SHORTEST_NAME = 3;

const normalise = text => String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();

const escapeForRegex = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// The spellings of one name that should all reach the same place. Casing is
// handled by the matcher, so "Mk.gee" covers "MK.gee" for free; what has to be
// enumerated is punctuation and the bits of a title nobody says out loud.
function nameForms(name) {
  const forms = new Set();
  const add = value => {
    const clean = normalise(value);
    if (clean.length >= SHORTEST_NAME) forms.add(clean);
  };

  add(name);

  // "ANTI (Deluxe)" is written about as ANTI; so is the 45th Anniversary
  // Edition of anything.
  const unqualified = String(name).replace(/\s*[([][^)\]]*[)\]]\s*$/, '');
  if (unqualified !== name) add(unqualified);

  for (const base of [name, unqualified]) {
    add(String(base).replace(/&/g, ' and '));      // Two Star and The Dream Police
    add(String(base).replace(/\band\b/gi, '&'));   // and back the other way
    add(String(base).replace(/[.'’·]/g, ''));      // mkgee, Im In Your Mind Fuzz
  }

  return [...forms];
}

// Every artist and album in the archive, as things a mention can resolve to.
//
// Albums point at their own page. Artists have no page of their own, so they
// point at the archive filtered to them — which is what an artist page would
// be. Combined "Artist - Album" forms are indexed as the album, so a full
// citation resolves to the record rather than being chopped down to the name
// in front of the dash.
export function buildReferenceIndex(entries) {
  const targets = [];
  const claimed = new Set();
  // A blocked name still resolves — it just never resolves on its own. That
  // separation is the whole reason the brackets exist: the matcher stays quiet
  // about "absolutely", and [[Absolutely]] still reaches the record.
  const autoForms = new Set();

  const claim = (form, target) => {
    if (claimed.has(form)) return;          // first entry to want a spelling keeps it
    claimed.add(form);
    target.forms.push(form);
    if (!COMMON_WORD_NAMES.has(form)) autoForms.add(form);
  };

  // Albums first: where an album and an artist share a spelling — Silver
  // Apples by Silver Apples — the record is the more specific answer.
  for (const entry of entries || []) {
    if (!entry?.album || !entry?.slug) continue;
    const target = {
      kind: 'album',
      label: entry.album,
      href: '/entries/' + entry.slug,
      slug: entry.slug,
      forms: [],
    };
    for (const form of nameForms(entry.album)) claim(form, target);
    // "Sufjan Stevens - Carrie & Lowell" and its punctuation variants.
    if (entry.artist) {
      for (const artistForm of nameForms(entry.artist)) {
        for (const albumForm of nameForms(entry.album)) {
          for (const separator of [' - ', ' — ', ' – ', ': ', ' / ']) {
            claim(artistForm + separator + albumForm, target);
          }
        }
      }
    }
    if (target.forms.length) targets.push(target);
  }

  const artistsSeen = new Set();
  for (const entry of entries || []) {
    if (!entry?.artist) continue;
    const key = normalise(entry.artist);
    if (artistsSeen.has(key)) continue;
    artistsSeen.add(key);
    const target = {
      kind: 'artist',
      label: entry.artist,
      href: '/archive?q=' + encodeURIComponent(entry.artist),
      slug: null,
      forms: [],
    };
    for (const form of nameForms(entry.artist)) claim(form, target);
    if (target.forms.length) targets.push(target);
  }

  const byForm = new Map();
  for (const target of targets) {
    for (const form of target.forms) byForm.set(form, target);
  }

  // Longest first, so the alternation below prefers the fuller citation — JS
  // alternation takes the first branch that matches at a position, not the
  // longest, so the ordering here *is* the longest-match rule.
  const forms = [...autoForms].sort((a, b) => b.length - a.length);

  return {
    byForm,
    // No lookbehind: Safari only grew it recently and this runs in the
    // browser. The leading boundary is captured and handed back instead.
    pattern: forms.length
      ? new RegExp('(^|[^\\p{L}\\p{N}])(' + forms.map(escapeForRegex).join('|') + ')(?![\\p{L}\\p{N}])', 'giu')
      : null,
  };
}

// Stretches of text a link must not be planted in. The notes are plain prose
// rather than rendered markdown, so this is mostly about not mangling the
// occasional bit of markup someone typed by hand.
function protectedRanges(text) {
  const patterns = [
    /```[\s\S]*?```/g,        // fenced code
    /`[^`\n]*`/g,             // inline code
    /\[[^\]]*\]\([^)]*\)/g,   // a link that already exists
    /^#{1,6}\s.*$/gm,         // heading
    /^\s*>.*$/gm,             // blockquote
  ];
  const ranges = [];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      ranges.push([match.index, match.index + match[0].length]);
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);

  const merged = [];
  for (const range of ranges) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push([...range]);
  }
  return merged;
}

const EXPLICIT = /\[\[([^\]|]+?)(?:\|([^\]]*?))?\]\]/g;

// A linker for one page. Holds the "first mention only" tally and the slug of
// the entry being read, because both of those are page-wide facts — an album
// notes block and eight track notes are one page, not nine.
//
// Returns a function to run over each block of text. Its output is an array of
// strings and <a> elements, which is exactly what React renders in place of
// the string that was there before — no HTML is built, so nothing typed into a
// note can become markup.
export function createReferenceLinker(index, { selfSlug = null, selfArtist = null } = {}) {
  const linked = new Set();
  const selfArtistForm = normalise(selfArtist);

  function anchor(target, text, key) {
    return createElement('a', {
      key,
      href: target.href,
      className: 'ln-xref',
      'data-xref': target.kind,
    }, text);
  }

  // Already linked once on this page, or it's the record you're reading.
  //
  // The artist counts as the record you're reading too. Almost every review
  // names its own artist in the first sentence, and linking that to an archive
  // search for them is a link back to where you already are — it made twelve
  // of the archive's thirteen matches noise. A review that mentions a
  // *different* artist is the whole point, and still links.
  const spent = target => linked.has(target.href)
    || (target.kind === 'album' && selfSlug && target.slug === selfSlug)
    || (target.kind === 'artist' && selfArtistForm && normalise(target.label) === selfArtistForm);

  return function linkReferences(text, keyPrefix = 'xref') {
    if (!text || !index?.pattern) return text;

    const nodes = [];
    let key = 0;
    const push = node => { if (node !== '') nodes.push(node); };

    // Explicit brackets are resolved first and win outright — that is the
    // point of them. An unresolvable [[name]] loses its brackets and stays
    // prose rather than becoming a link to nowhere.
    let cursor = 0;
    for (const match of String(text).matchAll(EXPLICIT)) {
      autoLink(String(text).slice(cursor, match.index));
      const target = index.byForm.get(normalise(match[1]));
      const shown = (match[2] ?? match[1]).trim();
      if (target && !spent(target)) {
        linked.add(target.href);
        push(anchor(target, shown, keyPrefix + '-e' + key++));
      } else {
        push(shown);
      }
      cursor = match.index + match[0].length;
    }
    autoLink(String(text).slice(cursor));

    function autoLink(chunk) {
      if (!chunk) return;
      const blocked = protectedRanges(chunk);
      const isBlocked = at => blocked.some(([from, to]) => at >= from && at < to);

      let at = 0;
      index.pattern.lastIndex = 0;
      let match;
      while ((match = index.pattern.exec(chunk)) !== null) {
        const start = match.index + match[1].length;
        const target = index.byForm.get(normalise(match[2]));
        if (!target || spent(target) || isBlocked(start)) continue;
        linked.add(target.href);
        push(chunk.slice(at, start));
        push(anchor(target, match[2], keyPrefix + '-a' + key++));
        at = start + match[2].length;
      }
      push(chunk.slice(at));
    }

    return nodes.length ? nodes : text;
  };
}
