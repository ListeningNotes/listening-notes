// The web app manifest. Next serves this at /manifest.webmanifest and links it
// from every page on its own — there is no <link> to add anywhere.
//
// `display: 'standalone'` is the whole point: once the site is on a home
// screen, Safari opens it without the address bar and it reads as an app.
// The colours are the dark theme's, because that is what the icon sits on —
// the splash screen while the site boots should match the icon you tapped,
// not whichever theme the reader last chose.

import { pull_settings, coverName } from '../library/settings_actions';

// manifest.js is a route handler, and Next caches route handlers at build time
// unless told otherwise. Without this the name below is read once, while the
// site is being built, and then frozen — so a copy would install to somebody's
// home screen under whatever name happened to be in the database on the build
// machine, and go on using it no matter what its owner typed afterwards. The
// exact trap the root layout documents, in the one file where the answer is a
// label sitting under an icon on a phone until the app is deleted.
export const dynamic = 'force-dynamic';

export default async function manifest() {
  const name = coverName(await pull_settings());

  return {
    // Both names are the journal's, which is its keeper's. These were the
    // first journal's name in every copy of this software — and a home-screen
    // icon is the worst place for that, because it is the one label a person
    // reads every day and never sees a way to change.
    name,
    short_name: name,
    description: 'A listening journal.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0e0e0e',
    theme_color: '#0e0e0e',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
