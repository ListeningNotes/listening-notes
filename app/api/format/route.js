import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request) {
  try {
    const {
      brief, notes, rating, masterpiece,
      favorite, entryType, relationship, horizonBar
    } = await request.json();

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1600,
      messages: [
        {
          role: 'user',
          content: `You are the voice behind "Listening Notes," a music blog. Thoughtful, intimate, editorial. You write like someone who loves music deeply and takes the act of listening seriously.

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

Write a blog post in two parts:

1. BACKGROUND (2-3 paragraphs): Set the scene — when this came out, who the artist was at that moment, the production style, how it was received. Use the context provided. Factual but warm. Do not invent facts not provided.

2. NOTES (2-4 paragraphs): Written in first person, drawn from the raw notes above. Polish into prose without losing the immediacy and personality of the listening experience. Keep the writer's voice.

${horizonBar ? 'Include a horizon bar between the two sections — a single line of Unicode block characters like ▁▂▃▆▇▇▆▃▂▁' : 'Do not include a horizon bar.'}

Also generate 8-12 tags relevant to this entry.

Return ONLY valid JSON, no markdown fences:
{
  "background": "full background section",
  "notes_prose": "full notes section",
  "horizon": "${horizonBar ? '▁▂▃▆▇ etc' : ''}",
  "tags": ["tag1", "tag2", "tag3"]
}`
        }
      ]
    });

    const text = message.content[0].text;
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    const parsed = JSON.parse(text.slice(start, end + 1));

    return Response.json(parsed);

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}