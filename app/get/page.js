// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/get/page.js
// Get your copy: nine steps, then the button.
//
// This is the address every copy's About pane sends people to. Anybody here
// has already decided — they have seen a journal working, on a friend's phone
// or in a post — so there is no pitch on this page; About carries it. What is
// left is instructions and a button.
//
// ── The button is at the foot, 2026-09-22 ──────────────────────────────────
// After step nine, not at the top. People read what is above a button before
// they reach it: a button at the top gets pressed before step five is read,
// and step five is where installs break. Step one says where it is, so nobody
// hunts for it (Miyel's brief, About, /get and Give, §2).
//
// It replaced a door with three links — the steps at /get/install, the story,
// and "It didn't work". The steps are this page now and /get/install is gone.
// The story keeps its own address because it is long-form reading, and waits
// quietly at the very foot. "It didn't work" came off the same day, on
// Miyel's call; the holding pages a new copy can stop on still carry it
// (ComingSoon.js), which is where somebody is when it has not worked.
//
// Screenshot slots read from public/install/ and draw only when the file
// exists, so the page reads correctly before the pictures are taken and they
// can be added without touching this file. The filenames are in NOTES. This
// is the one part of the page that has to happen on the server.
//
// The drawer rule: a copy that has not written the essay 404s here rather
// than serving a door to somebody else's software under its own address.
// `/get` is Miyel's page on Miyel's copy.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
// The server's own set: the plain import reaches for React context, which a
// server component does not have.
import { ArrowRight, ArrowUp } from '@phosphor-icons/react/ssr';
import { pull_settings, titleName } from '../../library/settings_actions';
import { DEPLOY_URL, STEPS } from '../../library/install_guide';
import InstallSteps from '../../components/main_components/InstallSteps';

export async function generateMetadata() {
  const settings = await pull_settings();
  if (!settings.why_essay?.trim()) return {};
  return { title: `Get your copy · ${titleName(settings)}` };
}

export default async function GetPage() {
  const settings = await pull_settings();
  if (!settings.why_essay?.trim()) notFound();

  // Which pictures exist, in step order.
  const shots = STEPS.map(step =>
    existsSync(join(process.cwd(), 'public', 'install', `${step.shot}.png`)));

  return (
    <main className="get-wrap get-wrap--steps">
      {/* The mark is in the nav row above; see SiteNav. */}
      <header className="get-top">
        <p className="get-kicker">Get your copy</p>
        <p className="get-lede">
          Nine steps, about ten minutes, on a phone or a laptop. Read them
          first; the button is at the foot.
        </p>
      </header>

      <InstallSteps shots={shots} />

      {/* Square corners and filled, the one thing on this page a person came
          to press. The same tab: a phone mid-install should not be juggling
          two, and back returns here. */}
      <div className="get-act">
        <a href={DEPLOY_URL} className="get-cta">
          <ArrowUp size={18} aria-hidden="true" />
          Make your own copy
        </a>
        <p className="get-expect">Opens Vercel · nothing to pay</p>
      </div>

      <nav className="get-onward" aria-label="More about getting your copy">
        <Link href="/get/story" className="get-onward-link">
          Our story
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </nav>
    </main>
  );
}
