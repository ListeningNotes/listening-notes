export function parseRating(rating) {
  if (!rating) return 0;
  const n = parseFloat(rating);
  return isNaN(n) ? 0 : n;
}

// The horizon bar is nothing but the track ratings drawn as block characters,
// so it can be shown live during a session rather than only after formatting.
// buildHorizon and parseHorizon are inverses — keep the block set in step.
export function buildHorizon(tracks, trackRatings) {
  if (!tracks?.length) return '';
  const bars = ['▁','▂','▃','▄','▅','▆','▇','█'];
  return tracks.map((_, i) => {
    const r = trackRatings?.[i] || 0;
    return bars[Math.round((r / 5) * (bars.length - 1))];
  }).join('');
}

export function parseHorizon(horizon) {
  if (!horizon) return [];
  const BLOCK_MAP = { '\u2581': 0.12, '\u2582': 0.25, '\u2583': 0.37, '\u2584': 0.50, '\u2585': 0.62, '\u2586': 0.75, '\u2587': 0.87, '\u2588': 1.00 };
  if (horizon.trim().startsWith('[')) {
    try {
      const arr = JSON.parse(horizon);
      if (Array.isArray(arr)) return arr.map(v => parseFloat(v) / 5);
    } catch {}
  }
  return [...horizon.trim()].filter(c => BLOCK_MAP[c]).map(c => BLOCK_MAP[c]);
}

export function parseTracksFromNotes(notesText) {
  if (!notesText) return [];
  const results = [];
  const blocks = notesText.split(/\n\s*\n(?=\d+\.)/);
  for (const block of blocks) {
    // Accept em-dash, en-dash, or plain hyphen as separator; require stars after
    const m = block.match(/^(\d+)\.\s+(.+?)\s+[-\u2014\u2013]+\s+([\u2605\u2606 ]+)/m);
    if (!m) continue;
    const stars = (m[3].match(/\u2605/g) || []).length;
    const note = block.slice(m.index + m[0].length).replace(/^\n+/, '').trim();
    results.push({
      num: parseInt(m[1]),
      name: m[2].replace(/\*\*/g, '').trim(),
      stars,
      note,
    });
  }
  return results;
}

// The canonical track list for an entry. Reads the structured tracks column
// when it's there, and falls back to parsing the prose for anything not
// migrated — so a new entry and a 2024 one look the same to a renderer.
// Returns the shape the pages already use: { num, name, stars, note }.
export function entryTracks(entry) {
  if (Array.isArray(entry?.tracks) && entry.tracks.length) {
    return entry.tracks.map(t => ({
      num: t.number,
      name: t.title,
      stars: t.rating,          // real number — half ratings survive here
      note: t.note || '',
      favorite: !!t.favorite,   // starred song, separate from the rating
    }));
  }
  return parseTracksFromNotes(entry?.track_notes || entry?.notes);
}

// Renders a structured track list back into the two stored text shapes. Both
// are derived from the same source now, so they can't drift the way ★ text and
// the horizon string did.
export function serializeTracks(tracks) {
  const list = tracks || [];
  const track_notes = list
    .filter(t => (t.note || '').trim() || t.rating > 0)
    .map(t => {
      const stars = t.rating
        ? '★'.repeat(Math.floor(t.rating)) + (t.rating % 1 >= 0.5 ? '½' : '')
        : '';
      return `${t.number}. ${t.title}${stars ? ' — ' + stars : ''}${t.note ? '\n' + t.note : ''}`;
    })
    .join('\n\n');

  const ratings = Object.fromEntries(list.map((t, i) => [i, t.rating || 0]));
  return { track_notes, horizon: buildHorizon(list, ratings) };
}

export function splitNotes(notesText) {
  if (!notesText) return { albumNotes: '', trackNotes: '' };
  const clean = notesText.replace(/\*?\*?Album Notes\*?\*?/g, '').replace(/\*\*/g, '').trim();
  const trackSplit = clean.search(/Track Notes|\n\n\d+\.\s|\n\nTrack\s+\d+\s*[\u2014\u2013]/m);
  if (trackSplit > -1) {
    return {
      albumNotes: clean.slice(0, trackSplit).trim(),
      trackNotes: clean.slice(trackSplit).replace(/\*?\*?Track Notes\*?\*?/g, '').trim(),
    };
  }
  return { albumNotes: clean, trackNotes: '' };
}

// The column stores 'Personal Library'; the site just says 'Library'. This
// is display only — the stored value is still what the archive filter
// compares against and what new entries are written with, so the label can
// change without touching a single row. Anywhere entry_type is shown to a
// reader should go through here; anywhere it's compared or saved should not.
export function entryTypeLabel(type) {
  return type === 'Personal Library' ? 'Library' : (type || '');
}
