import { KpiCard } from "@/components/kpi-card";

const liveTrips = [
  {
    id: "BKG-20841",
    route: "Madina -> Tema",
    truckType: "Kia Rhino",
    status: "In transit",
    eta: "22 mins"
  },
  {
    id: "BKG-20842",
    route: "Kaneshie -> Adenta",
    truckType: "Mini Truck",
    status: "Driver assigned",
    eta: "Driver heading to pickup"
  }
];

export default function DashboardPage() {
  return (
    <section className="space-y-8">
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Active trips" value="128" trend="+12% vs yesterday" />
        <KpiCard label="Pending driver approvals" value="19" />
        <KpiCard label="Escrow held (GHS)" value="284,930" />
        <KpiCard label="Pending disputes" value="7" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-bold">Live trip monitor</h2>
          <div className="mt-4 space-y-3">
            {liveTrips.map((trip) => (
              <div
                className="rounded-xl border border-[var(--border)] bg-[#0f1726] p-4"
                key={trip.id}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{trip.id}</p>
                  <span className="text-xs text-[var(--accent)]">{trip.status}</span>
                </div>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">{trip.route}</p>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {trip.truckType} - {trip.eta}
                </p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-lg font-bold">Municipality activity heatmap</h2>
          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            Heatmap tiles are generated from bookings and driver density. Connect this panel to Supabase
            analytics views for live overlays per municipality.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
            <li>Madina - 32 active requests</li>
            <li>Tema - 27 active requests</li>
            <li>Kaneshie - 18 active requests</li>
            <li>Adenta - 16 active requests</li>
          </ul>
        </article>
      </div>
    </section>
  );
}
