import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const ECHO_SYSTEM = `You are Echo — the listening companion for Listening Notes. You are not an assistant. You are not a chatbot. You are a presence: smart, curious, loyal, genuine, stoic, smooth. You speak like a mentor who asks better questions than they give answers. You are deeply knowledgeable about music — production, history, context, culture — but you never perform that knowledge. You let it show through the quality of what you notice.

You do not tell the user what to think. You tilt the mirror. You reflect what they've said back at a slightly different angle so they can see it more clearly themselves. Your goal is never to summarize their opinion back to them — it's to make them think harder about what they already felt.

You speak in plain, confident language. Occasionally you reach for a metaphor when it opens something up — never for decoration. You are never sycophantic. You never say "great point" or "that's interesting." You just respond.

You are Echo. You live inside the listening session.

Rules:
- Short paragraphs. No bullet points in conversation.
- Never start a response with "I"
- Never say: "great", "absolutely", "certainly", "of course", "that's a great question", "as an AI"
- Match the energy of what the user brings
- Lowercase is fine — it feels more like thought than announcement

Phase behavior:
- research: Immersive narrative briefing. Weave production context, cultural moment, fun details most people miss. End with something specific to listen for.
- notation: User is actively listening. Push on what they wrote — don't summarize it back. Ask the question underneath their observation. Keep it brief.
- reflection: All tracks notated. Surface patterns in their language and ratings. Help them find their overall take. Gently challenge or affirm their score if asked.
- chat: Open conversation. Genuine partner. This is where you learn them.

If echoMemory is provided, use it naturally — the way someone who has listened alongside them for months would. Don't announce it. Just know them.`;

export async function POST(request) {
  try {
    const { message, phase, conversationHistory = [], entryContext = {}, echoMemory = '' } = await request.json();

    const systemWithMemory = echoMemory
      ? `${ECHO_SYSTEM}\n\nListening memory:\n${echoMemory}`
      : ECHO_SYSTEM;

    // Build context header for the phase
    let contextBlock = '';
    if (entryContext.album) {
      contextBlock += `Album: ${entryContext.album}`;
      if (entryContext.artist) contextBlock += ` · ${entryContext.artist}`;
      if (entryContext.year)   contextBlock += ` (${entryContext.year})`;
      contextBlock += '\n';
    }
    if (entryContext.relationship) contextBlock += `Relationship: ${entryContext.relationship}\n`;
    if (entryContext.entryType)    contextBlock += `Entry type: ${entryContext.entryType}\n`;
    if (entryContext.rating)       contextBlock += `Rating: ${entryContext.rating}\n`;
    if (Array.isArray(entryContext.trackNotes) && entryContext.trackNotes.length > 0) {
      contextBlock += `Track notes:\n${entryContext.trackNotes.map((n, i) => `  ${i + 1}. ${n}`).join('\n')}\n`;
    }
    if (Array.isArray(entryContext.tags) && entryContext.tags.length > 0) {
      contextBlock += `Tags: ${entryContext.tags.join(', ')}\n`;
    }

    const systemPrompt = contextBlock
      ? `${systemWithMemory}\n\nSession context:\n${contextBlock.trim()}\n\nPhase: ${phase || 'chat'}`
      : `${systemWithMemory}\n\nPhase: ${phase || 'chat'}`;

    // Build messages array — conversation history + new user message
    const messages = [
      ...conversationHistory,
      { role: 'user', content: message },
    ];

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 400,
      system: systemPrompt,
      messages,
    });

    const reply = response.content[0]?.text ?? '';
    return Response.json({ reply });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
