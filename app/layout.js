import './globals.css';
import { Nunito, DM_Mono } from 'next/font/google';
import { Lightswitch } from '../components/main_components/Lightswitch';

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
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${nunito.variable} ${dmMono.variable}`}>
      <body>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `try{var s=localStorage.getItem('ln-theme');if(s)document.documentElement.setAttribute('data-theme',s);}catch(e){}`,
          }}
        />
        <Lightswitch>
          {children}
        </Lightswitch>
      </body>
    </html>
  );
}
