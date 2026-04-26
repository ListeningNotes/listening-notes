import './globals.css';
import { Lightswitch } from '../components/main_components/Lightswitch';

export const metadata = {
  title: 'Listening Notes',
  description: 'A listening journal.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
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
