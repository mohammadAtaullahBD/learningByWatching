"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

type Mode = "login" | "register";

type Props = {
  mode: Mode;
};

export default function AuthForm({ mode }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      username: String(formData.get("username") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(errorBody?.error ?? "Unable to continue.");
      }

      const next = searchParams.get("next") || "/dashboard";
      router.push(next);
      router.refresh();
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unexpected error.";
      setMessage(text);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mt-6 grid gap-4">
      <label className="space-y-2 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
          Username
        </span>
        <input
          name="username"
          required
          autoComplete="username"
          className="w-full rounded-xl border border-black/10 bg-white px-3 py-2"
          placeholder="yourname"
        />
      </label>
      <label className="space-y-2 text-sm">
        <span className="text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
          Password
        </span>
        <input
          name="password"
          type="password"
          required
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="w-full rounded-xl border border-black/10 bg-white px-3 py-2"
        />
      </label>
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-full bg-[color:var(--accent)] px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
      </button>
      {message && <p className="text-sm text-red-600">{message}</p>}
    </form>
  );
}
