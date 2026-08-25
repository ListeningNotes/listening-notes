import './globals.css';
import { Anton, Nunito, DM_Mono } from 'next/font/google';
import { Lightswitch } from '../components/main_components/Lightswitch';
import { Bookplate } from '../components/main_components/Bookplate';
import { pull_settings } from '../library/settings_actions';

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

// The third face, and the only one with a single job: the headline on the back
// of the card. An ID card is set in condensed poster caps — that is most of
// what makes a rectangle read as a card rather than as a box with writing in
// it — and neither Nunito nor DM Mono can be squeezed into that shape without
// looking squeezed. One weight, because Anton only has one.
//
// Deliberately not a fourth body face. Nothing but .idc-headline is allowed to
// name this variable; the two-font rule still holds for every word a reader
// actually reads.
const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-anton',
});

export const metadata = {
  title: 'Listening Notes',
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
    title: 'Listening Notes',
    statusBarStyle: 'black-translucent',
  },
};

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
// /why reads its essay on the server; these are the short facts.
const BOOKPLATE_FIELDS = [
  'journal_name', 'keeper_name', 'bio', 'portrait_url',
  'instagram_url', 'lastfm_user', 'site_address',
  'founded_at', 'pinned_entry_id',
  // Two sentences saying what the journal is, and the one field on this list
  // that had been written, stored, and never delivered: the old /about read it from
  // this context without it ever having been put here, so the paragraph at the
  // top of that page rendered as nothing for as long as the page existed. The
  // back of the card prints it now.
  'about_intro',
  // A handful of URLs. Short enough to ride along, and the back of the card
  // is on the landing page, which every visitor lands on.
  'social_links',
];

// Async because the journal's details are read here, once, and handed down —
// see components/main_components/Bookplate.js.
export default async function RootLayout({ children }) {
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
  // /why reads the essay on the server, and this carries the short facts.
  const settings = Object.fromEntries(
    BOOKPLATE_FIELDS.filter(key => key in all).map(key => [key, all[key]])
  );
  settings.has_note = Boolean(all.why_essay && all.why_essay.trim());

  return (
    <html lang="en" suppressHydrationWarning className={`${nunito.variable} ${dmMono.variable} ${anton.variable}`}>
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
          </Lightswitch>
        </Bookplate>
      </body>
    </html>
  );
}
