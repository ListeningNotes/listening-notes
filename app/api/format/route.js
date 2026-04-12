// app/api/format/route.js
// Called by the session tool when you click "Format & Done".
// Takes your raw notes + the research brief and asks Claude to turn them into
// polished prose in your voice. Returns background text, notes prose, horizon bar, and tags.

import Anthropic from '@anthropic-ai/sdk';
import { isAuthorized } from '../../../lib/auth';

// One shared Anthropic client for this file.
// API key comes from environment variables — never written directly in code.
const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// POST — protected. Only the session tool can call this.
export async function POST(request) {

  // Auth check — no valid SESSION_SECRET header means we stop immediately.
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Pull everything the session tool sent — your notes, the research brief,
    // your rating, and all the metadata you filled in.
    const {
      brief, notes, rating, masterpiece,
      favorite, entryType, relationship, horizonBar
    } = await request.json();

    // Send it all to Claude with instructions to spellcheck and format.
    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1600,
      messages: [
        {
          role: 'user',
          content: `You are a precise editor, not a writer. Your job is to assist, not to create.

          Album: ${brief.album}
          Artist: ${brief.artist}
          Year: ${brief.year}
          Genre: ${brief.genre}
          Entry type: ${entryType || 'First Listen'}
          Relationship: ${relationship || ''}
          Rating: ${rating ? rating + '/5' + (masterpiece ? ' (masterpiece)' : '') : 'unrated'}

          Background source material (from research brief):
          - Production: ${brief.production}
          - Context: ${brief.context}
          - Reception: ${brief.reception}

          Raw listener notes (the writer's own words):
          ${notes}

          Your tasks:
          1. BACKGROUND: Write 2-3 concise paragraphs drawn strictly from the background source material above. Factual, warm, readable. This is for a general reader — keep it shorter and more accessible than the full research brief. Do not invent anything not present in the source material.

          2. NOTES: Take the raw listener notes and fix only spelling mistakes and obvious grammar errors. Do not rephrase. Do not improve word choice. Do not add sentences. The thoughts, structure, and voice must remain entirely the writer's own.

          ${horizonBar ? 'Include a horizon bar between the two sections — a single line of Unicode block characters like ▁▂▃▆▇▇▆▃▂▁' : 'Do not include a horizon bar.'}

          Generate 8-12 tags relevant to this entry.

          Return ONLY valid JSON, no markdown fences:
          {
          "background": "concise background section",
          "notes_prose": "lightly corrected listener notes — voice fully preserved",
          "horizon": "${horizonBar ? '▁▂▃▆▇ etc' : ''}",
          "tags": ["tag1", "tag2", "tag3"]
          }`
        }
      ]
    });

    // Extract just the JSON from Claude's response.
    const text = message.content[0].text;
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    const parsed = JSON.parse(text.slice(start, end + 1));

    // Send the formatted entry back to the session tool.
    return Response.json(parsed);

  } catch (error) {
    // Something broke server-side — send back the error with a 500 status.
    return Response.json({ error: error.message }, { status: 500 });
  }
}