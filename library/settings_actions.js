// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
import database from './database_connection.js';
import { DEFAULT_DEFINITIONS, mergeDefinitions } from './definitions.js';

// The journal's own details — what it is called, who keeps it, the portrait on
// the cover, the links in the nav. One row, always id 1.
//
// These used to be constants in the source, which is fine for exactly one
// journal and wrong for every copy of it: a new journal opened wearing this
// one's name and linking to this one's Instagram until its owner edited code
// they never asked to see. Reading them from here is what lets the welcome
// screen ask instead.

// What a journal looks like before anyone has told it anything. Returned when
// the row is missing entirely, which is every copy's first minute — the site
// has to render rather than fall over while the settings are still empty.
//
// Blank rather than borrowed: a fresh copy shows no name, no portrait and no
// social links until its owner supplies them, and never inherits this
// journal's. Nothing here needs a stand-in value: the one string a nameless
// copy has to show is its title, and coverName() below answers that without a
// column having to hold a placeholder.
const EMPTY = {
  // Dead, and kept for now. A journal is called after whoever keeps it — see
  // coverName() — so nothing reads this any more. It is still here because
  // dropping a column is a decision rather than a tidy-up, not because it
  // cannot be dropped: nobody outside this repo is running a copy yet, so the
  // schema is still a draft. See the cleanup note in NOTES.md. It stays null
  // rather than holding a title, so it cannot quietly become a second name.
  journal_name: null,
  keeper_name: null,
  bio: null,
  portrait_url: null,
  instagram_url: null,
  lastfm_user: null,
  site_address: null,
  founded_at: null,
  pinned_entry_id: null,
  // The paragraph saying what the journal is. It has lived in the database
  // since the settings table was built and never once reached a page, because
  // it was left out of this list and out of the layout's — /about read it from
  // a context nothing had put it into. The card carries it now, so it is worth
  // the two lines it costs to actually deliver it.
  about_intro: null,
  // A list of plain URLs, or null. See the note on the column in schema.sql.
  social_links: null,
  // Which counted rows to leave off the card. A list of keys, or null.
  hidden_fields: null,
  // What its keeper would like sent to them. See the column in schema.sql.
  send_me: null,
  // Where in the portrait to look. A CSS object-position, or null for centred.
  portrait_position: null,
  portrait_code_url: null,
  // Which mark stands for the rig, and the rig itself. See schema.sql.
  rig_icon: null,
  rig: null,
  bioanswers: null,
  definitions: null,
  // The ornamented name, or null to use the plain one. See coverName().
  display_name: null,
  // Written once and then fixed for the life of the copy. See WRITE_ONCE.
  serial: null,
  // False until the welcome screen has run. Not null: "we have not asked yet"
  // and "they answered no" are the same answer here, and false is the one a
  // fresh copy needs before its database has a row in it at all.
  setup_complete: false,
};

// Anything a caller sends that is not one of these is ignored. An allow-list
// rather than trusting the request body, so a stray field cannot reach the
// query — and so adding a setting is a deliberate act in this file.
const WRITABLE = [
  // journal_name is deliberately absent. The column is still there and still
  // holds whatever anyone typed into it, but a journal is named after its
  // keeper now, so letting a form go on writing this would be maintaining a
  // second name that nothing ever reads.
  'keeper_name', 'display_name', 'bio', 'portrait_url',
  'instagram_url', 'lastfm_user', 'site_address',
  'founded_at', 'pinned_entry_id', 'about_intro', 'social_links',
  'hidden_fields', 'send_me', 'portrait_position', 'rig_icon', 'rig',
  'bioanswers',
  'definitions',
  // The uploaded portrait. Written by /api/portrait rather than by a form, but
  // it goes through the same door as everything else in this table.
  'portrait_data', 'portrait_mime',
  // The portrait rendered as the journal's code. See the column in schema.sql.
  'portrait_code', 'portrait_code_url',
  // Set at setup and then frozen — see WRITE_ONCE. They are on this list
  // because they have to be writable exactly once; the list below is what
  // stops that becoming twice.
  'serial', 'setup_complete',
];

