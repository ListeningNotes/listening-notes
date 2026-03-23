import { DM_Serif_Display, DM_Mono, DM_Sans } from "next/font/google";
import "./globals.css";

const dmSerif = DM_Serif_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
});

const dmMono = DM_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
});

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata = {
  title: "Listening Notes",
  description: "A music listening journal.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${dmSerif.variable} ${dmMono.variable} ${dmSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#0e0e0e] text-[#e8e4dc]">
        {children}
      </body>
    </html>
  );
}