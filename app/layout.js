import './globals.css';
import { Nunito } from 'next/font/google';
import { Lightswitch } from '../components/main_components/Lightswitch';

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-nunito',
});

export const metadata = {
  title: 'Listening Notes',
  description: 'A listening journal.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning className={nunito.variable}>
      <head>
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
        <Lightswitch>
          {children}
        </Lightswitch>
      </body>
    </html>
  );
}
