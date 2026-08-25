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
// journal's. The one exception is journal_name, which needs *something* on the
// cover before the welcome screen has run.
const EMPTY = {
  journal_name: 'A listening journal',
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
  definitions: null,
};

// Anything a caller sends that is not one of these is ignored. An allow-list
// rather than trusting the request body, so a stray field cannot reach the
// query — and so adding a setting is a deliberate act in this file.
const WRITABLE = [
  'journal_name', 'keeper_name', 'bio', 'portrait_url',
  'instagram_url', 'lastfm_user', 'site_address',
  'founded_at', 'pinned_entry_id', 'about_intro', 'social_links',
  'hidden_fields', 'definitions',
  // The uploaded portrait. Written by /api/portrait rather than by a form, but
  // it goes through the same door as everything else in this table.
  'portrait_data', 'portrait_mime',
];

// A form posts empty strings for fields left alone; the database should hold
// null. Otherwise "no Instagram" becomes an empty link rather than no link.
const blankToNull = v => (typeof v === 'string' && v.trim() === '' ? null : v);

export async function pull_settings() {
  try {
    const [row] = await database`SELECT * FROM settings WHERE id = 1`;
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

export async function save_settings(fields) {
  const patch = {};
  for (const key of WRITABLE) {
    if (key in fields) patch[key] = blankToNull(fields[key]);
  }
  if (Object.keys(patch).length === 0) return await pull_settings();

  // jsonb columns have to arrive as text. The driver will happily take a JS
  // array for a text column and turn it into a Postgres array literal, which
  // json refuses — "invalid input syntax for type json" — so the value is
  // serialised here rather than at every call site that might set it.
  // definitions goes through its own, more careful version of this below.
  for (const key of ['social_links', 'hidden_fields']) {
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

  // Upsert on the fixed id, so the first save creates the row and every save
  // after it updates the same one. COALESCE on the excluded value would make
  // clearing a field impossible, so the update is written from the patch only —
  // fields the caller did not mention are left alone by not appearing here.
  const columns = Object.keys(patch);
  const values = columns.map(c => patch[c]);

  const [row] = await database.query(
    `INSERT INTO settings (id, ${columns.join(', ')})
     VALUES (1, ${columns.map((_, i) => `$${i + 1}`).join(', ')})
     ON CONFLICT (id) DO UPDATE SET
       ${columns.map(c => `${c} = EXCLUDED.${c}`).join(', ')},
       updated_at = now()
     RETURNING *`,
    values
  );
  return { ...EMPTY, ...row, definitions: mergeDefinitions(row?.definitions) };
}
