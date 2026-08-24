import database from './database_connection.js';

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
};

// Anything a caller sends that is not one of these is ignored. An allow-list
// rather than trusting the request body, so a stray field cannot reach the
// query — and so adding a setting is a deliberate act in this file.
const WRITABLE = [
  'journal_name', 'keeper_name', 'bio', 'portrait_url',
  'instagram_url', 'lastfm_user', 'site_address',
  'founded_at', 'pinned_entry_id',
];

// A form posts empty strings for fields left alone; the database should hold
// null. Otherwise "no Instagram" becomes an empty link rather than no link.
const blankToNull = v => (typeof v === 'string' && v.trim() === '' ? null : v);

export async function pull_settings() {
  try {
    const [row] = await database`SELECT * FROM settings WHERE id = 1`;
    return row ? { ...EMPTY, ...row } : { ...EMPTY };
  } catch {
    // A copy whose database has not been built yet still has to render its
    // first page. Failing to read settings is not a reason to show an error.
    return { ...EMPTY };
  }
}

export async function save_settings(fields) {
  const patch = {};
  for (const key of WRITABLE) {
    if (key in fields) patch[key] = blankToNull(fields[key]);
  }
  if (Object.keys(patch).length === 0) return await pull_settings();

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
  return { ...EMPTY, ...row };
}
