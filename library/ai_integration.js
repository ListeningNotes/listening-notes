import Anthropic from '@anthropic-ai/sdk';

function get_client() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export async function research_album(album, artist) {
  const client = get_client();
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 5 }],
    messages: [{
      role: 'user',
      content: `Research the album "${album}"${artist ? ` by ${artist}` : ''} using the web_search tool, then write a sourced briefing.

Verify the facts against reputable sources (Wikipedia, Discogs, AllMusic, Pitchfork, official label/artist pages, established music press). Ground every specific claim in what you actually find, and cite the sources as you write. If you cannot verify a detail, say so rather than inventing it.

Write your final answer EXACTLY in this shape — the META line first, then each section under its exact "## HEADER" marker on its own line:

META: {"year": "release year", "genre": "specific genre(s), comma separated"}
## CONTEXT
2-4 sentences: the artist and what was happening in music at the time.
## PRODUCTION
2-4 sentences: producer, studio, engineers, instruments, sonic details.
## RECEPTION
2-4 sentences: critical and commercial reception, naming real publications/critics.
## LISTEN FOR
2-4 sentences: specific sonic or compositional details worth paying attention to.
## KEY FACTS
- one verifiable fact
- one verifiable fact
- one verifiable fact`
    }]
  });

  // Walk the response in order, mapping each text run to its real web-search
  // citations. Sources are numbered the first time they're cited.
  const SECTION_BY_HEADER = {
    'CONTEXT': 'context', 'PRODUCTION': 'production', 'RECEPTION': 'reception',
    'LISTEN FOR': 'listen_for', 'LISTEN_FOR': 'listen_for',
    'KEY FACTS': 'key_facts', 'KEY_FACTS': 'key_facts',
  };
  const sectionsMap = { context: [], production: [], reception: [], listen_for: [], key_facts: [] };
  const sourceReg = new Map();
  const numFor = (url, title) => {
    if (!url) return null;
    if (!sourceReg.has(url)) sourceReg.set(url, { n: sourceReg.size + 1, url, title: title || url });
    return sourceReg.get(url).n;
  };
  let meta = {};
  let current = null;

  for (const block of message.content) {
    if (block.type !== 'text') continue;
    const cites = (block.citations || []).map(c => numFor(c.url, c.title)).filter(Boolean);
    let buf = [];
    const flush = () => {
      // Preserve internal whitespace so adjacent cited/uncited runs reconstruct
      // into prose without words jamming together; only skip empty runs.
      const text = buf.join('\n');
      if (text.trim() && current) sectionsMap[current].push({ text, cites });
      buf = [];
    };
    for (const line of block.text.split('\n')) {
      const mMeta = line.match(/^\s*META:\s*(\{.*\})/);
      const mHead = line.match(/^\s*#{1,3}\s*(.+?)\s*$/);
      const headKey = mHead && SECTION_BY_HEADER[mHead[1].toUpperCase()];
      if (mMeta) { flush(); try { meta = JSON.parse(mMeta[1]); } catch { /* ignore */ } continue; }
      if (headKey) { flush(); current = headKey; continue; }
      buf.push(line);
    }
    flush();
  }

  // If the model cited nothing inline, still surface the real search results.
  if (sourceReg.size === 0) {
    for (const block of message.content) {
      if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
        block.content.forEach(r => numFor(r.url, r.title));
      }
    }
  }
  const sources = [...sourceReg.values()].sort((a, b) => a.n - b.n);

  let sections = [
    ['context', 'Context'], ['production', 'Production'],
    ['reception', 'Reception'], ['listen_for', 'Listen For'],
  ].map(([key, label]) => ({ key, label, runs: sectionsMap[key] }))
   .filter(s => s.runs.length > 0);
  const key_facts = sectionsMap.key_facts;

  // Fallback: if the marker format wasn't followed, show whatever prose came back.
  if (sections.length === 0 && key_facts.length === 0) {
    const raw = message.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    if (raw) sections = [{ key: 'context', label: 'Context', runs: [{ text: raw, cites: [] }] }];
  }

  return {
    album,
    artist,
    year: meta.year || '',
    genre: meta.genre || '',
    sections,
    key_facts,
    sources,
  };
}

