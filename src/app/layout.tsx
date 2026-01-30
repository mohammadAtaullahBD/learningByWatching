
import "./globals.css";
import Navbar from "../components/Navbar";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="font-sans">
      <body className="text-[15px] md:text-base" suppressHydrationWarning>
        <Navbar />
        <div className="pb-16">{children}</div>
      </body>
    </html>
  );
}