// Fields that may be written while they are empty and never again.
//
// A serial that can be edited is a serial number in the way a nickname is a
// fingerprint — the whole value of it is that it did not change. Same for the
// founding date: it is a claim about the past, and a journal whose start date
// can be moved to last week is a journal whose age means nothing. Both are
// printed on the card, which is exactly the kind of place a number gets read
// as a fact rather than as a preference.
//
// Enforced here rather than by leaving them off WRITABLE, because they do have
// to be written once and something has to be allowed to do it. Silently
// dropped rather than raising: a form that posts every field it knows about
// should not fail because one of them was already settled.
//
// setup_complete is not on this list on purpose. It is a latch, not a fact,
// and someone re-running setup after a restore is a situation, not an attack.
const WRITE_ONCE = ['serial', 'founded_at'];

// A form posts empty strings for fields left alone; the database should hold
// null. Otherwise "no Instagram" becomes an empty link rather than no link.
const blankToNull = v => (typeof v === 'string' && v.trim() === '' ? null : v);

// What this journal is called.
//
// It is called whoever keeps it. There used to be a journal_name column and a
// separate name on the cover, which asked every owner to invent a title for
// their own diary before they could write in it — two names for one thing, and
// the second one always ended up being the first one again. The column is
// still in the table and nothing reads it; whether it gets dropped is an open
// question in NOTES.md, and the answer is only free while the schema is still
// a draft — that is, until somebody else installs a copy.
//
// The fallback is deliberately generic and deliberately not this journal's
// name: a copy whose owner has not introduced themselves yet is "a listening
// journal", not somebody else's. It is the one string a fresh copy shows in a
// browser tab, and it has to be true of every copy rather than of one.
export function coverName(settings) {
  // The ornamented name wins where a person is reading. keeper_name is the
  // fallback rather than the other way round: display_name is null on almost
  // every copy, and null means "I did not want a second one of these".
  const shown = (settings?.display_name || '').trim();
  const keeper = (settings?.keeper_name || '').trim();
  return shown || keeper || 'A listening journal';
}

// The name of the software, as opposed to the name of any journal kept in it.
//
// Deliberately a constant and deliberately not a setting. Every other place
// this string used to appear was a bug — a copy wearing the first journal's
// name — and all of those are gone. This one is the opposite: it is the press
// mark, and it is supposed to be the same in every copy. A journal called
// after its keeper, followed by the name of the thing it was made with.
const SOFTWARE_NAME = 'Listening Notes';

// What this journal is called where a machine is doing the reading.
//
// The browser tab, the home-screen label, the feed's channel title, the title
// on a shared link. All of them are read by something that files, truncates or
// speaks the string rather than looking at it, and none of them cope with a
// name written in combining characters and box-drawing — which is exactly what
// somebody's own name on their own card is allowed to be. So this takes the
// plain keeper_name and never the ornamented display_name.
//
// The format is the same in every copy, with no special case for the one this
// software was written in. A journal is its keeper's; the software is the
// software; the separator is the whole distinction, and printing both is what
// lets a stranger tell a copy from a counterfeit without being told the rule.
export function titleName(settings) {
  const keeper = (settings?.keeper_name || '').trim();
  // A copy nobody has introduced yet still needs both halves. Falling back to
  // the software's name alone would have every unconfigured copy claiming to
  // *be* Listening Notes, which is the one thing the naming is meant to stop.
  return `${keeper || 'A listening journal'} \u00b7 ${SOFTWARE_NAME}`;
}

