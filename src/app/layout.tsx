
import "./globals.css";
import Navbar from "../components/Navbar";
import { Fraunces, Sora } from "next/font/google";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${fraunces.variable}`}>
      <body className="text-[15px] md:text-base">
        <Navbar />
        <div className="pb-16">{children}</div>
      </body>
    </html>
  );
}
