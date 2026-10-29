// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/people_actions.js
// The address book: the journals this copy's keeper reads.
//
// A person is an address — migrations/007_people.sql has why that is the
// whole of it. The spelling is the send form's, cut down to the host
// (tidyJournal in library/return_address.js), so a journal filed from a
// send, a scanned code, a paste or an entry's link is one row however it
// arrived.
import database from './database_connection.js';
import { tidyJournal, journalUrl } from './return_address.js';

// By name. Pinned people came first until Pin went, 2026-10-26 (Miyel:
// "Drop Pin entirely. Not needed."); `pinned_at` stays, and nothing reads it.
export async function pull_people() {
  return await database`
    SELECT id, address, name, added_at, pinned_at, private, moved_to
    FROM people
    ORDER BY lower(coalesce(name, address)), added_at
  `;
}

// How many can be up there at once (Miyel, 2026-09-20). Six is two rows of
// three at the size they are drawn, and past that the shelf is pins and the
// book is a line under them — which is the pane inside out.
//
// **This is the rule.** Friends.js keeps its own copy of the number so it can
// grey the door out before you press it, and cannot import this one: this
// module opens the database and that one runs in a browser. If they ever
// disagree, this wins and the door is merely wrong about itself.
export const PINS_MOST = 6;

// Pinning is a stamp or nothing — see migrations/021_pinned_people.sql. The
// stamp is the order as well as the fact, so re-pinning somebody already
// pinned moves them to the end of the pinned row rather than doing nothing;
// that is the honest reading of pressing it again on purpose.
export async function pin_person(id, on) {
  if (on) {
    const [{ count }] = await database`
      SELECT count(*)::int AS count FROM people WHERE pinned_at IS NOT NULL AND id <> ${id}`;
    if (count >= PINS_MOST) {
      const full = new Error(`Six is the most you can pin. Unpin somebody first.`);
      full.full = true;
      throw full;
    }
  }
  const [row] = await database`
    UPDATE people
    SET pinned_at = ${on ? new Date() : null}
    WHERE id = ${id}
    RETURNING id, address, name, added_at, pinned_at, private
  `;
  return row || null;
}

// Filing an address already there is not an error: it is the same person,
// and a newer name — if one arrived — is kept. Nothing else about the row
// changes, so re-adding never moves anybody.
export async function save_person({ address, name }) {
  const host = tidyJournal(address);
  if (!host) throw new Error("That doesn't look like a journal address.");
  const [row] = await database`
    INSERT INTO people (address, name)
    VALUES (${host}, ${String(name || '').trim() || null})
    ON CONFLICT (address) DO UPDATE
      SET name = COALESCE(EXCLUDED.name, people.name)
    RETURNING id, address, name, added_at, pinned_at, private
  `;
  return row;
}

// ── Private, 2026-10-08 ─────────────────────────────────────────────────────
// A person kept private is never published (migrations/032_board.sql): they
// stay out of /api/public/people, so they are on nobody's board but their
// keeper's own. Everybody else in the book may be published — and only if
// they are on the Board themselves, which the public route asks the
// directory (Miyel's Board brief).
export async function set_private(id, on) {
  const [row] = await database`
    UPDATE people SET private = ${Boolean(on)} WHERE id = ${id}
    RETURNING id, address, name, added_at, pinned_at, private
  `;
  return row || null;
}

// The part of the book that may be published, in the book's own order: the
// address and the name it was filed under, and nothing else.
export async function pull_public_people() {
  return await database`
    SELECT address, name FROM people
    WHERE NOT private
    ORDER BY lower(coalesce(name, address)), added_at
  `;
}

export async function pull_person(id) {
  const [row] = await database`
    SELECT id, address, name, added_at, pinned_at, private, moved_to FROM people WHERE id = ${id} LIMIT 1
  `;
  return row || null;
}

export async function remove_person(id) {
  const [row] = await database`
    DELETE FROM people WHERE id = ${id} RETURNING id
  `;
  return row || null;
}

// ── A friend who moved, 2026-10-21 ────────────────────────────────────────
// A friend's journal that says, in its beacon, that it lives somewhere new
// (app/api/public/beacon, `moved_to`) is written down here by the friends
// round (app/api/friends/beacons), for the Inbox to show "[Name] moved" with
// Update; one it no longer says is taken off. Only the keeper's press moves
// the address itself (take_move): nothing in a journal changes unless its
// keeper changes it, and a journal that was taken over could otherwise send
// its friends' messages anywhere. Written only where something changed, so a
// round costs nothing for a book in which nobody moved. `heard` is the
// round's rows, by person id; a journal never heard from says nothing.
export async function note_moves(people, heard) {
  const said = new Map(heard.map(row => [row.id, row]));
  for (const person of people) {
    const row = said.get(person.id);
    if (!row || row.state === 'unknown') continue;
    const where = tidyJournal(row.moved_to || '');
    const to = where && where !== person.address ? where : null;
    if ((person.moved_to || null) === to) continue;
    await database`
      UPDATE people SET moved_to = ${to} WHERE id = ${person.id} AND address = ${person.address}
    `;
  }
}

