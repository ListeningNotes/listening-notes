// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/api/messages/route.js
// Messages: somebody's words, addressed to this journal's keeper.
//
// POST is public, and has two kinds of caller, the way a send has
// (app/api/submissions/route.js):
//
//   a person     on a page this copy serves, writing from an entry. They
//                give a name, and their journal if they keep one. Counted
//                against the machine they are writing from.
//   a journal    another keeper's server, because its keeper wrote back or
//                wrote from their own address book (library/outbox.js).
//                Counted against the journal it names, and before anything
//                is kept this copy asks that journal its keeper's name, the
//                way filing an address does, and keeps the name it got back.
//
// What is handed over:
//
//   name      who is writing
//   journal   where they keep their own, when they keep one
//   said      the words
//   about     the entry it is about, when it is about one: `slug`, and
//             `journal` when the entry is not one of this journal's own,
//             with the `album`, `artist`, `art` and `song` as the sender's
//             copy knew them
//   answering the words it replies to, when it is a reply. Kept only from
//             another keeper's copy: a form on a page has the keeper's own
//             note to answer, and that is read off the entry, never taken
//             from whoever is writing
//
// Anything else in the body is ignored, not refused: a field a later
// version adds has to be one this version can drop on the floor (AGENTS.md:
// what crosses between copies has to survive a copy that is months old).
//
// Nothing is ever published and nothing is reported back. The answer says
// only that the message was kept.
//
// Never answers 404 on purpose, and always answers in JSON: a copy writing
// here reads anything that is not JSON as a journal too old to take a
// message, and says so to its keeper (library/outbox.js).
//
// GET, PATCH and DELETE are the keeper's: the list the inbox draws, a
// message opened, and a message dismissed — which deletes it.
import { requireWristband } from '@/library/wristband';
import { mayKnock, tooSoon, whoIsKnocking } from '@/library/doorman';
import { ask_journal_name } from '@/library/people_actions';
import { tidyJournal } from '@/library/return_address';
import { pull_settings } from '@/library/settings_actions';
import {
  SAID_MOST, sameJournal, pull_messages, save_message, see_message, remove_message,
} from '@/library/message_actions';

// Whether this looks like one copy's server talking to another rather than
// a person's browser: no Origin and no Referer, with a journal named. A hint
// and not a proof, and it buys nothing but being counted against the journal
// claimed — which is then asked whether it is there. The reasoning is the
// send route's, where it was first needed.
const looksLikeAServer = request =>
  !request.headers.get('origin') && !request.headers.get('referer');

export async function POST(request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return Response.json({ error: 'Nothing readable was sent.' }, { status: 400 });
  }

  const said = typeof body.said === 'string' ? body.said.trim() : '';
  if (!said) return Response.json({ error: 'Say something first.' }, { status: 400 });
  // Refused, not trimmed. Cutting somebody's words to fit and saying it
  // worked would lose the end of what they wrote without telling them; a
  // refusal leaves all of it in the form they are looking at.
  if (said.length > SAID_MOST) {
    return Response.json(
      { error: `That is longer than a message can be. It holds about ${SAID_MOST} characters, and nothing was sent.` },
      { status: 400 },
    );
  }

  const journal = tidyJournal(body.journal);
  const server = Boolean(journal) && looksLikeAServer(request);
  const from = whoIsKnocking(request);

  try {
    const own = tidyJournal((await pull_settings())?.site_address);
    if (sameJournal(journal, own)) {
      return Response.json({ error: 'A journal cannot write to itself.' }, { status: 400 });
    }

    let name = typeof body.name === 'string' ? body.name.trim() : '';

    if (server) {
      // The loose door first: it is what stops a script making this journal
      // fetch a thousand made-up addresses. Then the one that means
      // something, counted against the journal and not the machine.
      const relayed = mayKnock('relay', from);
      if (!relayed.allowed) return tooSoon(relayed.retryAfter);
      const counted = mayKnock('message', journal);
      if (!counted.allowed) return tooSoon(counted.retryAfter);
      // Real, and called what it says it is called — or not kept at all.
      const answered = await ask_journal_name(journal);
      if (!answered) {
        return Response.json(
          { error: 'That journal did not answer, so the message was not kept.' },
          { status: 422 },
        );
      }
      name = answered;
    } else {
      // A person on a page. Open to anyone, which is the point, and
      // therefore open to a script. See library/doorman.js.
      const counted = mayKnock('message', from);
      if (!counted.allowed) return tooSoon(counted.retryAfter);
      if (!name) return Response.json({ error: 'A name is required.' }, { status: 400 });
    }

    await save_message({
      from_name: name,
      from_journal: journal,
      said,
      about: body.about,
      answering: server && typeof body.answering === 'string' ? body.answering : null,
      own,
    });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  try {
    return Response.json({ messages: await pull_messages() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  const id = Number((await request.json().catch(() => ({})))?.id);
  if (!Number.isInteger(id) || id < 1) return Response.json({ error: 'Which one?' }, { status: 400 });
  try {
    await see_message(id);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;
  const id = Number((await request.json().catch(() => ({})))?.id);
  if (!Number.isInteger(id) || id < 1) return Response.json({ error: 'Which one?' }, { status: 400 });
  try {
    await remove_message(id);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
