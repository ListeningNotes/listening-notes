// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/needle.js
// The record on the desk, and the records that were on it before.
//
// See migrations/013_needle.sql for why this is not the drafts row. What
// lives here is the reading half of the session beacon: one row saying what
// is being logged right now, and a short list of what was logged lately.
//
// Everything in this file is public by the time it is read — the beacon is
// the one thing a journal says out loud. The columns are chosen so that
// nothing else can leak through it: an album, an artist, a cover and a track
// title. The writing stays in `drafts` and `entries`, and no query here
// touches a notes column.
import database from './database_connection.js';
import { sizedAlbumArt } from './music_data_api.js';

// How long a listen can sit untouched before the needle lifts itself. The
// brief said "a few hours"; three is a long album twice over and still short
// of a working day, so a journal left open at lunch has stopped claiming
// anything by mid-afternoon.
//
// It is enforced here, in the read, rather than by anything having to run on
// a schedule. A closed tab, a flat battery or a browser killed by iOS all
// leave the row exactly where it was, and all three expire the same way.
const LIFTS_AFTER_MINUTES = 180;

// The covers under the beacon — "Before that". Three are drawn; a few more
// are read because the one on the beacon is dropped from the list and the
// same record can appear twice.
const LOOK_BACK = 12;

// Tiles are never rendered wider than about 190pt. The same number
// database_actions.js uses for the wall, for the same reason.
const TILE_PX = 600;

// Two records count as the same one when their titles match, ignoring case
// and spacing. Title alone, not title and artist — the same record arrives
// credited two ways often enough (a soundtrack under 鷺巣詩郎 in one place and
// Shiro Sagisu in another) that a title-and-artist key would draw the record
// on the beacon underneath itself. Two different albums sharing a title is
// the rarer accident, and the smaller one.
export const sameRecord = text => String(text ?? '').trim().toLowerCase();

// ── What is on the desk ───────────────────────────────────────────────────
// Null when there is nothing, when the needle has lifted, or when this copy
// has not run the migration yet. All three mean the same thing to the beacon
// — ask the next source — so none of them is an error.
export async function pull_needle() {
  try {
    const [row] = await database`
      SELECT album, artist, album_art, track
      FROM needle
      WHERE id = 1
        AND updated_at > now() - ${LIFTS_AFTER_MINUTES} * interval '1 minute'
    `;
    if (!row?.album) return null;
    return {
      album: row.album,
      artist: row.artist || '',
      art: sizedAlbumArt(row.album_art || '', TILE_PX),
      track: String(row.track || '').trim(),
    };
  } catch {
    return null;
  }
}

// Written by the listen as it moves: a record picked, a track turned to, a
// line typed. One row, overwritten, so putting a second record on the desk
// takes the first one off with nothing having to check.
export async function set_needle({ album, artist = '', album_art = '', track = '' }) {
  if (!album) throw new Error('The needle needs a record');
  await database`
    INSERT INTO needle (id, album, artist, album_art, track, updated_at)
    VALUES (1, ${album}, ${artist}, ${album_art}, ${track}, now())
    ON CONFLICT (id) DO UPDATE SET
      album = EXCLUDED.album,
      artist = EXCLUDED.artist,
      album_art = EXCLUDED.album_art,
      track = EXCLUDED.track,
      updated_at = now()
  `;
}

// The listen is finished, or the record has been taken off the desk. The
// expiry above covers everything that never gets to call this.
export async function lift_needle() {
  await database`DELETE FROM needle WHERE id = 1`;
}

// ── What was on it before ─────────────────────────────────────────────────
// Real listens, published or not — Miyel's call, 2026-09-15. An entry is a
// listen that was posted and a draft is one that was not, and both were an
// evening spent with a record, which is what the row is for. With Last.fm as
// the source these three were whatever happened to autoplay, and the listens
// that mattered got buried underneath it.
//
// A draft carries no slug because there is no page to open yet, so the tile
// draws plain. The notes in that row are not selected and never leave.
export async function pull_recent_listens() {
  try {
    const rows = await database`
      SELECT album, artist, album_art, slug, posted_at  AS at FROM entries
      UNION ALL
      SELECT album, artist, album_art, NULL, updated_at AS at FROM drafts
      ORDER BY at DESC
      LIMIT ${LOOK_BACK}
    `;
    const at = new Map();
    const listens = [];
    for (const row of rows) {
      const key = sameRecord(row.album);
      if (!key) continue;
      // The same record twice: a draft from a relisten, above the entry
      // written the first time round. The newer row keeps its place in the
      // order and the older one hands over its slug, so a cover that has a
      // page somewhere does not draw as a dead tile. A relisten is a new
      // entry and this is not pretending otherwise — it is one record, shown
      // once, opening the journal's page about that record.
      if (at.has(key)) {
        const kept = listens[at.get(key)];
        if (!kept.slug && row.slug) kept.slug = row.slug;
        continue;
      }
      at.set(key, listens.length);
      listens.push({
        album: row.album,
        artist: row.artist || '',
        art: sizedAlbumArt(row.album_art || '', TILE_PX),
        slug: row.slug || null,
      });
    }
    return listens;
  } catch {
    return [];
  }
}
