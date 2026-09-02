// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/ask/route.js
// A question, asked of something that already knows the album and the notes.
//
// Not a character and not a companion, so it has no name and no personality
// to keep up. Two uses, both from actual practice: while writing — what
// instrument is that, what is the word for this sound — and at the end,
// reading the track notes back and asking what connects them. The reason it
// lives here rather than in another tab is the second one: notes spread
// across a dozen screens cannot reasonably be pasted anywhere else. Context
// is the whole feature.
//
// Nothing it says ever enters the entry. It is read, and then the owner
// writes what they write — the same rule as the research.

import Anthropic from '@anthropic-ai/sdk';
import { requireWristband } from '@/library/wristband';

const SYSTEM = `You are a reference inside a personal listening journal. You are not a character, not a companion, and you have no name. The owner is logging an album and writing notes track by track; you already know the album and what they have written so far.

Two jobs:
- While they write: answer questions about music concretely — what an instrument or technique is, the word for a sound, who played on what, when something happened. Be specific.
- When asked about their own notes: read them back and say what connects them, or where they pull against each other. Point at their words. Never summarise their opinion back to them.

Rules:
- One short paragraph. About eighty words at most, unless a short list of facts genuinely needs more. The answer is read inside a small sheet on a phone.
- Start with the answer. No greetings, no "great question", no praise, no sign-off.
- Never write the entry for them, and never offer to draft, polish or rephrase their notes. You are read, and then they write.
- Plain text only: no markdown, no asterisks, no headings, no bullet points. Ordinary sentence capitalisation.
- Say when you are not sure rather than inventing a fact.`;

export async function POST(request) {
  // Bills against the API key on every call, so it stays behind the wristband
  // like /api/research.
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'This copy has no Anthropic key set, so there is nothing to ask.' });
  }

  try {
    const { message, history = [], context = {} } = await request.json();
    if (!message?.trim()) return Response.json({ error: 'Nothing was asked.' }, { status: 400 });

    // What it knows, in the order it is likely to matter.
    const lines = [];
    if (context.album) lines.push(`Album: ${context.album}${context.artist ? ` · ${context.artist}` : ''}${context.year ? ` (${context.year})` : ''}`);
    if (context.currentTrack) lines.push(`Track on screen: ${context.currentTrack}`);
    if (context.rating) lines.push(`Score so far: ${context.rating}`);
    if (Array.isArray(context.trackNotes) && context.trackNotes.length) {
      lines.push('Track notes so far:\n' + context.trackNotes.map(n => `  ${n}`).join('\n'));
    }
    if (context.albumNotes) lines.push(`Album note so far:\n${context.albumNotes}`);
    const system = lines.length ? `${SYSTEM}\n\nWhat is on the desk:\n${lines.join('\n')}` : SYSTEM;

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 320,
      system,
      messages: [
        ...history.slice(-12).map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
        { role: 'user', content: message },
      ],
    });

    const reply = response.content.find(b => b.type === 'text')?.text ?? '';
    return Response.json({ reply });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
