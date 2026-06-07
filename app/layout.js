import './globals.css';
import { Nunito, DM_Serif_Display, DM_Mono } from 'next/font/google';
import { Lightswitch } from '../components/main_components/Lightswitch';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-nunito',
});

const dmSerif = DM_Serif_Display({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-dm-serif',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-dm-mono',
});

export const metadata = {
  title: 'Listening Notes',
  description: 'A listening journal.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${nunito.variable} ${dmSerif.variable} ${dmMono.variable}`}>
      <body>
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `try{var s=localStorage.getItem('ln-theme');if(s)document.documentElement.setAttribute('data-theme',s);}catch(e){}`,
          }}
        />
        <Lightswitch>
          <div className="hp-headerbar" aria-hidden="true" />
          {children}
        </Lightswitch>
      </body>
    </html>
  );
}