// The Inbox's Update: the address in the book becomes the one the friend's
// journal gave, and the notice goes. Where the book already holds that
// address — the friend was added again at the new one — the old row is the
// one that goes, and the one already there is handed back.
//
// And the rest of this journal follows the book, 2026-10-21 (Miyel: "do the
// fix"): everything here that names the friend's old address names the new
// one — what was sent them and is still out (`sent`), what of theirs came
// back (`came_back`), their wave, their messages and what they are about,
// and what they sent here (`submissions`), and what was written back to
// them (`said_back`, 2026-10-27) — so the Outbox clears when a
// record comes back from the new address, the feed does not bring back as
// new what already came back, and a reply goes where they live now. Where a
// row for the new address is already here, the old one is the one that
// goes. Never an entry: a credit on this journal's own pages is its
// keeper's writing, and goes on naming the address it was sent from. All of
// it at once with the book's row, or none of it.
export async function take_move(id) {
  const [person] = await database`SELECT id, address, moved_to FROM people WHERE id = ${id} LIMIT 1`;
  const from = person?.address;
  const to = tidyJournal(person?.moved_to || '');
  if (!from || !to) return null;
  const [there] = await database`SELECT id FROM people WHERE address = ${to} AND id <> ${id} LIMIT 1`;
  await database.transaction(sql => [
    ...carryAlong(sql, from, to),
    there
      ? sql`DELETE FROM people WHERE id = ${id}`
      : sql`UPDATE people SET address = ${to}, moved_to = NULL WHERE id = ${id}`,
  ]);
  return await pull_person(there ? there.id : id);
}

// An address written loosely — a scheme, a path, capitals, as a visitor's
// send may have typed it — read the way tidyJournal reads it, in Postgres.
// For the columns that came from outside; the book's own are already tidy.
function carryAlong(sql, from, to) {
  return [
    sql`UPDATE sent SET journal = ${to} WHERE journal = ${from}`,
    sql`DELETE FROM came_back old WHERE old.journal = ${from}
          AND EXISTS (SELECT 1 FROM came_back here WHERE here.journal = ${to} AND here.slug = old.slug)`,
    sql`UPDATE came_back SET journal = ${to} WHERE journal = ${from}`,
    sql`DELETE FROM waves WHERE address = ${from} AND EXISTS (SELECT 1 FROM waves WHERE address = ${to})`,
    sql`UPDATE waves SET address = ${to} WHERE address = ${from}`,
    sql`UPDATE messages SET from_journal = ${to}
          WHERE lower(split_part(regexp_replace(btrim(from_journal), '^https?://', '', 'i'), '/', 1)) = ${from}`,
    sql`UPDATE messages SET about_journal = ${to}
          WHERE lower(split_part(regexp_replace(btrim(about_journal), '^https?://', '', 'i'), '/', 1)) = ${from}`,
    sql`UPDATE submissions SET sender_url = ${to}
          WHERE lower(split_part(regexp_replace(btrim(sender_url), '^https?://', '', 'i'), '/', 1)) = ${from}`,
    // What was written back to them, and about their records (Words).
    sql`UPDATE said_back SET to_journal = ${to} WHERE to_journal = ${from}`,
    sql`UPDATE said_back SET about_journal = ${to} WHERE about_journal = ${from}`,
  ];
}

// Whether a move is waiting in the book, for the Inbox's dot (/api/waiting).
export async function any_moves() {
  const [row] = await database`SELECT EXISTS (SELECT 1 FROM people WHERE moved_to IS NOT NULL) AS any`;
  return row?.any === true;
}

// Asks a journal what its keeper is called, the way any visitor's browser
// could — its settings route is public, and the name is the first thing on
// it. Done here rather than in the browser because that route does not say
// it may be read across origins, and it should not have to: this is a read
// the keeper's own server makes on the keeper's own say-so. Null when the
// address does not answer as a journal, in a few seconds or at all; the
// person is filed either way, since an address is an address whether or
// not it is up this minute.
//
// `wait` is how long to give it. Six seconds for filing, where nobody is
// watching; /get asks with less, because a stranger is looking at a page
// that is waiting on the answer (2026-09-22).
export async function ask_journal_name(address, wait = 6000) {
  const url = journalUrl(address);
  if (!url) return null;
  try {
    const answer = await fetch(`${url}/api/settings`, {
      signal: AbortSignal.timeout(wait),
      headers: { accept: 'application/json' },
    });
    if (!answer.ok) return null;
    const { settings } = await answer.json();
    const name = String(settings?.keeper_name || '').trim();
    return name || null;
  } catch {
    return null;
  }
}

