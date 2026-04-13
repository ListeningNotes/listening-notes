import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  try {
    const { message, brief, overallNotes, trackNotes, trackRatings, tracks } = await request.json();

    const hasNotes = overallNotes?.trim() || Object.values(trackNotes || {}).some(n => n?.trim());

    const systemPrompt = `You are a music-knowledgeable listening companion embedded in a personal music journal called Listening Notes. You have two modes:

1. MUSIC KNOWLEDGE: Answer any question about music — instruments, production techniques, theory, history, gear, specific tracks, artists. Be specific and concrete. If asked about a drum sound, name it. If asked about an instrument, describe it precisely.

2. REFLECTION: When the listener shares their notes, help them think harder. Notice patterns they might have missed. Ask one sharp follow-up question. Point out contradictions or interesting tensions in their observations. Don't summarize back what they said — push forward.

Keep responses concise and conversational. You're a smart friend who knows music deeply, not a lecturer.`;

    let userContent = '';

    if (brief) {
      userContent += `Album context: "${brief.album}" by ${brief.artist} (${brief.year || 'n/a'})\nGenre: ${brief.genre || 'n/a'}\n\n`;
    }

    if (tracks?.length) {
      userContent += `Tracklist: ${tracks.map(t => `${t.number}. ${t.title}`).join(', ')}\n\n`;
    }

    if (hasNotes) {
      if (overallNotes?.trim()) userContent += `Listener's overall notes: "${overallNotes}"\n\n`;
      const trackEntries = Object.entries(trackNotes || {}).filter(([,n]) => n?.trim());
      if (trackEntries.length && tracks) {
        userContent += 'Track notes:\n';
        trackEntries.forEach(([i, note]) => {
          const track = tracks[parseInt(i)];
          if (track && note.trim()) userContent += `- ${track.title}: "${note}"\n`;
        });
        userContent += '\n';
      }
    }

    userContent += `Listener asks: ${message}`;

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      timeout: 30000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });

    return Response.json({ reply: msg.content[0].text });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
