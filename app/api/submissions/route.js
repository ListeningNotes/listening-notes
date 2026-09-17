// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
import { save_submission, pull_submissions } from '@/library/submission_actions';
import { mayKnock, tooSoon, whoIsKnocking } from '@/library/doorman';
import { requireWristband } from '@/library/wristband';
import { tidyAddress, tidyJournal } from '@/library/return_address';
import { ask_journal_name } from '@/library/people_actions';

// The email check that used to live here is gone with the field. Anything a
// caller still sends under that key is dropped on the floor rather than
// validated — save_submission does not take it.
//
// A name is required by the send flow and checked here as well, because a
// route is not a form: it has to state its own rules rather than trust that
// the only thing posting to it is the page that shipped with it.
//
// ── Two kinds of sender, 2026-09-16 ───────────────────────────────────────
// This route had one caller until now: a visitor's browser, on the form this
// copy serves, at this copy's own address. It has a second now — another
// keeper's *server*, posting from their copy because they pressed Send in
// their own address book (library/outbox.js).
//
// Nothing about the shape of the request changes, and that is the point: the
// visitor form is untouched and an older copy that knows nothing about any of
// this goes on accepting sends from a newer one, because the only new field is
// one it will quietly ignore. What changes is how the door counts, and why —
// see library/doorman.js. Servers do not enforce CORS, so no browser rule was
// ever in the way of this; the only thing that was is that a shared platform
// address is not an identity.

// Whether this looks like one copy's server talking to another rather than a
// person's browser. A browser attaches an Origin to a cross-origin POST and
// cannot be stopped from doing so; a server attaches nothing unless it chooses
// to. So no Origin and no Referer, with a journal named, is a server send.
//
// It is a hint and not a proof, and it does not have to be a proof: claiming
// to be a server send buys nothing except being counted against the journal
// you claim to be — and that claim is checked below. The worst a liar gets is
// somebody else's allowance, five sends in ten minutes, which is a nuisance
// and not a way in.
const looksLikeAServer = request =>
  !request.headers.get('origin') && !request.headers.get('referer');

export async function POST(request) {
  const from = whoIsKnocking(request);
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Nothing readable was sent.' }, { status: 400 });
  }

  const journal = tidyJournal(body?.sender_url);
  const server = Boolean(journal) && looksLikeAServer(request);

  if (server) {
    // The loose one first, and it is not about pacing anybody: it is what
    // stops a script making this journal fetch a thousand made-up addresses.
    const relay = mayKnock('relay', from);
    if (!relay.allowed) return tooSoon(relay.retryAfter);
    // Then the one that means something. Counted against the journal rather
    // than the machine, because every copy on a platform leaves from the same
    // few addresses and counting those would count every keeper as one sender.
    const knock = mayKnock('send', journal);
    if (!knock.allowed) return tooSoon(knock.retryAfter);
    // And a journal is only worth counting if it is really there. This is the
    // same question filing an address in the book asks, of the same public
    // route, for the same reason — an address that does not answer as a
    // journal is not one.
    const answered = await ask_journal_name(journal);
    if (!answered) {
      return Response.json(
        { error: 'That journal did not answer, so the send was not accepted.' },
        { status: 400 },
      );
    }
  } else {
    // A person on the form. Open to anyone, which is the point, and therefore
    // open to a script. See library/doorman.js.
    const knock = mayKnock('submission', from);
    if (!knock.allowed) return tooSoon(knock.retryAfter);
  }

  try {
    const {
      album, artist, year, note, submitter_name,
      album_art, collection_id, sender_url, quiet, sender_entry,
    } = body;

    if (!album?.trim() || !artist?.trim() || !note?.trim()) {
      return Response.json({ error: 'Album, artist, and note are required.' }, { status: 400 });
    }

    if (!submitter_name?.trim()) {
      return Response.json({ error: 'A name is required.' }, { status: 400 });
    }

    // Tidied here as well as in the browser, and this is the copy that
    // matters. The send page normalises what is typed, but a route cannot
    // assume the only thing posting to it is the page that shipped with it —
    // and the inbox turns this value into a link somebody clicks. tidyAddress
    // keeps only a bare host, so what is stored can never carry a scheme of
    // its own and the inbox's https:// prefix cannot be escaped. Anything that
    // does not look like a host at all is dropped rather than refused: it is
    // an optional field, and rejecting a whole send over it would lose the
    // message, which is the part that mattered.
    const submission = await save_submission({
      album, artist, year, note, submitter_name,
      album_art, collection_id,
      sender_url: tidyAddress(sender_url),
      // Whether the sender asked not to be credited. Coerced rather than
      // trusted: a route states its own rules, and anything that is not a
      // clear yes is the default, which is public.
      quiet: quiet === true,
      // Which of their own entries they sent it from, when they sent it from
      // one. Only meaningful beside sender_url — the two together are an
      // address on their journal — so it is dropped when there is no journal
      // to hang it on, and it is never trusted enough to be fetched here.
      // A slug is a short name and nothing else: anything with a slash, a
      // scheme or a space in it is not one, and is not stored.
      sender_entry: sender_url && typeof sender_entry === 'string'
        && /^[a-z0-9-]{1,200}$/i.test(sender_entry.trim())
        ? sender_entry.trim().toLowerCase()
        : null,
    });
    return Response.json({ submission });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  const blocked = await requireWristband(request);
  if (blocked) return blocked;

  try {
    const submissions = await pull_submissions();
    return Response.json({ submissions });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
