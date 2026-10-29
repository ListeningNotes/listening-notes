// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/dashboard/people/[id]/[slug]/page.js
// A friend's entry, read inside your own journal.
//
// Miyel, 2026-10-28: "can we have the actual entries open in app the same
// way as profile. not a separate page overlay." A friend's record opened
// their entry on their own site, which on a phone's home-screen app is a
// browser sheet over the app. Now it opens here, as their page does: the
// page is yours, the entry is theirs.
//
// ── What is read, and what is kept ────────────────────────────────────────
// Their entry as their own entry page serves it to any visitor —
// /api/entries/<slug>, public, without the chain a keeper alone may see —
// asked by this copy's server when the page opens, since a browser may not
// read another journal's routes (the same reason their beacon comes through
// here). Nothing is stored and nobody is told it was read. The writing still
// lives on their journal and nowhere else; this reads it where a visitor
// would, and lists none of it (DECISIONS, Public reads are allow-lists).
//
// ── Drawn by your entry page, wearing their name ──────────────────────────
// FullPostPage (or TrackNotePage for a note on one song), handed their
// entry inside a Bookplate of theirs — their name, their address, their
// face — so the page says whose it is. You are a reader here: no keeper's
// tools, no linking of names into your own archive, no folder tabs (they
// would walk your journal, not theirs). Message [name] goes through your
// outbox to them, about this entry, and is kept for Words (WritingTo).
//
// Only somebody in your book: the id is the book's row.
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { wristbandOnHand } from '@/library/wristband';
import { pull_person } from '@/library/people_actions';
import { journalUrl } from '@/library/return_address';
import { Bookplate } from '@/components/main_components/Bookplate';
import { WritingTo } from '@/components/main_components/Slug_Page/MessageForm';
import PostClient from '../../../../entries/[slug]/FullPostPage';
import TrackNotePage from '../../../../entries/[slug]/TrackNotePage';

// How long their journal gets to answer, as everywhere else one is asked.
const EACH_MS = 8000;

export default async function FriendEntryPage({ params, layered = false }) {
  if (!(await wristbandOnHand())) redirect('/login');
  const { id, slug } = await params;
  const person = await pull_person(Number(id)).catch(() => null);
  if (!person) {
    return (
      <div className="own-screen own-screen--layered">
        <div className="own-empty">Nobody by that page. <Link href="/dashboard/people" className="own-link">Your friends</Link></div>
      </div>
    );
  }
  const name = String(person.name || '').trim();
  const there = journalUrl(person.address);

  let entry = null;
  let answered = true;
  try {
    const r = await fetch(`${there}/api/entries/${encodeURIComponent(slug)}`, {
      signal: AbortSignal.timeout(EACH_MS),
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    if (r.ok) entry = (await r.json().catch(() => null))?.entry || null;
    else answered = r.status === 404;
  } catch {
    answered = false;
  }

  if (!entry) {
    return (
      <div className="own-screen own-screen--layered">
        <div className="own-empty">
          {answered
            ? <>That entry isn&rsquo;t on {name || 'their'}&rsquo;s journal any more. </>
            : <>{name || 'Their'}&rsquo;s journal isn&rsquo;t answering just now. </>}
          <Link href={`/dashboard/people/${person.id}`} className="own-link">{name || 'Their page'}</Link>
        </div>
      </div>
    );
  }

  const theirs = { keeper_name: name, site_address: person.address, portrait_url: `${there}/api/portrait` };
  const to = {
    person_id: person.id,
    about: { slug: entry.slug, album: entry.album, artist: entry.artist, art: entry.album_art || '', song: entry.song || '' },
  };
  return (
    <Bookplate settings={theirs}>
      <WritingTo to={to}>
        {entry.song
          ? <TrackNotePage entry={entry} authed={false} layered={layered} folder={null} />
          : <PostClient entry={entry} references={[]} authed={false} layered={layered} folder={null} />}
      </WritingTo>
    </Bookplate>
  );
}
