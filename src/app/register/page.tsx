import Link from "next/link";
import AuthForm from "@/components/AuthForm";


export default function RegisterPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-6 py-12">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[color:var(--muted)]">
          Create account
        </p>
        <h1 className="text-3xl font-semibold">Start learning with ReelVocab</h1>
        <p className="text-sm text-[color:var(--muted)]">
          Pick a username and password. No email required.
        </p>
      </header>
      <div className="rounded-3xl border border-black/5 bg-white/80 p-6 shadow-sm backdrop-blur">
        <AuthForm mode="register" />
      </div>
      <p className="text-sm text-[color:var(--muted)]">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[color:var(--text)]">
          Sign in
        </Link>
      </p>
    </main>
  );
}
