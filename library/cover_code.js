// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/cover_code.js
// An entry's cover, made into the code for that entry's address. The same
// press the card's portrait goes through (library/portrait_code.js): the art
// fills the dark modules, a dot of ink sits in each, the finders and the
// alignment targets are solid, and the picture is proved by the strictest
// reader on both page colours before it is handed back.
//
// ── Nothing is stored but the dot ─────────────────────────────────────────
// The portrait's code lives in the settings row as base64, and that one row
// holds one picture. An entry's code cannot: a pressed cover is two to four
// hundred kilobytes, and one per entry is a cost that grows with the archive
// on every copy's free tier, for a picture most entries will never be asked
// for. So the picture is redrawn from the art on every ask, and what the row
// keeps is the one thing the press has to work to find — the dot size that
// carried this cover at this address. Twenty-five bytes or so, written the
// first time anybody taps, and read on every tap after so the redraw skips
// the judging, which is most of the press's cost.
//
// The stamp is trusted only when it was made by this build of the press, for
// this art, at this address: a fingerprint of the address and the art rides
// on it, and a stamp that does not match is treated as no stamp at all. A
// corrected cover or a journal that has moved house is re-proved on its next
// tap and the row re-stamped; nothing has to remember to clear it.
//
// ── Pressed on the server, because it cannot be pressed anywhere else ─────
// Album art comes from Apple, which sends no CORS headers, so a browser can
// draw the picture and cannot read a pixel of it. The server fetches the art
// the same way the page does — the stored address, sized down through the
// same rewrite the wall uses — and presses it there.

import { createHash } from 'node:crypto';
import database from './database_connection.js';
import { sizedAlbumArt } from './music_data_api.js';
import { buildPortraitCode, darkPageCode, CODE_BUILD } from './portrait_code.js';

// What the art is fetched at. The largest code an entry address needs is
// version 10 — 57 modules, 684 pixels across at the press's twelve a module —
// so 600 is close to the size it is drawn at and a tenth of the master.
const PRESS_ART_PX = 600;

// The address a code for an entry encodes: the journal's, with the entry's
// path. The same value the card uses for the journal, with the scheme put
// back the same way.
export function entryAddress(siteAddress, slug) {
  const host = String(siteAddress || '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
  return host ? `https://${host}/entries/${slug}` : '';
}

// What a stamp was proved on, as eight hex characters. The address and the
// stored art together: a different code, or a different picture, is a
// different proof.
function provedOn(url, art) {
  return createHash('sha1').update(`${url}\n${art}`).digest('hex').slice(0, 8);
}

// The dot a stamp carries, if the stamp is this build's and was proved on
// this address and art — otherwise nothing, and the press judges afresh.
function stampedDot(stamp, mark) {
  const read = new URLSearchParams(String(stamp || ''));
  if (read.get('b') !== String(CODE_BUILD) || read.get('a') !== mark) return null;
  const dot = Number.parseFloat(read.get('d'));
  return dot > 0 && dot <= 1 ? dot : null;
}

// Press the code for one entry, for one page colour. Hands back the PNG as
// `png`, or no `png` and a `kind` saying why, in the press's own words:
// 'missing' for no such entry, 'empty' for nothing to make it from, and
// the press's 'unproved' or 'fault' otherwise. The report is for the log.
export async function pressCoverCode(slug, { theme = 'light' } = {}) {
  const [row] = await database`
    SELECT album_art, cover_code FROM entries WHERE slug = ${slug} LIMIT 1`;
  if (!row) return { kind: 'missing', report: 'no entry at that address.' };
  const [site] = await database`SELECT site_address FROM settings WHERE id = 1`;
  const url = entryAddress(site?.site_address, slug);
  if (!url) return { kind: 'empty', report: 'the journal has no address yet, so there is nothing to put in a code.' };
  if (!row.album_art) return { kind: 'empty', report: 'the entry has no cover to make it from.' };

  let art;
  try {
    art = await fetch(sizedAlbumArt(row.album_art, PRESS_ART_PX));
  } catch (error) {
    return { kind: 'unproved', report: `the cover could not be fetched: ${error?.message || error}.` };
  }
  if (!art.ok) return { kind: 'unproved', report: `the cover could not be fetched (${art.status}).` };
  const bytes = Buffer.from(await art.arrayBuffer());

  const mark = provedOn(url, row.album_art);
  const known = stampedDot(row.cover_code, mark);
  const built = await buildPortraitCode({ url, portrait: bytes, position: '50% 50%', dot: known });
  if (!built.data) return built;

  // The first proof for this cover at this address, kept for every ask after.
  if (!known) {
    const stamp = `b=${CODE_BUILD}&d=${built.dot}&a=${mark}`;
    await database`UPDATE entries SET cover_code = ${stamp} WHERE slug = ${slug}`;
  }

  const png = theme === 'dark' ? await darkPageCode(built.data) : Buffer.from(built.data, 'base64');
  return { ...built, data: undefined, png };
}
