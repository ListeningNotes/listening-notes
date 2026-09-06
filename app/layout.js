// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
import './styles/base.css';
import './styles/nav.css';
import './styles/journal.css';
import './styles/entry.css';
import './styles/idcard.css';
import './styles/session.css';
import './styles/get.css';
import './styles/forms.css';
import { Nunito, DM_Mono } from 'next/font/google';
import { Lightswitch } from '../components/main_components/Lightswitch';
import { Bookplate } from '../components/main_components/Bookplate';
import ComingSoon from '../components/main_components/ComingSoon';
import { PATH_HEADER } from '../proxy';
import { headers } from 'next/headers';
import { isSetUp, pull_settings, coverName, titleName } from '../library/settings_actions';
import { hasDatabase, explainDatabaseError } from '../library/database_connection';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-nunito',
});

// DM Serif Display used to load here as --font-dm-serif and was the site's
// title face. Titles are Nunito 700 now (see --font-display in styles/base.css),
// so the whole site runs on two families and this one is no longer fetched.
const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
});

// Anton loaded here for a while, to set the headline on the back of the card in
// condensed poster caps. That headline was the journal's own name, and the name
// came off — every copy of this software is a listening journal, so printing
// the words under the mark said the same thing twice. With nothing left for it
// to set, a whole extra typeface was being fetched by every visitor to style no
// words at all. Back to two faces.

