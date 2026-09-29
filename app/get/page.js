// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/get/page.js
// Get your copy: ten steps, then the button — for somebody a keeper gave
// the link to.
//
// ── Handed out, not downloaded, 2026-09-28 ─────────────────────────────────
// The steps draw only when the link carries a gift (`?gift=<the giver's
// journal>`, which is what Give's code and a giver's link say). Without one
// the page is two lines and the Instagram, and nothing else: no form, no
// waiting list, no coming soon, because a coming-soon invites people to ask
// and nothing invites nothing. A journal arrives from a person: the giver is
// the one who is there when the install goes sideways, and the one who gives
// the new keeper a reason to open it the next day. The repo stays public and
// AGPL — anyone determined can fork it — so this is a gate on the front door
// and not a rewrite; it comes off by deleting the one condition below when
// the install is ready for strangers (Miyel's brief, handed out, §1).
//
// Anybody past the gate has already decided — they were handed this by
// somebody with a journal — so there is no pitch on this page. What is left
// is instructions and a button.
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
// can be added without touching this file. The filenames are in library/install_guide.js. This
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

import Link from 'next/link';
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
import { INSTAGRAM_URL } from '../../library/version';
import InstallSteps from '../../components/main_components/InstallSteps';

export async function generateMetadata({ searchParams }) {
  const settings = await pull_settings();
  if (!settings.why_essay?.trim()) return {};
  const { gift } = await searchParams;
  const giver = tidyJournal(typeof gift === 'string' ? gift : '');
  // Without a gift the page is the two lines, not the steps, and its title
  // says nothing about getting one (the gate, above).
  if (!giver) return { title: titleName(settings) };
  const title = `Get your copy · ${titleName(settings)}`;

  // A gift link's preview, 2026-09-23: "A gift from" the giver, over the
  // card /get shows, drawn by ./gift-preview. Asked the same way the page
  // asks below, and only when the giver's journal answers — otherwise the
  // plain preview, as every other address on the site has. Set whole,
  // because a page's openGraph replaces the layout's rather than adding to
  // it; and by the journal's own address, since there is no metadataBase.
  let giverName = null;
  if (giver && giver === tidyJournal(settings.site_address)) {
    giverName = String(settings.keeper_name || '').trim() || null;
  } else if (giver && mayKnock('relay', whoIsKnocking({ headers: await headers() })).allowed) {
    giverName = await ask_journal_name(giver, 2500);
  }
  if (!giverName) return { title };

  const home = journalUrl(settings.site_address) || '';
  return {
    title,
    openGraph: {
      title: `A gift from ${giverName}`,
      siteName: titleName(settings),
      description: 'A listening journal of your own.',
      type: 'website',
      images: [{
        url: `${home}/get/gift-preview?gift=${encodeURIComponent(giver)}`,
        width: 1200,
        height: 630,
        alt: `A gift from ${giverName}`,
      }],
    },
  };
}

