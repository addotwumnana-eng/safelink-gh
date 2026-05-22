import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center px-6">
      <div className="w-full rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          CarryGO
        </p>
        <h1 className="mt-3 text-4xl font-extrabold">Admin Operations Console</h1>
        <p className="mt-3 text-sm text-[var(--text-secondary)]">
          Approve drivers, monitor live trips, resolve disputes, and control payout flows from a single dashboard.
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            className="rounded-xl bg-[var(--accent)] px-5 py-3 text-sm font-bold text-[#101218]"
            href="/(dashboard)"
          >
            Open dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
