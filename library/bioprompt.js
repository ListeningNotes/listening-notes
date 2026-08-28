// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// library/bioprompt.js
// The nine openings a keeper can finish about themselves.
//
// This replaced a free-text bio, and the swap is the whole idea. Asked to
// describe yourself in a box you write a paragraph about the project; asked
// what you can never skip you write "Voodoo, side two" — which is the more
// useful sentence, and the one somebody else can recognise themselves in. A
// blank box is a hard question badly phrased.
//
// Nine, and every copy ships the same nine. That is deliberate: a keeper who
// could write their own prompts would be back at the blank box one level up,
// and the value of a fixed set is that two journals answering the same opening
// can be read against each other. Three get chosen and answered; the rest stay
// unasked.
//
// Stored as key and answer, never as the sentence — see `bioanswers` in
// schema.sql. The wording here is going to be revised, and revising it must
// not orphan what somebody wrote. A key that no longer matches anything in
// this list is dropped on render rather than printed bare, so retiring a
// prompt is safe and renaming one is a migration.
//
// The em dash belongs to the prompt rather than to the layout, because it is
// grammar: these are sentence openings, and the answer completes the sentence
// on the same line. "I can never skip — Voodoo, side two" is one thought. Set
// as a label above an answer it would be two.

export const BIO_PROMPTS = [
  { key: 'first-mine',  text: "The first album that was mine, not my family's —" },
  { key: 'alone',       text: 'What I put on when nobody’s around —' },
  { key: 'never-skip',  text: 'I can never skip —' },
  { key: 'defended',    text: 'The record I’ve defended the most —' },
  { key: 'never-got',   text: 'I never got into —' },
  { key: 'want',        text: 'What I want out of an album —' },
  { key: 'got-here',    text: 'I got here through —' },
  { key: 'wrong-about', text: 'The album I was wrong about —' },
  // The one that can be promoted to the card. It is the only opening here
  // addressed to the reader rather than about the keeper, and it is the reason
  // the button underneath it exists: you read what somebody is asking for,
  // then you send it. See IdentityCard, which looks this key up by name.
  { key: 'send-me',     text: 'If you’re sending me something, make it —' },
];

// How many a keeper answers. Three is enough to draw somebody and few enough
// that each one has to earn its place — nine answered is a questionnaire.
export const BIO_LIMIT = 3;

// The prompt the card may print above its button, if the keeper chose it.
export const CARD_PROMPT = 'send-me';

export function bioPrompt(key) {
  return BIO_PROMPTS.find(p => p.key === key) || null;
}

// What the column holds, turned into what a page prints. Anything without a
// live prompt or without an answer is dropped rather than rendered half — a
// retired key and an opening somebody started and abandoned look the same from
// here, and neither belongs on the page.
export function readBioAnswers(stored) {
  if (!Array.isArray(stored)) return [];
  return stored
    .map(row => {
      const prompt = bioPrompt(row?.key);
      const answer = typeof row?.answer === 'string' ? row.answer.trim() : '';
      return prompt && answer ? { key: prompt.key, text: prompt.text, answer } : null;
    })
    .filter(Boolean)
    .slice(0, BIO_LIMIT);
}
