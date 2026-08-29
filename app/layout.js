// Copyright (C) 2026 Miyel Brown
// SPDX-License-Identifier: AGPL-3.0-or-later
import './globals.css';
import { Nunito, DM_Mono } from 'next/font/google';
import { Lightswitch } from '../components/main_components/Lightswitch';
import { Bookplate } from '../components/main_components/Bookplate';
import { pull_settings, coverName, titleName } from '../library/settings_actions';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-nunito',
});

// DM Serif Display used to load here as --font-dm-serif and was the site's
// title face. Titles are Nunito 700 now (see --font-display in globals.css),
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
  // journal_name is gone from this list. A journal is called after whoever
  // keeps it, so keeper_name below is the name, and shipping a second one to
  // every page was shipping a field nothing read.
  'keeper_name',
  // The ornamented name itself, not just the resolved cover_name above. The
  // card only needs the resolved one to draw, but the editor needs to know
  // which of the two columns it is editing before it can save to the right
  // one. A short string, and the card is on the landing page.
  'display_name',
  'bio', 'portrait_url',
  'instagram_url', 'lastfm_user', 'site_address',
  'founded_at', 'pinned_entry_id',
  // Nothing renders this any more — the free-text bio came off the about pane
  // in favour of the prompts. Kept on the list and in the column: it is
  // somebody's writing, there is no editor to put it back with, and a field
  // that costs a few hundred bytes is not worth losing writing over.
  'about_intro',
  // A handful of URLs. Short enough to ride along, and the back of the card
  // is on the landing page, which every visitor lands on.
  'social_links',
  // Two keys at most, and the card cannot decide what to draw without them.
  'hidden_fields',
  // Three finished openings, one line each. A few hundred bytes, and the pane
  // that prints them is the landing page.
  //
  // send_me came off this list when they arrived: "Looking for" was a labelled
  // field saying what the prompt "If you're sending me something, make it —"
  // says as a finished sentence, and the column is left holding its old value
  // rather than shipped to every page for nothing to read.
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
export default async function RootLayout({ children, layer }) {
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

  return (
    <html lang="en" suppressHydrationWarning className={`${nunito.variable} ${dmMono.variable}`}>
      <body>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `try{var s=localStorage.getItem('ln-theme');if(s)document.documentElement.setAttribute('data-theme',s);}catch(e){}`,
          }}
        />
        <Bookplate settings={settings}>
          <Lightswitch>
            {children}
            {layer}
          </Lightswitch>
        </Bookplate>
      </body>
    </html>
  );
}
