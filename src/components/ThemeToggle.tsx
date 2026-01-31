"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

const getPreferredTheme = (): Theme => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = window.localStorage.getItem("theme") as Theme | null;
    const next = stored ?? getPreferredTheme();
    setTheme(next);
    document.documentElement.dataset.theme = next;
  }, []);

  const toggleTheme = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("theme", next);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-semibold text-[color:var(--muted)] transition hover:border-black/20 hover:text-[color:var(--text)]"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
