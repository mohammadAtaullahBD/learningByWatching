import Link from "next/link";
import { getSessionUser } from "@/lib/auth";
import LogoutButton from "@/components/LogoutButton";
import ThemeToggle from "@/components/ThemeToggle";

export default async function Navbar() {
  const user = await getSessionUser();
  const links = [{ href: "/dashboard", label: "Dashboard" }];
  if (user?.role === "admin") {
    links.push(
      { href: "/processing", label: "Processing" },
      { href: "/subtitles", label: "Subtitles" },
      { href: "/usage", label: "Usage" },
    );
  }
  return (
    <nav className="sticky top-0 z-30 border-b border-black/5 bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/dashboard" className="text-lg font-semibold">
          ReelVocab
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-sm text-[color:var(--muted)] sm:justify-end">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-transparent px-3 py-1.5 transition hover:border-black/10 hover:text-[color:var(--text)]"
            >
              {link.label}
            </Link>
          ))}
          <ThemeToggle />
          {user ? (
            <LogoutButton />
          ) : (
            <Link
              href="/login"
              className="rounded-full border border-black/10 px-3 py-1.5 text-sm text-[color:var(--muted)] transition hover:border-black/20 hover:text-[color:var(--text)]"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
