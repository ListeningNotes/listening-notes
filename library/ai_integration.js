import Anthropic from '@anthropic-ai/sdk';
import { buildHorizon } from './entry_formatter.js';

function get_client() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

const RESEARCH_CALL = (album, artist) => ({
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
  }],
});

const SECTION_BY_HEADER = {
  'CONTEXT': 'context', 'PRODUCTION': 'production', 'RECEPTION': 'reception',
  'LISTEN FOR': 'listen_for', 'LISTEN_FOR': 'listen_for',
  'KEY FACTS': 'key_facts', 'KEY_FACTS': 'key_facts',
};

// Assembles the brief one text block at a time, mapping each run to its real
// web-search citations and numbering sources the first time they're cited.
// The model answers in ~18 separate text blocks (one per cited run), so feeding
// them in as they close lets the page fill in progressively; drained in one go
// the builder produces exactly the same result.
function briefBuilder(album, artist) {
  const sectionsMap = { context: [], production: [], reception: [], listen_for: [], key_facts: [] };
  const sourceReg = new Map();
  const rawText = [];
  let meta = {};
  let current = null;   // a section header carries across block boundaries

  const numFor = (url, title) => {
    if (!url) return null;
    if (!sourceReg.has(url)) sourceReg.set(url, { n: sourceReg.size + 1, url, title: title || url });
    return sourceReg.get(url).n;
  };

  return {
    addText(text, citations) {
      rawText.push(text);
      const cites = (citations || []).map(c => numFor(c.url, c.title)).filter(Boolean);
      let buf = [];
      const flush = () => {
        // Preserve internal whitespace so adjacent cited/uncited runs reconstruct
        // into prose without words jamming together; only skip empty runs.
        const t = buf.join('\n');
        if (t.trim() && current) sectionsMap[current].push({ text: t, cites });
        buf = [];
      };
      for (const line of text.split('\n')) {
        const mMeta = line.match(/^\s*META:\s*(\{.*\})/);
        const mHead = line.match(/^\s*#{1,3}\s*(.+?)\s*$/);
        const headKey = mHead && SECTION_BY_HEADER[mHead[1].toUpperCase()];
        if (mMeta) { flush(); try { meta = JSON.parse(mMeta[1]); } catch { /* ignore */ } continue; }
        if (headKey) { flush(); current = headKey; continue; }
        buf.push(line);
      }
      flush();
    },

    // Used only when the model cited nothing inline — surfaces the real results.
    addSearchResults(results) {
      (results || []).forEach(r => numFor(r.url, r.title));
    },

    hasSources: () => sourceReg.size > 0,

    // done=false is a snapshot mid-stream. The prose fallback is held back until
    // the end so a half-written answer isn't mistaken for one that ignored the
    // header format.
    build(done) {
      // complete marks a section the model has finished and moved on from, so
      // the page can serve whole sections in order rather than growing them
      // a fragment at a time.
      let sections = [
        ['context', 'Context'], ['production', 'Production'],
        ['reception', 'Reception'], ['listen_for', 'Listen For'],
      ].map(([key, label]) => ({ key, label, runs: sectionsMap[key], complete: done || current !== key }))
       .filter(s => s.runs.length > 0);
      const key_facts = sectionsMap.key_facts;

      // Fallback: if the marker format wasn't followed, show whatever prose came back.
      if (done && sections.length === 0 && key_facts.length === 0) {
        const raw = rawText.join('\n').trim();
        if (raw) sections = [{ key: 'context', label: 'Context', runs: [{ text: raw, cites: [] }], complete: true }];
      }

      return {
        album,
        artist,
        year: meta.year || '',
        genre: meta.genre || '',
        sections,
        key_facts,
        key_facts_complete: done || current !== 'key_facts',
        sources: [...sourceReg.values()].sort((a, b) => a.n - b.n),
        done,
      };
    },
  };
}

// Streams the briefing, yielding the whole brief-so-far each time a text block
// closes. Same call and same thoroughness as research_album — the difference is
// that the caller can start rendering at ~21s instead of waiting the full ~55s.
export async function* research_album_live(album, artist) {
  const client = get_client();
  const builder = briefBuilder(album, artist);
  const stream = client.messages.stream(RESEARCH_CALL(album, artist));

  let open = null;   // the text block currently being written

  for await (const event of stream) {
    if (event.type === 'content_block_start') {
      open = event.content_block.type === 'text' ? { text: '', citations: [] } : null;
    } else if (event.type === 'content_block_delta' && open) {
      if (event.delta.type === 'text_delta') open.text += event.delta.text;
      else if (event.delta.type === 'citations_delta') open.citations.push(event.delta.citation);
    } else if (event.type === 'content_block_stop' && open) {
      builder.addText(open.text, open.citations);
      open = null;
      yield builder.build(false);
    }
  }

  if (!builder.hasSources()) {
    const final = await stream.finalMessage();
    for (const block of final.content) {
      if (block.type === 'web_search_tool_result' && Array.isArray(block.content)) {
        builder.addSearchResults(block.content);
      }
    }
  }
  yield builder.build(true);
}

// One-shot version — drains the stream and hands back only the finished brief.
export async function research_album(album, artist) {
  let brief = null;
  for await (const partial of research_album_live(album, artist)) brief = partial;
  return brief;
}

// Assembles an entry out of what was written. Nothing here reaches a model any
// more: the only generated thing was the tag list, and tags are gone — the
// archive searches the notes and genre is its own field. So this is now a
// local, instant, free assembly of prose that was never round-tripped anyway.
export async function format_post({ brief, notes, rating, masterpiece, favorite, entryType, relationship, trackNotes, trackRatings, tracks }) {
  const trackNotesBlock = tracks?.length
    ? tracks.map((t, i) => {
        const note = trackNotes?.[i];
        const stars = trackRatings?.[i];
        if (!note && !stars) return null;
        const starStr = stars ? ('★'.repeat(Math.floor(stars)) + (stars % 1 >= 0.5 ? '½' : '')) : '';
        return (t.number || i+1) + '. ' + t.title + (starStr ? ' — ' + starStr : '') + (note ? '\n' + note : '');
      }).filter(Boolean).join('\n\n')
    : '';

  // Same bar the Score screen shows live during the session.
  const horizonString = buildHorizon(tracks, trackRatings);

  return {
    album_notes: notes,        // exactly as written — never round-tripped
    track_notes: trackNotesBlock,
    horizon: horizonString,
  };
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
