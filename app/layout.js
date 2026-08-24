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

// Async because the journal's details are read here, once, and handed down —
// see components/main_components/Bookplate.js. This is what makes every page
// render on request rather than being prerendered at build time, which is the
// right trade: the alternative is a site that keeps showing the name it was
// built with after its owner changes it.
export default async function RootLayout({ children }) {
  const settings = await pull_settings();

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
