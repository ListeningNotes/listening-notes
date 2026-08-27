// SPDX-License-Identifier: AGPL-3.0-or-later
// app/why/page.js
// The long note behind the journal.
//
// This page belongs to whoever keeps the journal, and its words live in the
// settings drawer rather than in this file. That is the whole point: a copy of
// this software ships with the page but not the essay, so a new journal has no
// note until its owner writes one — and until then the page does not exist and
// nothing links to it.
//
// A server component, so the text is in the HTML rather than arriving after a
// fetch. It is prose; it should be readable before JavaScript runs and findable
// by anything that reads pages.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { pull_settings, coverName, titleName } from '../../library/settings_actions';
import DotNav from '../../components/main_components/DotNav';
import SiteNav from '../../components/main_components/SiteNav';

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
  if (!settings.why_essay) return {};
  // The tab, so the plain name. The heading on the page itself uses
  // coverName below, because that one is read by a person.
  return { title: `Why · ${titleName(settings)}` };
}

export default async function WhyPage() {
  const settings = await pull_settings();
  const { why_essay, why_date } = settings;

  // No note, no page. A copy that has not written one gets a 404 rather than
  // an empty article with a heading over nothing.
  if (!why_essay?.trim()) notFound();

  const blocks = parse(why_essay);
  const written = why_date
    ? new Date(why_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
    : null;

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', color: 'var(--ink)' }}>
      <style>{`
        /* The same measure, size and rhythm the About page sets its prose in —
           this is the same writing, one page further along, and it should not
           suddenly change typeface or line height on the way there. */
        .why-wrap {
          --why-nav-bottom: calc(136px + var(--safe-top));
          max-width: 860px; margin: 0 auto;
          padding: calc(var(--why-nav-bottom) + 44px) 48px 120px;
        }
        @media (max-width: 640px) {
          .why-wrap { padding: calc(var(--why-nav-bottom) + 24px) 24px 100px; }
        }

        .why-head { margin-bottom: 34px; }
        .why-date {
          font-family: var(--font-label);
          font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase;
          color: var(--ink-faint); margin-bottom: 10px;
        }
        .why-title {
          font-family: var(--font-display); font-weight: var(--font-display-weight);
          font-size: clamp(30px, 6vw, 46px); line-height: 1.05;
          letter-spacing: -0.02em; margin: 0;
        }

        .why-subhead {
          font-family: var(--font-display); font-weight: var(--font-display-weight);
          font-size: 20px; letter-spacing: -0.01em; color: var(--ink);
          margin: 48px 0 12px;
        }
        .why-subhead:first-of-type { margin-top: 0; }
        .why-para {
          font-size: 15px; line-height: 1.95; color: var(--ink);
          margin: 0 0 22px;
        }

        .why-foot {
          margin-top: 64px; padding-top: 32px;
          border-top: 1px solid var(--border);
        }
      `}</style>

      <SiteNav />
      <DotNav />

      <article className="why-wrap">
        <header className="why-head">
          {written && <div className="why-date">{written}</div>}
          <h1 className="why-title">{coverName(settings)}</h1>
        </header>

        {blocks.map((b, i) => b.type === 'heading'
          ? <h2 key={i} className="why-subhead">{b.text}</h2>
          : <p key={i} className="why-para">{b.text}</p>
        )}

        {/* The way back is the card, because the card is what sent you here.
            /about was the answer while there was an about page to go back to. */}
        <div className="why-foot">
          <Link href="/" className="ln-pill">← The card</Link>
        </div>
      </article>
    </div>
  );
}
