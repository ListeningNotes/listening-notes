import './globals.css';
import { Lightswitch } from '../components/main_components/Lightswitch';

export const metadata = {
  title: 'Listening Notes',
  description: 'A listening journal.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
