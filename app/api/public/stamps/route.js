// app/api/public/stamps/route.js
// What the journal has collected, as five numbers.
//
// The back of the card prints a running count the way a membership card prints
// how long you have held it: records logged, and how many of those carry each
// of the three marks. Nothing here is private — every one of these is already
// countable by scrolling the archive — so this answers anyone.
//
// Deliberately not derived on the client from /api/entries. That endpoint sends
// every entry with its notes and its tracklist to draw a strip of album art;
// asking it for a number would mean shipping a couple of hundred kilobytes to
// render "39". Five integers is the whole payload here.

import database from '@/library/database_connection';

export async function GET() {
  try {
    const [row] = await database`
      SELECT
        COUNT(*)::int                                   AS records,
        COUNT(*) FILTER (WHERE masterpiece)::int        AS masterpieces,
        COUNT(*) FILTER (WHERE favorite)::int           AS favorites,
        COUNT(*) FILTER (WHERE formative)::int          AS formatives,
        MIN(created_at)                                 AS first_listen
      FROM entries
    `;

    // first_listen is a naive timestamp read through a driver that hands it
    // back shifted by the reader's own offset — see the note on created_at
    // elsewhere. The card prints a month and a year, which no plausible
    // offset can move, so the raw value is safe to send as-is here.
    return Response.json({
      records: row?.records ?? 0,
      masterpieces: row?.masterpieces ?? 0,
      favorites: row?.favorites ?? 0,
      formatives: row?.formatives ?? 0,
      first_listen: row?.first_listen ?? null,
    });
  } catch (error) {
    // A card with no numbers on it is a card. A card that fails to load is a
    // broken page, so the counts come back as zeros and the component leaves
    // those rows off rather than printing "0 records".
    return Response.json(
      { records: 0, masterpieces: 0, favorites: 0, formatives: 0, first_listen: null },
      { status: 200 }
    );
  }
}
