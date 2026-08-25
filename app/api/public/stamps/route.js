// app/api/public/stamps/route.js
// What the journal has collected, as two facts.
//
// The back of the card prints two facts the way a membership card prints how
// long you have held it: how many records are in the journal, and when the
// first one went in. Neither is private — both are countable by scrolling the
// archive — so this answers anyone.
//
// It counted the three marks too, for a swatch that has since come off the
// card. Numbers nothing prints are numbers nobody has to keep true.
//
// Deliberately not derived on the client from /api/entries. That endpoint sends
// every entry with its notes and its tracklist to draw a strip of album art;
// asking it for a number would mean shipping a couple of hundred kilobytes to
// render "39". A number and a date is the whole payload here.

import database from '@/library/database_connection';

export async function GET() {
  try {
    const [row] = await database`
      SELECT
        COUNT(*)::int   AS records,
        MIN(created_at) AS first_listen
      FROM entries
    `;

    // first_listen is a naive timestamp read through a driver that hands it
    // back shifted by the reader's own offset — see the note on created_at
    // elsewhere. The card prints a month and a year, which no plausible
    // offset can move, so the raw value is safe to send as-is here.
    return Response.json({
      records: row?.records ?? 0,
      first_listen: row?.first_listen ?? null,
    });
  } catch (error) {
    // A card with no numbers on it is a card. A card that fails to load is a
    // broken page, so the counts come back as zeros and the component leaves
    // those rows off rather than printing "0 records".
    return Response.json({ records: 0, first_listen: null }, { status: 200 });
  }
}