export default async function GetPage({ searchParams }) {
  const settings = await pull_settings();
  if (!settings.why_essay?.trim()) notFound();

  // Whose gift this is, when the link came from Give. See the notes above.
  const { gift } = await searchParams;
  const giver = tidyJournal(typeof gift === 'string' ? gift : '');

  // ── The gate ─────────────────────────────────────────────────────────────
  // No gift in the link, no steps. The mark, then two lines, in the middle
  // of the screen (Miyel, 2026-09-28: "centered on the page", "bring the
  // logo with it") — the nav row that carries the mark everywhere else is
  // left out of this page by app/get/layout.js, and the mark drawn here is
  // the row's own, a link home like the row's. The second line ends on the
  // Instagram as a handle in the sentence ("or visit us on instagram
  // @listeningnotes.blog"), or on "one." when a fork names no account.
  // Delete this block and the page is the steps for everybody again.
  if (!giver) {
    const handle = INSTAGRAM_URL ? '@' + INSTAGRAM_URL.replace(/\/+$/, '').split('/').pop() : '';
    return (
      <main className="get-wrap get-wrap--steps get-handed">
        <Link href="/" className="get-handed-home" aria-label={titleName(settings)}>
        <svg viewBox="76 96 241 140" className="get-handed-mark" xmlns="http://www.w3.org/2000/svg">
        <path
        transform="translate(73.734177, 220.794814)"
        d="M 44.65625 0 C 37.46875 0 31.160156 -1.601562 25.734375 -4.8125 C 20.304688 -8.019531 16.097656 -12.28125 13.109375 -17.59375 C 10.128906 -22.90625 8.640625 -28.773438 8.640625 -35.203125 L 8.640625 -116.21875 L 36.53125 -116.21875 L 36.53125 -33.203125 C 36.53125 -30.546875 37.46875 -28.222656 39.34375 -26.234375 C 41.226562 -24.242188 43.550781 -23.25 46.3125 -23.25 L 77.03125 -23.25 L 77.03125 0 Z M 44.65625 0 "
        />
        <path
        transform="translate(153.915942, 220.794814)"
        d="M 91.96875 2 C 85 2 78.742188 0.476562 73.203125 -2.5625 C 67.671875 -5.613281 63.300781 -9.847656 60.09375 -15.265625 C 56.882812 -20.691406 55.28125 -26.835938 55.28125 -33.703125 L 55.28125 -84.5 C 55.28125 -86.269531 54.835938 -87.875 53.953125 -89.3125 C 53.066406 -90.75 51.90625 -91.910156 50.46875 -92.796875 C 49.03125 -93.679688 47.425781 -94.125 45.65625 -94.125 C 43.882812 -94.125 42.28125 -93.679688 40.84375 -92.796875 C 39.40625 -91.910156 38.269531 -90.75 37.4375 -89.3125 C 36.601562 -87.875 36.1875 -86.269531 36.1875 -84.5 L 36.1875 0 L 8.96875 0 L 8.96875 -82.515625 C 8.96875 -89.484375 10.539062 -95.625 13.6875 -100.9375 C 16.84375 -106.25 21.21875 -110.453125 26.8125 -113.546875 C 32.40625 -116.648438 38.6875 -118.203125 45.65625 -118.203125 C 52.738281 -118.203125 59.046875 -116.648438 64.578125 -113.546875 C 70.109375 -110.453125 74.476562 -106.25 77.6875 -100.9375 C 80.90625 -95.625 82.515625 -89.484375 82.515625 -82.515625 L 82.515625 -31.703125 C 82.515625 -29.929688 82.957031 -28.300781 83.84375 -26.8125 C 84.726562 -25.320312 85.859375 -24.160156 87.234375 -23.328125 C 88.617188 -22.492188 90.144531 -22.078125 91.8125 -22.078125 C 93.582031 -22.078125 95.210938 -22.492188 96.703125 -23.328125 C 98.203125 -24.160156 99.394531 -25.320312 100.28125 -26.8125 C 101.164062 -28.300781 101.609375 -29.929688 101.609375 -31.703125 L 101.609375 -116.21875 L 128.65625 -116.21875 L 128.65625 -33.703125 C 128.65625 -26.835938 127.050781 -20.691406 123.84375 -15.265625 C 120.632812 -9.847656 116.265625 -5.613281 110.734375 -2.5625 C 105.203125 0.476562 98.945312 2 91.96875 2 Z M 91.96875 2 "
        />
        <circle
        cx="297.0547"
        cy="216.71875"
        r="14.1328"
        className="get-handed-dot"
        />
        </svg>
        </Link>
        <p className="get-handed-said">Listening Notes is handed out by people who have one.</p>
        <p className="get-handed-ask">
          Know someone with a journal? Ask them to gift you one
          {handle ? (
            <>
              , or visit us on Instagram{' '}
              <a className="get-handed-ig" href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
                {handle}
              </a>
              .
            </>
          ) : '.'}
        </p>
      </main>
    );
  }

  // Which pictures exist, in step order.
  const shots = STEPS.map(step =>
    existsSync(join(process.cwd(), 'public', 'install', `${step.shot}.png`)));

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
            faces work the same way — then who it is from, and the gift.
            It opens their journal in a new tab, 2026-09-23: somebody handed
            a gift by text may never have seen one, and the best pitch there
            is is the giver's own journal — so the page stays the steps
            (Miyel's call, over a pitch before them). */}
        {giverName && (
          <a
            href={journalUrl(giver)}
            className="ln-tile get-gift"
            target="_blank"
            rel="noopener"
            aria-label={`A gift from ${giverName} — open their journal`}
          >
            <span className="get-gift-face" aria-hidden="true">
              <User size={20} />
              <img src={`${journalUrl(giver)}/api/portrait`} alt="" />
            </span>
            <span className="get-gift-words">
              <span className="get-gift-from">A gift from</span>
              <span className="get-gift-name">{giverName}</span>
            </span>
            <Gift size={20} className="get-gift-glyph" aria-hidden="true" />
          </a>
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