// ── The two columns this must never select ────────────────────────────────
// portrait_data and portrait_code hold the portrait and the portrait-made-into
// -a-code as base64, and together they are 307 kB of a 310 kB row. Nothing
// that reads settings wants them: every surface that shows either image points
// at /api/portrait through portrait_url or portrait_code_url, and that route
// does its own targeted SELECT for the bytes. They were pure freight on every
// caller.
//
// And the freight was enormous, because this is the most-read row in the
// database. The root layout reads it twice per page render, and the beacon
// route reads it every fifteen seconds for one field — so a single homepage
// tab left open moved about 580 MB a day, and a month of that is 17 GB against
// a 5 GB allowance. It read as a runaway poll and it was a runaway row.
//
// Named columns rather than SELECT * would be stricter still, and would also
// mean this list drifting out of step with the schema every time a column is
// added. Excluding the two that are known to be huge keeps new columns arriving
// for free and keeps the images out, which is the whole of the problem.
// Every column except those two, named. `SELECT *` minus a list is not
// something Postgres can express, and the two ways of faking it are both
// worse: to_jsonb() and subtract would hand back founded_at, why_date and
// updated_at as strings instead of dates, silently, and keying the list off
// EMPTY would drop why_essay and why_date — which are columns /get reads and
// EMPTY has never listed.
//
// The cost is that a column added later does not appear until it is added
// here. That is a real cost and it is the smaller one; the alternative was a
// silent type change or a silently missing page. Add new columns to this list.
const SETTINGS_FIELDS = [
  'id', 'journal_name', 'keeper_name', 'bio', 'portrait_url',
  'instagram_url', 'lastfm_user', 'site_address', 'founded_at',
  'pinned_entry_id', 'updated_at', 'about_intro', 'why_essay',
  'why_date', 'definitions', 'social_links', 'hidden_fields',
  'portrait_mime', 'send_me', 'portrait_position', 'rig_icon', 'rig',
  'portrait_code_url', 'display_name', 'serial', 'setup_complete',
  'bioanswers',
];
const SETTINGS_SELECT = SETTINGS_FIELDS.map(f => `"${f}"`).join(', ');

export async function pull_settings() {
  try {
    const [row] = await database.query(
      `SELECT ${SETTINGS_SELECT} FROM settings WHERE id = 1`
    );
    // definitions always comes back complete — whatever the owner rewrote,
    // folded over the shipped text — so nothing downstream has to know that
    // the column holds only the differences.
    const merged = { ...EMPTY, ...(row || {}) };
    merged.definitions = mergeDefinitions(row?.definitions);
    return merged;
  } catch {
    // A copy whose database has not been built yet still has to render its
    // first page. Failing to read settings is not a reason to show an error.
    return { ...EMPTY, definitions: mergeDefinitions(null) };
  }
}

// ── One field, for the most-repeated query in the app ─────────────────────
// The beacon asks every fifteen seconds, in every open tab, all day. It wants
// the Last.fm username and nothing else, and it used to get the whole settings
// row to find it — 310 kB before the images came out of that read, 5.1 kB
// after, and about 100 bytes now.
//
// The name says "settings" and the temptation will be to add a second field to
// it the next time something needs one on a hot path. Don't. The reason this
// function exists is that a general reader on a fifteen-second timer is how
// the transfer allowance was spent in the first place; a second field is how
// it grows back. Give the next hot path its own narrow reader.
export async function pull_beacon_settings() {
  try {
    const [row] = await database`SELECT lastfm_user FROM settings WHERE id = 1`;
    return { lastfm_user: row?.lastfm_user || null };
  } catch {
    return { lastfm_user: null };
  }
}

