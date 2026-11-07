// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// components/main_components/EntryPlate.js
// A record, cut as a printing plate: what the record says, handed to whichever
// look is drawing it (looks/). Nothing written about a record travels, and no
// address is printed.
//
// A scene is told the time rather than reading it, so a video is made faster
// than real time (library/video_file.js), and the same scene is the preview.
// A canvas has no 3D of its own: the album is drawn in vertical strips, each
// its own height for how near it is (SharePrinter.js).
//
// A look that fails to draw falls back to Day and says so through `onFail`,
// rather than leaving a blank print.

'use client';

import { loadMark, loadPicture, INKS } from './SharePrinter';
import { parseRating, parseHorizon, entryTracks } from '../../library/entry_formatter';
import { LOOKS, lookOf } from './looks';

const clamp01 = v => Math.min(1, Math.max(0, v));

export function entryPlate({ entry, keeper = '', face = null, onFail = null }) {
  const isMasterpiece = entry?.masterpiece === true || entry?.rating === 'Masterpiece';
  const stars = isMasterpiece ? 5 : parseRating(entry?.rating);
  const isFavorite = entry?.favorite === true || entry?.favorite === 'true';
  const isFormative = entry?.formative === true || entry?.formative === 'true';
  const artistLine = [entry?.artist, entry?.year].filter(Boolean).join(' · ').toUpperCase();
  const tags = [isFavorite && 'fav', isMasterpiece && 'mp', isFormative && 'formative'].filter(Boolean);
  const tracks = entryTracks(entry || {});
  const rated = tracks.some(t => Number(t.stars) > 0);
  const bars = rated
    ? tracks.map(t => clamp01((Number(t.stars) || 0) / 5))
    : parseHorizon(entry?.horizon);
  const favs = rated ? tracks.map(t => Boolean(t.favorite)) : [];
  const record = { entry, keeper, isMasterpiece, stars, artistLine, year: entry?.year, tags, bars, favs, trackNames: tracks.map(t => t.name).filter(Boolean) };

  function scene(frame, { art, families, ground = 'day', still = false }) {
    const look = lookOf(ground);
    const given = { art, families, still };
    const day = () => {
      onFail?.(look.label);
      return LOOKS[0].scene(record, frame, { ...given, art: { ...art, mark: art?.dayMark } });
    };
    let made;
    try { made = look.scene(record, frame, given); } catch { made = day(); }
    return {
      step(dt) { made.step(dt); },
      paint(c) {
        try {
          c.save();
          made.paint(c);
        } catch {
          // Drawing only ever fails on this look's own paint, so Day is safe to
          // ask for; a Day that fails has nothing left to fall back to.
          if (look === LOOKS[0]) throw new Error('The print could not be drawn.');
          made = day();
          made.paint(c);
        } finally {
          c.restore();
        }
      },
    };
  }

  return {
    title: 'The record',
    fileName: entry?.slug || 'record',
    masterpiece: isMasterpiece,
    scene,

    // The mark in the look's ink, the cover, which is also the ground, and the keeper's face.
    // Either may come back null and the print draws on without it.
    async load({ ground = 'day' } = {}) {
      const [mark, dayMark, cover, keeperFace] = await Promise.all([
        loadMark(lookOf(ground).ink),
        loadMark(INKS.day.ink),
        loadPicture(entry?.album_art),
        loadPicture(face),
      ]);
      return { mark, dayMark, cover, face: keeperFace };
    },

    // The picture, for Save with nothing moving.
    draw(ctx, frame, { art, families, ground }) {
      scene(frame, { art, families, ground, still: true }).paint(ctx);
      return [];
    },
  };
}
