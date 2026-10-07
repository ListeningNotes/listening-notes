// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/public/stamps/route.js
// What the journal has collected, counted.
//
// The back of the card prints a few counted things the way a membership card
// prints how long you have held it: how many records are in the journal, when
// the first one went in, and the three genres it leans on. None of it is
// private — all of it is countable by scrolling the archive — so this answers
// anyone.
//
// It counted the three marks once, for a swatch that came off the card, and
// the counts were dropped with it — numbers nothing prints are numbers nobody
// has to keep true. Two of them are back, 2026-09-15, because the card's
// stamps print them: how many records somebody called a masterpiece and how
// many were formative. The third, favourites, is not asked for and is not
// counted. A fourth number joined them on 2026-10-01: how many songs, which
// is how many track notes the journal holds — the other total, beside the
// records, now that a note about one song is an entry of its own. Counted
// here rather than from the entries the cross already holds, for the reason
// below: the card is public and a visitor's copy of the journal is not the
// place to work out a number about its keeper.
//
// Deliberately not derived on the client from /api/entries. That endpoint sends
// every entry with its notes and its tracklist to draw a strip of album art;
// asking it for a number would mean shipping a couple of hundred kilobytes to
// render "39". A number, a date and three words is the whole payload here.

import database from '@/library/database_connection';

export async function GET() {
  try {
    // The album counts count albums, 2026-09-24: a track note is about one
    // song and is none of these. A journal of nothing but songs has nothing in
    // its albums count, and that is simply true rather than a penalty (the
    // track-notes brief) — and since 2026-10-01 it has everything in its
    // songs count, which is the track notes and nothing else. It is still
    // kept since its first note, and its genres are still what it listens
    // to, so those two count everything. Formative can be a song's too
    // (2026-09-30) and is still counted on albums here; the window a count
    // opens lists the same rows (About.js) and the wall's filter reads them
    // the same way (Journal.js), so the number on the card is the number in
    // the window it opens.
    const [row] = await database`
      SELECT
        COUNT(*) FILTER (WHERE song IS NULL)::int                     AS records,
        COUNT(*) FILTER (WHERE song IS NOT NULL)::int                 AS songs,
        COUNT(*) FILTER (WHERE masterpiece AND song IS NULL)::int     AS masterpieces,
        COUNT(*) FILTER (WHERE formative AND song IS NULL)::int       AS formative,
        MIN(posted_at)                                                AS first_listen
      FROM entries
    `;

    // What the journal actually listens to, next to what its keeper is asking
    // to be sent. The two disagreeing is the interesting part, so this is
    // counted rather than chosen — nobody edits their own top three.
    //
    // Grouped case-insensitively, keeping the spelling the records use, which
    // is how the archive counts them too. Three, because it is a line on a card
    // and the tail of one-off genres is what would turn it into a paragraph.
    const genres = await database`
      SELECT (array_agg(genre ORDER BY genre))[1] AS name, COUNT(*)::int AS n
      FROM entries
      WHERE genre IS NOT NULL AND btrim(genre) <> ''
      GROUP BY lower(btrim(genre))
      ORDER BY n DESC, name ASC
      LIMIT 3
    `;

    // first_listen carries its zone, so it is the instant it is. The card
    // prints a month and a year from it.
    return Response.json({
      records: row?.records ?? 0,
      songs: row?.songs ?? 0,
      masterpieces: row?.masterpieces ?? 0,
      formative: row?.formative ?? 0,
      first_listen: row?.first_listen ?? null,
      genres: genres.map(g => g.name),
    });
  } catch (error) {
    // A card with no numbers on it is a card. A card that fails to load is a
    // broken page, so the counts come back as zeros and the component leaves
    // those rows off rather than printing "0 records".
    return Response.json({ records: 0, songs: 0, masterpieces: 0, formative: 0, first_listen: null, genres: [] }, { status: 200 });
  }
}
