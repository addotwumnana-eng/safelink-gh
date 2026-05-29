type KpiCardProps = {
  label: string;
  value: string;
  trend?: string;
};

export function KpiCard({ label, value, trend }: KpiCardProps) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <p className="text-xs uppercase tracking-wider text-[var(--text-secondary)]">{label}</p>
      <h3 className="mt-3 text-3xl font-extrabold">{value}</h3>
      {trend ? <p className="mt-2 text-sm text-[var(--accent)]">{trend}</p> : null}
    </article>
  );
}
