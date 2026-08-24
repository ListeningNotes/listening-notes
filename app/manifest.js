// The web app manifest. Next serves this at /manifest.webmanifest and links it
// from every page on its own — there is no <link> to add anywhere.
//
// `display: 'standalone'` is the whole point: once the site is on a home
// screen, Safari opens it without the address bar and it reads as an app.
// The colours are the dark theme's, because that is what the icon sits on —
// the splash screen while the site boots should match the icon you tapped,
// not whichever theme the reader last chose.
export default function manifest() {
  return {
    name: 'Listening Notes',
    short_name: 'Listening Notes',
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