// ── What has been seen on the Friends wall, 2026-10-27 ────────────────────
// A friend's record says New for this long after it was logged, until it
// scrolls past (migrations/044_seen_records.sql). Older than this it is not
// new whether or not it was seen, so a row past it is no use and goes.
export const NEW_FOR_DAYS = 14;

// The entries seen within the window, as `journal/slug`.
export async function pull_seen_records() {
  const rows = await database`
    SELECT journal, slug FROM seen_records
    WHERE seen_at > now() - make_interval(days => ${NEW_FOR_DAYS})
  `;
  return rows.map(r => `${r.journal}/${r.slug}`);
}

// Marks some entries seen, each `{ journal, slug }`, and lets go of rows
// too old to matter. A hundred at most a time: a wall scrolled past in one
// go is still one press's worth.
export async function see_records(list) {
  const rows = (Array.isArray(list) ? list : [])
    .map(r => ({ journal: tidyJournal(r?.journal), slug: String(r?.slug || '').trim().slice(0, 200) }))
    .filter(r => r.journal && r.slug)
    .slice(0, 100);
  if (rows.length === 0) return 0;
  await database.transaction(tx => [
    tx`
      INSERT INTO seen_records (journal, slug)
      SELECT * FROM UNNEST(${rows.map(r => r.journal)}::text[], ${rows.map(r => r.slug)}::text[])
      ON CONFLICT (journal, slug) DO NOTHING
    `,
    tx`DELETE FROM seen_records WHERE seen_at < now() - make_interval(days => ${NEW_FOR_DAYS})`,
  ]);
  return rows.length;
}

// ── Strangers, 2026-10-27 ─────────────────────────────────────────────────
// Her Friends brief, step five, and her answers of 2026-10-26. Somebody not
// in the book gets one thing at a time in the row, and once a thing of
// theirs is let go, nothing more until they are added (closed_doors,
// migrations/046). A friend gets one unanswered send at a time — "waves and
// sends can't be farmed", kept here, in the database, by the sender's
// address, never in a server's memory or the sender's browser. A wave was
// one per address already (migrations/024).
//
// Written loosely by a visitor's form, an address is read the way
// tidyJournal reads it, in Postgres, as carryAlong reads it above.

export const STRANGER_WAITS = 'This journal hasn’t added you yet, so it takes one thing at a time — nothing was sent.';
export const SEND_WAITS = 'The last record you sent is still waiting with them, so this one wasn’t sent. One at a time.';

// Why a send, words or a wave from this address may not come in now, or
// null when it may. `kind` is 'send', 'words' or 'wave'. Somebody with no
// journal has no address to be held to, and is never refused here (the
// doorman counts them).
export async function arrival_refused(address, kind) {
  const at = tidyJournal(address);
  if (!at) return null;
  const [row] = await database`
    SELECT
      EXISTS (SELECT 1 FROM people WHERE address = ${at}) AS friend,
      EXISTS (SELECT 1 FROM closed_doors WHERE address = ${at}) AS closed,
      EXISTS (SELECT 1 FROM submissions
              WHERE status IN ('pending', 'reviewed')
                AND lower(split_part(regexp_replace(btrim(coalesce(sender_url, '')), '^https?://', '', 'i'), '/', 1)) = ${at}) AS send_out,
      EXISTS (SELECT 1 FROM messages
              WHERE NOT admin AND replied_at IS NULL AND kept_at IS NULL
                AND lower(split_part(regexp_replace(btrim(coalesce(from_journal, '')), '^https?://', '', 'i'), '/', 1)) = ${at}) AS words_out,
      EXISTS (SELECT 1 FROM waves WHERE address = ${at}) AS wave_out
  `;
  if (row.friend) return kind === 'send' && row.send_out ? SEND_WAITS : null;
  if (row.closed) return STRANGER_WAITS;
  // A second wave from one address is already kept as nothing, answered the
  // same as the first (migrations/024), so a wave is held only by the rest.
  const waiting = row.send_out || row.words_out || (kind !== 'wave' && row.wave_out);
  return waiting ? STRANGER_WAITS : null;
}

// A thing from this address was let go: if they are nobody in the book, the
// door closes behind it.
export async function close_if_stranger(address, name = null) {
  const at = tidyJournal(address);
  if (!at) return false;
  const [friend] = await database`SELECT 1 FROM people WHERE address = ${at} LIMIT 1`;
  if (friend) return false;
  await database`
    INSERT INTO closed_doors (address, name) VALUES (${at}, ${name ? String(name).slice(0, 120) : null})
    ON CONFLICT (address) DO UPDATE SET closed_at = now()
  `;
  return true;
}

// Added: their door opens again.
export async function open_door(address) {
  const at = tidyJournal(address);
  if (!at) return;
  await database`DELETE FROM closed_doors WHERE address = ${at}`;
}
