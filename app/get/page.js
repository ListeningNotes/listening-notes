// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/get/page.js
// The door. One screen: what it is, the button, and three ways onward.
//
// This is the address every copy's pitch pane sends people to. Somebody asks
// how you got this, the owner swipes right and hands over the phone, and this
// is where they land — which means everyone arriving has already seen a
// journal working, from a friend's copy or from a post showing one. They are
// not being convinced. They are trying to get from wanting it to having it,
// and this page's only job is not losing them between those two states.
//
// So no demo, no screenshots of the journal, no feature list. A hero line, a
// button, a line under the button that sets expectations before anybody
// starts, and a short table of contents: the steps (/get/install), the story
// (/get/story), and where to say it did not work. Everything fits without
// scrolling at phone width.
//
// It used to be one long page — the essay first, then the steps under it —
// and the essay was the thing between a person and the button. Each of the
// three errands has its own address now; see layout.js for why.
//
// The drawer rule: a copy that has not written the essay 404s here rather
// than serving a door to somebody else's software under its own address.
// `/get` is Miyel's page on Miyel's copy.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pull_settings, titleName } from '../../library/settings_actions';
import { DEPLOY_URL, SOURCE_URL } from '../../library/install_guide';

export async function generateMetadata() {
  const settings = await pull_settings();
  if (!settings.why_essay?.trim()) return {};
  return { title: `Getting one · ${titleName(settings)}` };
}

export default async function GetPage() {
  const settings = await pull_settings();
  if (!settings.why_essay?.trim()) notFound();

  return (
    <main className="get-wrap">
      {/* One word carries the weight. The line is the promise, and "own" is
          the whole of it; setting every word bold says nothing louder. */}
      <h1 className="get-title get-title--door">A music journal you actually <strong>own</strong>.</h1>
      <p className="get-lede">
        A free software that allows you to log what you listen to, rate it
        track by track, write about it. It runs on your own hosting, in your
        own database.
      </p>

      <div className="get-act">
        <a href={DEPLOY_URL} className="get-cta">Make your own copy</a>
        <p className="get-expect">About ten minute set up</p>
      </div>

      <ul className="get-index">
        <li>
          <Link href="/get/install">
            <p className="get-index-head">How to install →</p>
            <p className="get-index-line">Nine steps with pictures, on a phone or a laptop.</p>
          </Link>
        </li>
        <li>
          <Link href="/get/story">
            <p className="get-index-head">Our story →</p>
            <p className="get-index-line">Why this exists, and what changed along the way.</p>
          </Link>
        </li>
        <li>
          <a href={`${SOURCE_URL}/issues`}>
            <p className="get-index-head">It didn’t work →</p>
            <p className="get-index-line">Tell me what happened. I read these.</p>
          </a>
        </li>
      </ul>
    </main>
  );
}
