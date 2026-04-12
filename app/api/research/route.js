// app/api/research/route.js
// Called by the session tool when you click "Research".
// Sends the album + artist to Claude, gets back structured facts as JSON.

import Anthropic from '@anthropic-ai/sdk';
import { isAuthorized } from '../../../lib/auth';

// Creates one Anthropic client instance that this whole file uses.
// The API key is read from your environment variables — never hardcoded.
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// POST — protected. Only the session tool can call this.
// "POST" means this route receives data (the album name) rather than just serving a page.
export async function POST(request) {

  // Auth check — if the request doesn't have the correct SESSION_SECRET header, stop here.
  // Returns a 401 which means "you're not allowed in".
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Pull the album and artist out of the request body the session tool sent.
    const { album, artist } = await request.json();

    // Send a message to Claude asking for structured research about this album.
    // max_tokens limits how long Claude's response can be (controls cost + speed).
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1600,
      messages: [
        {
          role: 'user',
          content: `You are a music journalist and researcher with deep knowledge of recorded music history. Return a detailed JSON object about the album "${album}"${artist ? ` by ${artist}` : ''}.

RULES:
- Be specific. Name actual producers, engineers, studios, instruments, collaborators.
- Include real dates, chart positions, certification numbers, sales figures where you know them confidently.
- Describe the sonic and production details vividly — not just "guitars and drums" but what makes this album sound the way it does.
- For the context section, describe what was actually happening in music at that exact moment — what was charting, what movement this was part of or reacting against, what the artist's career looked like before this.
- For reception, name actual publications or critics if you know them, describe the initial reaction versus how it's regarded now if that changed.
- If this is a well-known album, give well-known-album level detail. Don't be vague about famous records.
- Only state facts you are confident are accurate. If something is obscure or uncertain, say so honestly rather than guessing.
- If this is a genuinely niche or undocumented album, acknowledge that honestly in the relevant fields.

Return ONLY valid JSON with no markdown fences:

{
  "album": "exact album title",
  "artist": "artist name",
  "year": "release year",
  "genre": "specific genre(s), comma separated",
  "label": "record label",
  "debut": false,
  "notable_first": "",
  "production": "3-4 sentences. Name the producer(s), studio(s), key engineers, notable instruments or techniques, what makes this sonically distinctive or innovative.",
  "context": "3-4 sentences. What was the artist's situation before this album? What was happening in music at this exact moment? What was this album reacting to or part of?",
  "reception": "3-4 sentences. How did critics respond at release — name publications if known. How did it chart and sell? Has its reputation changed over time?",
  "key_facts": [
    "specific, interesting, concrete fact",
    "specific, interesting, concrete fact",
    "specific, interesting, concrete fact",
    "specific, interesting, concrete fact"
  ],
  "listen_for": "3-4 specific sonic or compositional details worth paying close attention to — name actual tracks, instruments, moments, techniques"
}`
        }
      ]
    });

    // Claude returns an array of content blocks — we want the first one's text.
    const text = message.content[0].text;

    // Claude sometimes wraps JSON in extra text. This finds the first { and last }
    // to extract just the JSON portion, then parses it into a real JavaScript object.
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    const parsed = JSON.parse(text.slice(start, end + 1));

    // Send the parsed research object back to the session tool.
    return Response.json(parsed);

  } catch (error) {
    // If anything goes wrong, send back the error message with a 500 status
    // ("500" means something broke on the server side).
    return Response.json({ error: error.message }, { status: 500 });
  }
}