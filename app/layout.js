// app/layout.js
// The root layout — wraps every page in the app.
// In Next.js, layout.js is special: it renders once and persists across page navigation.
// Anything here (fonts, providers, global scripts) applies to the entire site.

import './globals.css';
import { ThemeProvider } from '../components/ThemeProvider';

// Metadata is picked up by Next.js automatically and applied as <title> and <meta> tags.
// This is the default — individual pages can override these with their own generateMetadata.
export const metadata = {
  title: 'Listening Notes',
  description: 'A listening journal.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* suppressHydrationWarning prevents React from complaining when the theme
          attribute is added by the inline script below before React hydrates */}
      <head>
        {/* Inline script to apply saved theme BEFORE the page renders.
            Without this, the page would flash the wrong theme on load.
            dangerouslySetInnerHTML is used because Next.js doesn't allow
            inline <script> tags any other way — the name sounds scary but
            it's safe here since we control the content entirely. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var stored = localStorage.getItem('ln-theme');
                if (stored) {
                  document.documentElement.setAttribute('data-theme', stored);
                }
              } catch(e) {}
            `,
          }}
        />
      </head>
      <body>
        {/* ThemeProvider manages the light/dark toggle state across all pages */}
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}