"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();

  const onLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={onLogout}
      className="rounded-full border border-black/10 px-3 py-1.5 text-sm text-[color:var(--muted)] transition hover:border-black/20 hover:text-[color:var(--text)]"
    >
      Logout
    </button>
  );
}
