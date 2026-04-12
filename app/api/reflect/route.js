// app/api/reflect/route.js
// The in-session chat companion. Called every time you send a message
// in the session chat panel while listening to an album.
// It knows the album context and your notes so far, so it can push
// your thinking rather than just answer generic music questions.

import Anthropic from '@anthropic-ai/sdk';
import { isAuthorized } from '../../../lib/auth';

// One shared Anthropic client. API key comes from environment variables.
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// POST — protected. Only your session tool can call this.
export async function POST(request) {

  // Auth check — reject anything without the correct SESSION_SECRET header.
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Pull everything the session tool sends:
    // - message: what you just typed in the chat
    // - brief: the research summary for this album
    // - overallNotes: your main notes textarea
    // - trackNotes: any per-track notes you've written
    // - trackRatings: your star ratings per track
    // - tracks: the full tracklist
    const { message, brief, overallNotes, trackNotes, trackRatings, tracks } = await request.json();

    // Check whether you've written any notes yet (overall or per-track).
    // This helps Claude know whether to reflect on your writing or just answer a question.
    const hasNotes = overallNotes?.trim() || Object.values(trackNotes || {}).some(n => n?.trim());

    // The system prompt defines Claude's personality and two modes of behavior.
    // This runs before every message — it's the standing brief Claude always has.
    const systemPrompt = `You are a music-knowledgeable listening companion embedded in a personal music journal called Listening Notes. You have two modes:

1. MUSIC KNOWLEDGE: Answer any question about music — instruments, production techniques, theory, history, gear, specific tracks, artists. Be specific and concrete. If asked about a drum sound, name it. If asked about an instrument, describe it precisely.

2. REFLECTION: When the listener shares their notes, help them think harder. Notice patterns they might have missed. Ask one sharp follow-up question. Point out contradictions or interesting tensions in their observations. Don't summarize back what they said — push forward.

Keep responses concise and conversational. You're a smart friend who knows music deeply, not a lecturer.`;

    // Build the user message dynamically based on what context exists.
    // We only include sections that have actual content — no empty fields.
    let userContent = '';

    // Include album info if a research brief exists
    if (brief) {
      userContent += `Album context: "${brief.album}" by ${brief.artist} (${brief.year || 'n/a'})\nGenre: ${brief.genre || 'n/a'}\n\n`;
    }

    // Include the tracklist so Claude can reference specific songs by name
    if (tracks?.length) {
      userContent += `Tracklist: ${tracks.map(t => `${t.number}. ${t.title}`).join(', ')}\n\n`;
    }

    // Include your notes if you've written any
    if (hasNotes) {
      if (overallNotes?.trim()) userContent += `Listener's overall notes: "${overallNotes}"\n\n`;

      // Add any per-track notes, matched back to their track titles
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

    // Finally, append what you actually asked or said
    userContent += `Listener asks: ${message}`;

    // Send everything to Claude and get a response
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600, // Kept short — this is a chat, not an essay
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });

    // Send Claude's reply back to the session chat panel
    return Response.json({ reply: msg.content[0].text });

  } catch (error) {
    // Something broke server-side — return the error with a 500 status
    return Response.json({ error: error.message }, { status: 500 });
  }
}