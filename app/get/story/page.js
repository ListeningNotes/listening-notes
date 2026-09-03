// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/get/story/page.js
// Our story: why this exists, and what changed along the way.
//
// This was /why, then the top of /get. It is its own address now because it
// is long-form reading, and reading wants a page rather than a stretch of
// scroll between a button and its instructions. "Why does somebody keep a
// listening journal" is still the best answer to "how did you get this" —
// it is just not the first thing a person who has already decided needs.
//
// The words live in the settings drawer rather than in this file, which is
// what keeps the drawer rule: a copy of this software ships with the page and
// without the writing, so a fresh journal 404s here rather than serving
// somebody else's essay under its own address.
//
// A server component, so the text is in the HTML rather than arriving after a
// fetch. It is prose; it should be readable before JavaScript runs and
// findable by anything that reads pages.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pull_settings, titleName } from '../../../library/settings_actions';

// The stored text uses one convention and no more: a line starting with "## "
// is a heading, a blank line separates blocks. Enough structure for an essay,
// little enough that the owner is editing prose in a box rather than markup.
function parse(essay) {
  return essay
    .split(/\n\s*\n/)
    .map(block => block.trim())
    .filter(Boolean)
    .map(block => block.startsWith('## ')
      ? { type: 'heading', text: block.slice(3).trim() }
      : { type: 'paragraph', text: block });
}

export async function generateMetadata() {
  const settings = await pull_settings();
  if (!settings.why_essay?.trim()) return {};
  return { title: `Our story · ${titleName(settings)}` };
}

export default async function StoryPage() {
  const { why_essay, why_date } = await pull_settings();
  if (!why_essay?.trim()) notFound();

  const blocks = parse(why_essay);
  const written = why_date
    ? new Date(why_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
    : null;

  return (
    <article className="get-wrap">
      {written && <p className="get-kicker">{written}</p>}
      <h1 className="get-title">Our story</h1>

      <div className="get-prose">
        {blocks.map((b, i) => b.type === 'heading'
          ? <h2 key={i} className="get-subhead">{b.text}</h2>
          : <p key={i} className="get-para">{b.text}</p>
        )}
      </div>

      <div className="get-foot">
        <Link href="/get" className="ln-pill">← Get one</Link>
        <Link href="/" className="ln-pill">The journal</Link>
      </div>
    </article>
  );
}