// A function rather than a constant, because the title is the keeper's name and
// that is in the database. It was hardcoded, which meant every copy of this
// software opened a browser tab with the first journal's name in it — the tab,
// the home-screen icon and the bookmark, all three of the places a site's name
// is actually read.
//
// The layout is force-dynamic (see below), so this runs per request and the
// name a copy shows is the name its owner typed, not the name it was built
// with.
export async function generateMetadata() {
  const settings = await pull_settings();
  // titleName, not coverName. Everything in this function is read by a machine
  // — a browser tab, a home-screen label, a link preview on somebody else's
  // app — and those get the plain name plus the software's, never the
  // ornamented one a person put on their card.
  const name = titleName(settings);

  return {
    title: name,
    description: 'A listening journal.',
    // Puts <link rel="alternate" type="application/rss+xml"> in the head, so a
    // reader handed nothing but the site address can still find the feed. This
    // is what following looks like here: the subscription lives on the reader's
    // side, and the journal never learns who is out there.
    alternates: {
      types: {
        'application/rss+xml': '/feed.xml',
      },
    },
    // Added to a home screen, the site opens without Safari's chrome. The
    // translucent status bar lets the page run to the top of the screen; the
    // mobile nav already pads itself off env(safe-area-inset-top), so nothing
    // ends up under the clock. app/apple-icon.png is picked up automatically.
    appleWebApp: {
      capable: true,
      title: name,
      statusBarStyle: 'black-translucent',
    },
    // What a link to this journal looks like when it is pasted somewhere else.
    // Same name, for the same reason: the reader is a preview card in an app
    // that did not ask what the characters were for.
    openGraph: {
      title: name,
      siteName: name,
      description: 'A listening journal.',
      type: 'website',
    },
  };
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

// Reading the settings here is not on its own enough to stop Next prerendering
// every page at build time — a plain database call is not a dynamic API, so the
// answer gets baked into HTML and the site keeps serving the name it was built
// with no matter what its owner changes. Which defeats the entire point of the
// settings drawer: it was editable and nothing it said ever reached a visitor.
//
// force-dynamic is the fix, declared on the root layout so it covers every page
// under it. The cost is a database read per request rather than per deploy,
// which for a personal journal is nothing. The cheaper version — cache the read
// and invalidate it when settings are saved — is worth doing if this ever gets
// busy, but correctness first.
export const dynamic = 'force-dynamic';

// What every page is allowed to carry.
//
// Bookplate is a client component, and every prop handed to one is serialised
// into the page whether or not anything reads it. Spreading the settings row
// therefore ships each new column to every page by default — which is not
// hypothetical: adding `definitions` put two kilobytes of prose about rating
// scales into the HTML of every album page. An allow-list makes that
// impossible rather than something to remember.
//
// The list lives here rather than beside the context it fills, because a
// 'use client' module cannot hand a plain array to a server component — the
// import arrives as a client reference, not a value. And this is where the
// decision belongs anyway: what ships to every page is a layout question.
//
// Bulk text belongs to whoever renders it. /key fetches the definitions and
// /get reads its essay on the server; these are the short facts.
const BOOKPLATE_FIELDS = [
  // A journal is called after whoever keeps it, so keeper_name is the name.
  'keeper_name',
  // The ornamented name itself, not just the resolved cover_name above. The
  // card only needs the resolved one to draw, but the editor needs to know
  // which of the two columns it is editing before it can save to the right
  // one. A short string, and the card is on the landing page.
  'display_name',
  'portrait_url',
  'lastfm_user', 'site_address',
  'founded_at', 'pinned_entry_id',
  // A handful of URLs. Short enough to ride along, and the back of the card
  // is on the landing page, which every visitor lands on.
  'social_links',
  // Two keys at most, and the card cannot decide what to draw without them.
  'hidden_fields',
  // Three finished openings, one line each. A few hundred bytes, and the pane
  // that prints them is the landing page.
  //
  // The old send_me field went when they arrived: "Looking for" was a
  // labelled field saying what the prompt "If you're sending me something,
  // make it —" says as a finished sentence.
  'bioanswers',
  // Two percentages. Without it the portrait is drawn centred, which for a
  // photograph of a person is often a picture of their chin.
  'portrait_position',
  // A short path. The picture it points at is a blob and stays out of here.
  'portrait_code_url',
  // One short word naming an icon.
  'rig_icon',
  // A handful of short rows, and the card opens them without a fetch.
  'rig',
];

// Async because the journal's details are read here, once, and handed down —
// see components/main_components/Bookplate.js.
// `layer` is the @layer parallel slot — an entry drawn over whatever children
// is showing. It is null on every page but an intercepted entry, and it has to
// be taken here rather than anywhere lower because the journal is mounted in
// two places, the cross's centre pane and /archive, and a layer that only
// worked from one of them would be a layer that worked by accident.
// ── The hold ──────────────────────────────────────────────────────────────
// A copy nobody has claimed shows one plain page instead of its whole site.
// Not a redirect to /setup: a stranger who found a fresh deployment would land
// on somebody else's setup form, which looks like an invitation even though it
// is behind the same password as everything else. Cannot be taken and does not
// look takeable are different things, and only the second is a decision.
//
// The path comes from proxy.js as a header, because a server layout is not
// given one. /setup is the single exemption — hold that too and the owner
// cannot get in.
//
// isSetUp rather than the settings row already read below, deliberately.
// pull_settings swallows database errors and returns setup_complete false, so
// a Neon outage would read as an unclaimed journal and hold a live site behind
// this page. isSetUp lets the error throw, and the catch here fails closed:
// if the question cannot be answered, assume the journal is somebody's.
const SETUP_PATH = '/setup';

// Returns why the site is held, or null to let it through. 'database' is a
// copy with no connection string at all — it built and started, which it
// could not do before the connection was opened lazily, and the only honest
// page is one saying what is missing. 'setup' is a copy with a database and
// no owner.
//
// 'unreachable' is the third: a connection string is set and the read threw.
// The old answer was to fail closed and render the site anyway, so an outage
// on a live journal would not put it behind the holding page — and that is
// still the rule for the *setup* page, which is never shown on a thrown
// read. But rendering anyway meant a nameless, empty journal with nothing on
// it saying why, which for a live journal is a blank page during an outage
// and for a fresh copy with a mistyped string is a dead end with nobody to
// ask. A page that says the database cannot be reached is true in both cases
// and points the owner at the one thing to check.
async function holdTheDoor() {
  const path = (await headers()).get(PATH_HEADER) || '';
  if (path.startsWith('/api/')) return null;
  if (!hasDatabase()) return 'database';
  if (path === SETUP_PATH) return null;
  try {
    return (await isSetUp()) ? null : 'setup';
  } catch (error) {
    return { reason: 'unreachable', said: explainDatabaseError(error) };
  }
}

export default async function RootLayout({ children, layer }) {
  const holding = await holdTheDoor();
  const all = await pull_settings();

  // Named keys only, rather than spreading what is left after removing the
  // essay. Bookplate is a client component, so every prop handed to it is
  // serialised into the page whether or not anything reads it — which means a
  // column added to settings later ships to every page by default. That is not
  // hypothetical: `definitions` was added and two kilobytes of prose about
  // rating scales turned up in the HTML of every album page. An allow-list
  // makes the leak impossible rather than a thing to remember.
  //
  // Bulk text belongs to whoever renders it. /key fetches the definitions,
  // /get reads the essay on the server, and this carries the short facts.
  const settings = Object.fromEntries(
    BOOKPLATE_FIELDS.filter(key => key in all).map(key => [key, all[key]])
  );
  // has_note used to ride along here — a boolean saying an essay existed, so
  // the about page could decide whether to draw a link to it without carrying
  // 3.5KB of prose into every page on the site. Nothing links to the essay any
  // more: it is at /get, which every copy's pitch pane reaches by its full
  // address rather than by a path. Derived rather than stored, so it costs
  // nothing to bring back if something wants to ask again.
  // The name, resolved once on the server and carried down rather than worked
  // out again in each component that prints it. coverName lives beside the
  // database read, and a client component that imported it would drag the
  // Postgres driver into the browser bundle to answer a question about a
  // string. So the server answers it here, and the nav, the gate and the
  // wordmark just read it.
  settings.cover_name = coverName(all);
  // Whether research is on. The key itself never leaves the server; a boolean
  // does, so the session's album screen can leave the button out on a copy
  // that has no key rather than show one that fails. Settings first, the
  // environment second — the same order the vault resolves it in.
  settings.research_available = Boolean(all.has_anthropic_key || process.env.ANTHROPIC_API_KEY);
  // Same shape for the beacon: the cross lands on the journal when there is
  // nothing to ask Last.fm with, and it needs to know that before paint.
  settings.beacon_available = Boolean(all.lastfm_user && (all.has_lastfm_key || process.env.LASTFM_KEY));

  // The owner's chosen starting theme, on the document from the server so the
  // first paint is already the right colour. A reader who has pressed the
  // switch keeps their own choice: the inline script below reads it out of
  // storage and overrides this before anything is drawn.
  const theme = all.theme === 'dark' || all.theme === 'light' ? all.theme : undefined;

  return (
    <html lang="en" suppressHydrationWarning data-theme={theme} className={`${nunito.variable} ${dmMono.variable}`}>
      <body>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `try{var s=localStorage.getItem('ln-theme');if(s)document.documentElement.setAttribute('data-theme',s);}catch(e){}`,
          }}
        />
        <Bookplate settings={settings}>
          <Lightswitch>
            {holding
              ? <ComingSoon reason={typeof holding === 'string' ? holding : holding.reason} said={holding.said} />
              : <>
              {children}
              {layer}
            </>}
          </Lightswitch>
        </Bookplate>
      </body>
    </html>
  );
}