export async function format_post({ brief, notes, rating, masterpiece, favorite, entryType, relationship, trackNotes, trackRatings, tracks }) {
  const client = get_client();

  const trackNotesBlock = tracks?.length
    ? tracks.map((t, i) => {
        const note = trackNotes?.[i];
        const stars = trackRatings?.[i];
        if (!note && !stars) return null;
        const starStr = stars ? ('★'.repeat(Math.floor(stars)) + (stars % 1 >= 0.5 ? '½' : '')) : '';
        return (t.number || i+1) + '. ' + t.title + (starStr ? ' — ' + starStr : '') + (note ? '\n' + note : '');
      }).filter(Boolean).join('\n\n')
    : '';

  const horizonString = (() => {
    if (!tracks?.length) return '';
    const bars = ['▁','▂','▃','▄','▅','▆','▇','█'];
    return tracks.map((_, i) => {
      const r = trackRatings?.[i] || 0;
      return bars[Math.round((r / 5) * (bars.length - 1))];
    }).join('');
  })();

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{
      role: 'user',
      content: `You are the voice behind "Listening Notes," a music blog. Thoughtful, intimate, editorial.

Album: ${brief.album}
Artist: ${brief.artist}
Year: ${brief.year}
Genre: ${brief.genre}
Entry type: ${entryType || 'First Listen'}
Relationship: ${relationship || ''}
Rating: ${rating ? rating + '/5' + (masterpiece ? ' (masterpiece)' : '') : 'unrated'}

Raw listener notes:
${notes}

${trackNotesBlock ? `Per-track notes:\n${trackNotesBlock}` : ''}

This is a personal journal entry. Return the raw listener notes almost exactly as written — fix spelling only. Do not rewrite, restructure, summarize, or improve sentences, and do not add any album background or context of your own. Preserve all paragraph breaks exactly as they appear in the raw notes.

Include this horizon bar (already calculated, use exactly): ${horizonString}

Also generate 8-12 tags relevant to this entry.

Return ONLY valid JSON, no markdown fences:
{
  "album_notes": "full album-level notes section (no track notes here)",
  "track_notes": "all per-track notes formatted as: 1. Track Title — ★★★★★\nnote text\n\n2. Track Title — ★★★\nnote text",
  "horizon": "${horizonString}",
  "tags": ["tag1", "tag2"]
}`
    }]
  });

  const text = message.content[0].text;
  console.log("RAW FORMAT RESPONSE:", text);
  const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  if (parsed.notes_prose && !parsed.album_notes) parsed.album_notes = parsed.notes_prose;
  return parsed;
}

export async function ask_echo({ message, brief, overallNotes, trackNotes, tracks }) {
  const client = get_client();

  const system = `You are a music-knowledgeable listening companion embedded in a personal music journal called Listening Notes. You have two modes:

1. MUSIC KNOWLEDGE: Answer any question about music — instruments, production techniques, theory, history, gear, specific tracks, artists. Be specific and concrete.

2. REFLECTION: When the listener shares their notes, help them think harder. Notice patterns they might have missed. Ask one sharp follow-up question. Don't summarize back what they said — push forward.

Keep responses concise and conversational. You're a smart friend who knows music deeply, not a lecturer.`;

  let user = '';
  if (brief) user += `Album context: "${brief.album}" by ${brief.artist} (${brief.year || 'n/a'})\nGenre: ${brief.genre || 'n/a'}\n\n`;
  if (tracks?.length) user += `Tracklist: ${tracks.map(t => `${t.number}. ${t.title}`).join(', ')}\n\n`;
  if (overallNotes?.trim()) user += `Listener's overall notes: "${overallNotes}"\n\n`;

  const trackEntries = Object.entries(trackNotes || {}).filter(([,n]) => n?.trim());
  if (trackEntries.length && tracks) {
    user += 'Track notes:\n';
    trackEntries.forEach(([i, note]) => {
      const track = tracks[parseInt(i)];
      if (track && note.trim()) user += `- ${track.title}: "${note}"\n`;
    });
    user += '\n';
  }

  user += `Listener asks: ${message}`;

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system,
    messages: [{ role: 'user', content: user }],
  });

  return msg.content[0].text;
}
