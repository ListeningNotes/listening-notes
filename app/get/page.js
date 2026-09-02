// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
// app/get/page.js
// Why this exists, and — eventually — how to get one.
//
// This was /why, the long note behind the journal, reachable from a pill on
// the about page. It is /get now because that is the address the pitch pane
// sends people to from every copy of this software: somebody asks how you got
// this, the owner swipes right and hands over the phone, and this is where
// they land. The story of why a person started keeping a listening journal is
// a better answer to that question than a feature list.
//
// The other half of what this page owes a stranger — what the software is,
// that it is free, and the way to install a copy — is under the essay now:
// the button, the steps in order with what to expect and roughly how long,
// a place for screenshots, and where to say it did not work. Written for
// somebody with nobody beside them.
//
// The screenshots are files in public/install/, drawn only when they exist,
// so the steps read fine on a copy that has not taken them and the canonical
// one can add them without touching this file. See the list in NOTES.
//
// The words live in the settings drawer rather than in this file, which is
// what keeps the drawer rule: a copy of this software ships with the page and
// without the writing, so a fresh journal 404s here rather than serving
// somebody else's essay under its own address.
//
// A server component, so the text is in the HTML rather than arriving after a
// fetch. It is prose; it should be readable before JavaScript runs and findable
// by anything that reads pages.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pull_settings, coverName, titleName } from '../../library/settings_actions';
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

// The same URL the README carries. Neon's own marketplace template uses this
// `products` parameter rather than `integration-ids`: it attaches a Neon
// database to the new project and sets DATABASE_URL, so the deploy asks for
// nothing.
const DEPLOY_URL = 'https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FListeningNotes%2Flistening-notes&products=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22neon%22%2C%22productSlug%22%3A%22neon%22%2C%22protocol%22%3A%22storage%22%7D%5D';
const SOURCE_URL =
  process.env.NEXT_PUBLIC_SOURCE_URL || 'https://github.com/ListeningNotes/listening-notes';

// Each step, and the screenshot that goes with it if one has been taken.
const STEPS = [
  { shot: '01-button', head: 'Press the button', time: 'a few seconds',
    text: 'It opens Vercel, which is the service that runs the site. If you have no account it asks you to make one — Continue with GitHub is the simplest, and GitHub is where your copy of the code will live. These are the two accounts nobody can make for you.' },
  { shot: '02-github', head: 'Let GitHub keep a copy', time: 'about a minute',
    text: 'GitHub asks permission to put the code into your account. The screen looks alarming; it is asking to create one repository for you, which is the point. “Git Scope” is which account it goes into — pick yours. “Private Repository Name” is what to call it; anything you like.' },
  { shot: '03-neon', head: 'Pick a database plan', time: 'a minute',
    text: 'Vercel attaches a Neon database — that is where your writing is kept. Choose the free plan. Nothing here needs a card.' },
  { shot: '04-build', head: 'Wait for the build', time: 'two to three minutes',
    text: 'A log scrolls past. Near the end it prints a box with a claim code in it. Copy it — it is how the site knows the person setting it up is the person who made it. Missed it? It is in the project’s Logs too, and printed again every time the site restarts until you have used it.' },
  { shot: '05-holding', head: 'Open your site', time: 'a moment',
    text: 'Press Visit. The page says the journal isn’t ready yet, with a small “Set it up” underneath. Press it and type the claim code.' },
  { shot: '06-setup', head: 'Set up the journal', time: 'as long as you like',
    text: 'Your name first. Then a photo, three openings to finish, Last.fm if you use it, links and your rig — every one of those can be skipped and added later. Then choose a password.' },
  { shot: '07-homescreen', head: 'Put it on your home screen', time: 'ten seconds',
    text: 'The last screen shows how. On an iPhone it is the share button, then Add to Home Screen. After that it opens like an app.' },
];

export async function generateMetadata() {
  const settings = await pull_settings();
  if (!settings.why_essay) return {};
  // The tab, so the plain name. The heading on the page itself uses
  // coverName below, because that one is read by a person.
  return { title: `Why · ${titleName(settings)}` };
}

export default async function GetPage() {
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
          --why-nav-bottom: calc(80px + var(--safe-top));
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

        /* ── Getting one ── */
        .get-wrap { margin-top: 72px; padding-top: 40px; border-top: 1px solid var(--border); }
        .get-lede { font-size: 15px; line-height: 1.95; color: var(--ink); margin: 0 0 22px; }
        .get-button { display: inline-block; margin: 6px 0 30px; line-height: 0; }
        .get-button img { height: 32px; width: auto; }
        .get-step { display: grid; grid-template-columns: 28px 1fr; gap: 14px; margin: 0 0 30px; }
        .get-num { font-family: var(--font-label); font-size: 11px; color: var(--ink-faint); padding-top: 4px; }
        .get-head { font-family: var(--font-display); font-weight: var(--font-display-weight); font-size: 17px; margin: 0 0 4px; }
        .get-time { font-family: var(--font-label); font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ink-faint); margin: 0 0 8px; }
        .get-text { font-size: 14px; line-height: 1.8; color: var(--ink); margin: 0; }
        .get-shot { margin: 14px 0 0; border: 1px solid var(--border); border-radius: 12px; overflow: hidden; background: var(--panel); }
        .get-shot img { display: block; width: 100%; height: auto; }
        .get-help { font-size: 14px; line-height: 1.8; color: var(--ink-soft); margin: 30px 0 0; }
        .get-help a { color: var(--ink); }
      `}</style>

      <SiteNav />

      <article className="why-wrap">
        <header className="why-head">
          {written && <div className="why-date">{written}</div>}
          <h1 className="why-title">{coverName(settings)}</h1>
        </header>

        {blocks.map((b, i) => b.type === 'heading'
          ? <h2 key={i} className="why-subhead">{b.text}</h2>
          : <p key={i} className="why-para">{b.text}</p>
        )}

        {/* ── Getting one ──────────────────────────────────────────────── */}
        <section className="get-wrap" id="install" aria-labelledby="get-title">
          <h2 className="why-subhead" id="get-title">Getting one</h2>
          <p className="get-lede">
            This is free software. You run your own copy, at your own address,
            named after you, and nothing you write is kept on anybody else’s
            server. It takes about ten minutes and two accounts that are made
            in your own name. Press the button and follow along.
          </p>
          <a href={DEPLOY_URL} className="get-button">
            <img src="https://vercel.com/button" alt="Deploy with Vercel" />
          </a>

          {STEPS.map((step, i) => {
            const shot = existsSync(join(process.cwd(), 'public', 'install', `${step.shot}.png`));
            return (
              <div className="get-step" key={step.shot}>
                <span className="get-num">{i + 1}</span>
                <div>
                  <h3 className="get-head">{step.head}</h3>
                  <p className="get-time">{step.time}</p>
                  <p className="get-text">{step.text}</p>
                  {shot && (
                    <figure className="get-shot">
                      <img src={`/install/${step.shot}.png`} alt={step.head} loading="lazy" />
                    </figure>
                  )}
                </div>
              </div>
            );
          })}

          <p className="get-help">
            If it did not work — the build failed, the page says something it
            should not, you are stuck anywhere — <a href={`${SOURCE_URL}/issues`}>say so here</a>.
            Say what you pressed and what you saw. Somebody will answer.
          </p>
        </section>

        {/* The way back is the journal itself — for a stranger who arrived
            from somebody else's copy, that is the first look they get at what
            the writing here is actually for. */}
        <div className="why-foot">
          <Link href="/" className="ln-pill">← The journal</Link>
        </div>
      </article>
    </div>
  );
}
