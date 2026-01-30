
import Link from "next/link";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/upload", label: "Upload" },
  { href: "/processing", label: "Processing" },
];

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-30 border-b border-black/5 bg-white/70 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="text-lg font-semibold">
          ReelVocab
        </Link>
        <div className="flex items-center gap-4 text-sm text-[color:var(--muted)]">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-transparent px-3 py-1.5 transition hover:border-black/10 hover:text-[color:var(--text)]"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
