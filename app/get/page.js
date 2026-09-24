// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/get/page.js
// Get your copy: ten steps, then the button.
//
// This is the address every copy's About pane sends people to. Anybody here
// has already decided — they have seen a journal working, on a friend's phone
// or in a post — so there is no pitch on this page; About carries it. What is
// left is instructions and a button.
//
// ── The button is at the foot, 2026-09-22 ──────────────────────────────────
// After step ten, not at the top. People read what is above a button before
// they reach it: a button at the top gets pressed before the Neon step is
// read, and the Neon step is where installs break. Step two says where it
// is, so nobody hunts for it (Miyel's brief, About, /get and Give, §2).
//
// It replaced a door with three links — the steps at /get/install, the story,
// and "It didn't work". The steps are this page now and /get/install is gone.
// The other two came off the same day, on Miyel's call. The story keeps its
// own address, /get/story, and is linked from nowhere for now — bringing it
// back is a link at the foot of this page. The holding pages a new copy can
// stop on still carry "It didn't work" (ComingSoon.js), which is where
// somebody is when it has not worked.
//
// Screenshot slots read from public/install/ and draw only when the file
// exists, so the page reads correctly before the pictures are taken and they
// can be added without touching this file. The filenames are in NOTES. This
// is the one part of the page that has to happen on the server.
//
// The drawer rule: a copy that has not written the essay 404s here rather
// than serving a door to somebody else's software under its own address.
// `/get` is Miyel's page on Miyel's copy.
//
// ── A gift, 2026-09-22 ─────────────────────────────────────────────────────
// Somebody who arrives through Give's code arrives with `?gift=<the giver's
// journal>`, and the page asks that journal what its keeper is called — the
// same question filing an address asks (ask_journal_name). If it answers, a
// card under the mark says whose gift this is, with their face; if it does
// not, nothing — never a broken card and never the raw address (Miyel's
// brief, About, /get and Give, §4). Nothing here writes, logs or counts it.
//
// The question is an outbound request this copy makes because a link said
// to, from a public page, so it goes through the doorman's relay door — the
// one that exists so a script cannot make this server fetch a thousand
// made-up journals — and is given two and a half seconds rather than six: a
// stranger is looking at a page that waits on it. A gift from this journal
// itself is answered from its own settings, with no request at all.
//
// ── The gift rides in the button, 2026-09-23 ───────────────────────────────
// When the card shows, the deploy button carries the giver too: Vercel puts
// a GIFT_FROM box on its database screen, above Deploy, already filled in,
// and the new journal's setup reads it after the claim and offers to add
// them (DECISIONS). Only when the card shows — a journal that answered — so
// the button carries exactly whose gift the page said it was, and a made-up
// address never reaches somebody's deploy. Seen through a real install on
// Miyel's phone the same evening. A sign-in partway drops the whole link, and
// pressing the button again brings the gift back with it.

import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
// The server's own set: the plain import reaches for React context, which a
// server component does not have.
import { Gift, User } from '@phosphor-icons/react/ssr';
import { pull_settings, titleName } from '../../library/settings_actions';
import { ask_journal_name } from '../../library/people_actions';
import { tidyJournal, journalUrl } from '../../library/return_address';
import { mayKnock, whoIsKnocking } from '../../library/doorman';
import { DEPLOY_URL, STEPS } from '../../library/install_guide';
import InstallSteps from '../../components/main_components/InstallSteps';

export async function generateMetadata() {
  const settings = await pull_settings();
  if (!settings.why_essay?.trim()) return {};
  return { title: `Get your copy · ${titleName(settings)}` };
}

export default async function GetPage({ searchParams }) {
  const settings = await pull_settings();
  if (!settings.why_essay?.trim()) notFound();

  // Which pictures exist, in step order.
  const shots = STEPS.map(step =>
    existsSync(join(process.cwd(), 'public', 'install', `${step.shot}.png`)));

  // Whose gift this is, when the link came from Give. See the note above.
  const { gift } = await searchParams;
  const giver = tidyJournal(typeof gift === 'string' ? gift : '');
  let giverName = null;
  if (giver && giver === tidyJournal(settings.site_address)) {
    giverName = String(settings.keeper_name || '').trim() || null;
  } else if (giver && mayKnock('relay', whoIsKnocking({ headers: await headers() })).allowed) {
    giverName = await ask_journal_name(giver, 2500);
  }
  // The button, with the giver in it when there is one. The description is
  // the line under the box on Vercel's screen, and the words were read there.
  const deployUrl = giverName
    ? `${DEPLOY_URL}&env=GIFT_FROM`
      + `&envDefaults=${encodeURIComponent(JSON.stringify({ GIFT_FROM: giver }))}`
      + `&envDescription=${encodeURIComponent('Who gave you this journal. Leave it as it is, and your journal will offer to add them when you set it up.')}`
    : DEPLOY_URL;

  return (
    <main className="get-wrap get-wrap--steps">
      {/* The mark is in the nav row above; see SiteNav. */}
      <header className="get-top">
        {/* The giver's card: their face over a plain mark, which is what
            shows if their journal has no portrait — the address book's
            faces work the same way — then who it is from, and the gift. */}
        {giverName && (
          <div className="ln-tile get-gift">
            <span className="get-gift-face" aria-hidden="true">
              <User size={20} />
              <img src={`${journalUrl(giver)}/api/portrait`} alt="" />
            </span>
            <span className="get-gift-words">
              <span className="get-gift-from">A gift from</span>
              <span className="get-gift-name">{giverName}</span>
            </span>
            <Gift size={20} className="get-gift-glyph" aria-hidden="true" />
          </div>
        )}
        <p className="get-kicker">Get your copy</p>
        <p className="get-lede">
          Ten steps, about fifteen minutes, on a phone or a laptop. Read them
          first; the button is at the foot.
        </p>
      </header>

      <InstallSteps shots={shots} />

      {/* Square corners and filled, the one thing on this page a person came
          to press, in the page's own words and face — no arrow (Miyel,
          2026-09-22). The caption says Vercel because Vercel is what opens.
          A new tab since 2026-09-23 — it was the same tab, so that a phone
          mid-install would not juggle two, but a sign-up can end on GitHub's
          or Vercel's own home page and Back does not always find the way.
          In a tab of its own, this page is still here to press again, and
          the line under the caption says so. */}
      <div className="get-act">
        <a href={deployUrl} className="get-cta" target="_blank" rel="noopener">Make your own copy</a>
        <p className="get-expect">Opens Vercel · nothing to pay</p>
        <p className="get-lost">Lost your place? Come back to this tab and press it again — you’ll go straight through.</p>
      </div>
    </main>
  );
}
