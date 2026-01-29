
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-black text-white px-6 py-3">
      <Link href="/dashboard" className="font-bold">
        Netflix English Builder
      </Link>
    </nav>
  );
}
