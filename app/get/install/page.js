// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/get/install/page.js
// How to install: seven steps with pictures, on a phone or on a laptop.
//
// Its own route and not a section of /get, because it needs a URL. The
// person who wants this page is stuck at step four with Vercel open in
// another tab, and the person helping them wants to text them a link that
// opens on that step and not on an essay.
//
// The two flows genuinely differ — the same accounts and the same screens,
// laid out differently and finished differently — and both screenshot sets
// are being taken, so there is a toggle at the top. Which set a person sees
// is in the address (?on=phone or ?on=laptop) so the link they are sent
// opens on the right one; without it the page guesses phone, because that is
// what somebody handed a journal is most likely holding.
//
// Screenshot slots read from public/install/{phone,laptop}/ and only draw
// when the file exists, so the page reads correctly before the pictures are
// taken and the canonical copy can add them without touching this file. The
// filenames are listed in NOTES. This is the one part of the page that has to
// happen on the server — the file check — so the page works out which slots
// are filled and hands the client the answer.
//
// Step 3 talks to the permissions screen directly, because that is where a
// cautious person hesitates. And "It didn't work" is repeated at the foot,
// because the foot is where somebody will be when it fails.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pull_settings, titleName } from '../../../library/settings_actions';
import { DEVICES, STEPS } from '../../../library/install_guide';
import InstallSteps from '../../../components/main_components/InstallSteps';

export async function generateMetadata() {
  const settings = await pull_settings();
  if (!settings.why_essay?.trim()) return {};
  return { title: `How to install · ${titleName(settings)}` };
}

export default async function InstallPage({ searchParams }) {
  const settings = await pull_settings();
  if (!settings.why_essay?.trim()) notFound();

  const { on } = await searchParams;
  const initial = DEVICES.includes(on) ? on : 'phone';

  // Which pictures exist, per device, in step order. A boolean list rather
  // than paths: the client knows how to build the path and does not need a
  // filesystem to do it.
  const shots = Object.fromEntries(DEVICES.map(device => [
    device,
    STEPS.map(step => existsSync(join(process.cwd(), 'public', 'install', device, `${step.shot}.png`))),
  ]));

  return (
    <main className="get-wrap">
      <Link href="/get" className="get-back">← Get one</Link>
      <p className="get-kicker">About ten minutes</p>
      <h1 className="get-title">How to install</h1>
      <p className="get-lede">
        Two accounts, both free and both in your own name: GitHub, where your
        copy of the code lives, and Vercel, which runs it. Everything else is
        made for you.
      </p>
      <InstallSteps initial={initial} shots={shots} />
    </main>
  );
}
