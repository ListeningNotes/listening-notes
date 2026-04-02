
// import-entries.mjs
import fs from 'fs';
import path from 'path';

const VERCEL_URL = 'https://listening-notes.vercel.app';
const CSV_PATH   = process.argv[2];
const DRY_RUN    = process.argv.includes('--dry-run');
const DELAY_MS   = 400;

if (!CSV_PATH) {
  console.error('Usage: node import-entries.mjs path/to/export.csv [--dry-run]');
  process.exit(1);
}

const RELATIONSHIP_MAP = {
  'revist':       'Revisit',
  'revisit':      'Revisit',
  'first listen': 'First Listen',
  'formative':    'Formative',
  'study':        'Study',
  'submission':   'Submission',
  'favorite':     'Favorite',
};

function normalizeRelationship(raw) {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  return RELATIONSHIP_MAP[key] || raw.trim();
}

function toSlug(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function parseStars(raw) {
  const s = String(raw || '');
  const filled = (s.match(/★/g) || []).length;
  const half   = (s.match(/½/g) || []).length;
  if (!filled && !half) return null;
  return filled + (half ? 0.5 : 0);
}

// Full CSV parser that handles quoted fields with embedded newlines
function parseCSV(content) {
  const rows = [];
  let row = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  while (i < content.length) {
    const ch = content[i];

    if (inQuotes) {
      if (ch === '"') {
        if (content[i+1] === '"') { field += '"'; i += 2; continue; }
        else { inQuotes = false; i++; continue; }
      }
      field += ch;
      i++;
    } else {
      if (ch === '"') { inQuotes = true; i++; continue; }
      if (ch === ',') { row.push(field); field = ''; i++; continue; }
      if (ch === '\n' || (ch === '\r' && content[i+1] === '\n')) {
        row.push(field);
        field = '';
        rows.push(row);
        row = [];
        if (ch === '\r') i++;
        i++;
        continue;
      }
      if (ch === '\r') { i++; continue; }
      field += ch;
      i++;
    }
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function run() {
  const content = fs.readFileSync(path.resolve(CSV_PATH), 'utf8');
  const rows = parseCSV(content);

  console.log(`Parsed ${rows.length} total rows (including header)`);

  let imported = 0, skipped = 0, errors = 0;

  console.log('Fetching existing entries to check for duplicates...');
  let existingSlugs = new Set();
  try {
    const res  = await fetch(`${VERCEL_URL}/api/entries`);
    const data = await res.json();
    const existing = data.entries || data || [];
    existing.forEach(e => { if (e.slug) existingSlugs.add(e.slug); });
    console.log(`Found ${existingSlugs.size} existing entries in DB.\n`);
  } catch (e) {
    console.warn('Could not fetch existing entries:', e.message);
  }

  for (let i = 1; i < rows.length; i++) {
    const cols = rows[i];

    const album        = (cols[0]  || '').trim();
    const artist       = (cols[1]  || '').trim();
    const year         = (cols[2]  || '').trim();
    const entry_type   = (cols[3]  || '').trim();
    const relationship = normalizeRelationship(cols[4]);
    const ratingRaw    = (cols[5]  || '').trim();
    const favoriteRaw  = (cols[6]  || '').trim().toLowerCase();
    const background   = (cols[7]  || '').trim();
    const notes        = (cols[8]  || '').trim();
    const tags         = (cols[9]  || '').trim();
    const horizon      = (cols[10] || '').trim();
    const album_art    = (cols[11] || '').trim();
    const post_link    = (cols[13] || '').trim();

    if (!album) { skipped++; continue; }

    const slug = toSlug(album);

    if (existingSlugs.has(slug)) {
      console.log(`  Row ${i+1}: "${album}" already exists — skipping.`);
      skipped++;
      continue;
    }

    const rating = parseStars(ratingRaw);
    const isMasterpiece = ratingRaw.toLowerCase().includes('masterpiece');

    const payload = {
      album,
      artist,
      year:         year ? parseInt(year, 10) : null,
      entry_type:   entry_type   || null,
      relationship: relationship || null,
      rating:       rating,
      favorite:     favoriteRaw === 'true' || favoriteRaw === '1',
      background:   background || null,
      notes:        notes      || null,
      tags:         tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : null,
      horizon:      horizon    || null,
      album_art:    album_art  || null,
      post_link:    post_link  || null,
    };

    if (DRY_RUN) {
      console.log(`  [DRY RUN] Row ${i+1}: "${album}" by ${artist} | rating: ${rating}${isMasterpiece ? ' (Masterpiece)' : ''} | relationship: ${relationship} | slug: ${slug}`);
      imported++;
      continue;
    }

    try {
      const res = await fetch(`${VERCEL_URL}/api/entries`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`  ✓ Row ${i+1}: "${album}" → /entries/${data.slug || slug}`);
        existingSlugs.add(data.slug || slug);
        imported++;
      } else {
        const text = await res.text();
        console.error(`  ✗ Row ${i+1}: "${album}" — HTTP ${res.status}: ${text}`);
        errors++;
      }
    } catch (err) {
      console.error(`  ✗ Row ${i+1}: "${album}" — ${err.message}`);
      errors++;
    }

    await sleep(DELAY_MS);
  }

  console.log('\n─────────────────────────────────');
  console.log(`Done.  Imported: ${imported}  |  Skipped: ${skipped}  |  Errors: ${errors}`);
  if (DRY_RUN) console.log('(Dry run — nothing was written)');
}

run();
