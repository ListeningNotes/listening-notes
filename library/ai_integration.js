import Anthropic from '@anthropic-ai/sdk';

function get_client() {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

export async function research_album(album, artist) {
  const client = get_client();
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1600,
    messages: [{
      role: 'user',
      content: `You are a music journalist and researcher with deep knowledge of recorded music history. Return a detailed JSON object about the album "${album}"${artist ? ` by ${artist}` : ''}.

RULES:
- Be specific. Name actual producers, engineers, studios, instruments, collaborators.
- Include real dates, chart positions, certification numbers, sales figures where you know them confidently.
- Describe the sonic and production details vividly.
- For context, describe what was actually happening in music at that exact moment.
- For reception, name actual publications or critics if you know them.
- Only state facts you are confident are accurate.

Return ONLY valid JSON with no markdown fences:
{
  "album": "exact album title",
  "artist": "artist name",
  "year": "release year",
  "genre": "specific genre(s), comma separated",
  "label": "record label",
  "debut": false,
  "notable_first": "",
  "production": "3-4 sentences about producer, studio, sonic details.",
  "context": "3-4 sentences about the artist and music landscape at the time.",
  "reception": "3-4 sentences about critical and commercial reception.",
  "key_facts": ["fact", "fact", "fact", "fact"],
  "listen_for": "3-4 specific sonic or compositional details worth paying attention to"
}`
    }]
  });

  const text = message.content[0].text;
  console.log("RAW FORMAT RESPONSE:", text);
  const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
  if (parsed.notes_prose && !parsed.album_notes) parsed.album_notes = parsed.notes_prose;
  return parsed;
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

Background context:
- Production: ${brief.production}
- Context: ${brief.context}
- Reception: ${brief.reception}

Raw listener notes:
${notes}

${trackNotesBlock ? `Per-track notes:\n${trackNotesBlock}` : ''}

Write a blog post in two parts:
1. BACKGROUND (1 short paragraph, 3-4 sentences max): Set the scene factually but warmly.
2. NOTES: Return the raw listener notes almost exactly as written. Fix spelling only. Do not rewrite, restructure, or improve sentences. Preserve all paragraph breaks exactly as they appear in the raw notes.

Include this horizon bar between the two sections (already calculated, use exactly): ${horizonString}

Also generate 8-12 tags relevant to this entry.

Return ONLY valid JSON, no markdown fences:
{
  "background": "full background section",
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
