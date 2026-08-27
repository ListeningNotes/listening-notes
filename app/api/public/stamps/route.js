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
// It counted the three marks too, for a swatch that has since come off the
// card. Numbers nothing prints are numbers nobody has to keep true.
//
// Deliberately not derived on the client from /api/entries. That endpoint sends
// every entry with its notes and its tracklist to draw a strip of album art;
// asking it for a number would mean shipping a couple of hundred kilobytes to
// render "39". A number, a date and three words is the whole payload here.

import database from '@/library/database_connection';

export async function GET() {
  try {
    const [row] = await database`
      SELECT
        COUNT(*)::int   AS records,
        MIN(created_at) AS first_listen
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

    // first_listen is a naive timestamp read through a driver that hands it
    // back shifted by the reader's own offset — see the note on created_at
    // elsewhere. The card prints a month and a year, which no plausible
    // offset can move, so the raw value is safe to send as-is here.
    return Response.json({
      records: row?.records ?? 0,
      first_listen: row?.first_listen ?? null,
      genres: genres.map(g => g.name),
    });
  } catch (error) {
    // A card with no numbers on it is a card. A card that fails to load is a
    // broken page, so the counts come back as zeros and the component leaves
    // those rows off rather than printing "0 records".
    return Response.json({ records: 0, first_listen: null, genres: [] }, { status: 200 });
  }
}
