import Link from "next/link";
import AuthForm from "@/components/AuthForm";

export const runtime = "edge";

export default function LoginPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Welcome back
        </p>
        <h1 className="text-3xl font-semibold">Sign in to ReelVocab</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Continue your vocabulary practice.
        </p>
      </header>
      <div className="rounded-3xl border border-black/5 bg-white/80 p-6 shadow-sm backdrop-blur">
        <AuthForm mode="login" />
      </div>
      <p className="text-sm text-[color:var(--muted)]">
        New here?{" "}
        <Link href="/register" className="font-semibold text-[color:var(--text)]">
          Create an account
        </Link>
      </p>
    </main>
  );
}
