import Link from "next/link";

export default function DashboardLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[#0d131f]/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              CarryGO
            </p>
            <h1 className="text-lg font-bold">Operations Dashboard</h1>
          </div>
          <nav className="flex gap-4 text-sm text-[var(--text-secondary)]">
            <Link href="/(dashboard)">Overview</Link>
            <span>Drivers</span>
            <span>Trips</span>
            <span>Disputes</span>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
