// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/public/card/route.js
// The card, as a visitor sees it, for another journal to draw.
//
// Miyel, 2026-10-29: "on a friends page clicking their pfp needs to also open
// their card" — all of it, her pick, at this address, her name. A friend's
// page is drawn by the reader's own copy, so their card comes across the way
// their records do: read from here when it is opened, kept nowhere.
//
// An allow-list, and only the card's part of what the layout hands every page
// (BOOKPLATE_FIELDS, app/layout.js): each of these is already in the HTML of
// this journal's home page, which anybody can open, so this tells nobody
// anything new. Not the address, which the reader already has and no page
// prints; not the theme; nothing Settings keeps for the keeper alone. Paths
// stay paths — the portrait and its code — for the reader to put this
// journal's address in front of. The pinned record goes as the record itself,
// its slug, names and cover, because an entry's id never crosses between
// copies (AGENTS, Never). The counts are /api/public/stamps', asked beside it.
//
// A copy older than this answers 404 here, and the reader draws what it can
// from the records it has already read (app/dashboard/people/[id]).

import database from '@/library/database_connection';
import { answerNoJournal } from '@/library/hosting_directory';
import { coverName, pull_settings } from '@/library/settings_actions';

const HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Cache-Control': 'no-store',
};

const CARD_FIELDS = [
  'keeper_name', 'display_name', 'portrait_url', 'portrait_position', 'portrait_code_url',
  'founded_at', 'social_links', 'hidden_fields', 'bioanswers', 'rig_icon', 'rig',
];

export async function GET() {
  try {
    const all = await pull_settings();
    const card = Object.fromEntries(CARD_FIELDS.filter(key => key in all).map(key => [key, all[key]]));
    card.cover_name = coverName(all);
    card.pinned = null;
    if (all.pinned_entry_id) {
      const [row] = await database`
        SELECT slug, album, artist, album_art, song FROM entries WHERE id = ${all.pinned_entry_id}
      `;
      card.pinned = row || null;
    }
    return Response.json(card, { headers: HEADERS });
  } catch (error) {
    const nowhere = answerNoJournal(error, HEADERS);
    if (nowhere) return nowhere;
    return Response.json({ error: error.message }, { status: 500, headers: HEADERS });
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: HEADERS });
}
