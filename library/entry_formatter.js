export function parseRating(rating) {
  if (!rating) return 0;
  const n = parseFloat(rating);
  return isNaN(n) ? 0 : n;
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
