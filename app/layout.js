import './globals.css';
import { Nunito, DM_Mono } from 'next/font/google';
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

// Async because the journal's details are read here, once, and handed down —
// see components/main_components/Bookplate.js.
export default async function RootLayout({ children }) {
  const { why_essay, ...rest } = await pull_settings();
  // The essay stays on the server. /why and /about read it there; every other
  // page would only be carrying it down the wire for nothing.
  const settings = { ...rest, has_note: Boolean(why_essay && why_essay.trim()) };

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
          </Lightswitch>
        </Bookplate>
      </body>
    </html>
  );
}
