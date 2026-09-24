// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/came_back_actions.js
// What came back: records this journal put somebody onto, logged on theirs.
//
// Noticed in the keeper's own browser, which already reads every journal in
// the book for the feed (Feed.js) and already matches the entries whose
// credit names this journal. What it finds is handed to /api/came-back and
// written down here, so the inbox can show it as an arrival: new once, and
// then not, the same on every device. migrations/023_came_back.sql has why it
// is a table of its own.
//
// Nothing here asks another journal anything. The rows are what their public
// feed already said, tidied, and a row that does not survive the tidying is
// dropped rather than half-kept.
import database from './database_connection.js';
import { tidyJournal } from './return_address.js';

// How many a single sweep may hand over. The feed matches at most thirty;
// the room above that is for a feed that grows, not for anybody's script.
const MOST_AT_ONCE = 60;

// A journal's slug is its entry's address, so it is going into a link: letters,
// numbers, hyphens and underscores, and nothing that could walk a path.
const LOOKS_LIKE_A_SLUG = /^[\w-]{1,200}$/;

// How old an entry can be on the very first sweep and still arrive new. The
// first time a copy looks, it finds everything its friends ever credited it
// with, and a wall of dots for last spring is not news. After that first
// sweep, anything newly noticed is new, whatever its date — a credit added to
// an old entry by hand is still something that just happened.
const FIRST_SWEEP_NEW_DAYS = 14;

function text(value, most) {
  const said = String(value ?? '').trim();
  return said ? said.slice(0, most) : null;
}

function tidy(row) {
  const journal = tidyJournal(row?.journal);
  const slug = String(row?.slug ?? '').trim();
  const album = text(row?.album, 300);
  if (!journal || !LOOKS_LIKE_A_SLUG.test(slug) || !album) return null;
  const art = text(row?.album_art, 1000);
  const rating = row?.rating === null || row?.rating === undefined || row?.rating === '' ? null : Number(row.rating);
  const posted = row?.posted_at ? new Date(row.posted_at) : null;
  return {
    journal,
    slug,
    name: text(row?.name, 120),
    album,
    artist: text(row?.artist, 300),
    album_art: art && /^https:\/\//i.test(art) ? art : null,
    rating: Number.isFinite(rating) && rating >= 0 && rating <= 5 ? rating : null,
    masterpiece: row?.masterpiece === true,
    by_hand: row?.by_hand === true,
    posted_at: posted && !Number.isNaN(posted.getTime()) ? posted : null,
  };
}

// Newest first, by when they logged it.
export async function pull_came_back() {
  return await database`
    SELECT id, journal, slug, name, album, artist, album_art, rating,
           masterpiece, by_hand, posted_at, noticed_at, seen_at
    FROM came_back
    ORDER BY coalesce(posted_at, noticed_at) DESC
    LIMIT 60
  `;
}

// Write down whatever has not been noticed before. Returns how many were new
// to this copy. Noticing an entry already here changes nothing about it.
export async function save_came_back(rows) {
  const clean = (Array.isArray(rows) ? rows : []).slice(0, MOST_AT_ONCE).map(tidy).filter(Boolean);
  if (clean.length === 0) return 0;
  const [{ first }] = await database`SELECT NOT EXISTS (SELECT 1 FROM came_back) AS first`;
  const cutoff = Date.now() - FIRST_SWEEP_NEW_DAYS * 24 * 60 * 60 * 1000;
  let added = 0;
  for (const row of clean) {
    const history = first && row.posted_at && row.posted_at.getTime() < cutoff;
    const done = await database`
      INSERT INTO came_back
        (journal, slug, name, album, artist, album_art, rating, masterpiece, by_hand, posted_at, seen_at)
      VALUES
        (${row.journal}, ${row.slug}, ${row.name}, ${row.album}, ${row.artist}, ${row.album_art},
         ${row.rating}, ${row.masterpiece}, ${row.by_hand}, ${row.posted_at}, ${history ? new Date() : null})
      ON CONFLICT (journal, slug) DO NOTHING
      RETURNING id
    `;
    added += done.length;
  }
  return added;
}

// Opened, so no longer new. Only the first opening is kept.
export async function see_came_back(id) {
  const [row] = await database`
    UPDATE came_back SET seen_at = now()
    WHERE id = ${id} AND seen_at IS NULL
    RETURNING id
  `;
  return row || null;
}