export async function save_settings(fields) {
  const patch = {};
  for (const key of WRITABLE) {
    if (key in fields) patch[key] = blankToNull(fields[key]);
  }
  if (Object.keys(patch).length === 0) return await pull_settings();

  // Anything already settled is quietly dropped before it can reach the query.
  // One read, and only when the caller actually mentioned one of them, so an
  // ordinary card save still costs what it did.
  const onceKeys = WRITE_ONCE.filter(key => key in patch);
  if (onceKeys.length) {
    const [settled] = await database.query(
      `SELECT ${onceKeys.map(k => `"${k}"`).join(', ')} FROM settings WHERE id = 1`
    );
    for (const key of onceKeys) {
      if (settled && settled[key] != null) delete patch[key];
    }
    // Every field the caller sent was one it was not allowed to change. There
    // is nothing left to write, and an INSERT with no columns is a syntax
    // error rather than a no-op.
    if (Object.keys(patch).length === 0) return await pull_settings();
  }

  // jsonb columns have to arrive as text. The driver will happily take a JS
  // array for a text column and turn it into a Postgres array literal, which
  // json refuses — "invalid input syntax for type json" — so the value is
  // serialised here rather than at every call site that might set it.
  // definitions goes through its own, more careful version of this below.
  for (const key of ['social_links', 'hidden_fields', 'rig', 'bioanswers']) {
    if (patch[key] != null && typeof patch[key] !== 'string') {
      patch[key] = JSON.stringify(patch[key]);
    }
  }

  // definitions is the one column edited a piece at a time. Writing it whole
  // would mean rewriting one rating's wording silently discarded every other
  // rewording the owner had done, so the incoming keys are folded over what is
  // already stored. Only the differences from the shipped text are kept: a key
  // set back to the default is dropped rather than stored as a copy of it, so
  // an owner who undoes an edit goes back to inheriting future wording changes.
  if (patch.definitions && typeof patch.definitions === 'object') {
    const [current] = await database`SELECT definitions FROM settings WHERE id = 1`;
    const combined = { ...(current?.definitions || {}) };
    for (const [key, value] of Object.entries(patch.definitions)) {
      if (!(key in DEFAULT_DEFINITIONS)) continue;      // fixed key set
      const diff = {};
      for (const field of ['label', 'body']) {
        if (value?.[field] != null && value[field] !== DEFAULT_DEFINITIONS[key][field]) {
          diff[field] = value[field];
        }
      }
      if (Object.keys(diff).length) combined[key] = diff;
      else delete combined[key];
    }
    patch.definitions = Object.keys(combined).length ? JSON.stringify(combined) : null;
  }

  // The pointer and the bytes are one fact and cannot be allowed to disagree.
  // Clearing the picture without clearing the path leaves a card confidently
  // asking for an image that is not there — and because that path is served
  // with a year of immutable caching, every browser that already had it goes on
  // showing a portrait the journal no longer holds. It stayed invisible here
  // for an hour for exactly that reason.
  if ('portrait_data' in patch && !patch.portrait_data) {
    const [row] = await database`SELECT portrait_url FROM settings WHERE id = 1`;
    if ((row?.portrait_url || '').startsWith('/api/portrait')) patch.portrait_url = null;
    patch.portrait_code = null;
    patch.portrait_code_url = null;
  }

  // Upsert on the fixed id, so the first save creates the row and every save
  // after it updates the same one. COALESCE on the excluded value would make
  // clearing a field impossible, so the update is written from the patch only —
  // fields the caller did not mention are left alone by not appearing here.
  const columns = Object.keys(patch);
  const values = columns.map(c => patch[c]);

  // Column names are quoted. Every one of them comes off WRITABLE, so this is
  // not about injection — it is that `serial` is also how this file's other
  // tables spell "auto-incrementing integer", and an unquoted one in a column
  // list is a coin toss on how the parser reads it.
  const [row] = await database.query(
    `INSERT INTO settings (id, ${columns.map(c => `"${c}"`).join(', ')})
     VALUES (1, ${columns.map((_, i) => `$${i + 1}`).join(', ')})
     ON CONFLICT (id) DO UPDATE SET
       ${columns.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ')},
       updated_at = now()
     RETURNING *`,
    values
  );
  return { ...EMPTY, ...row, definitions: mergeDefinitions(row?.definitions) };
}
