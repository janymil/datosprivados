import { requireOperator } from "@/lib/operator";
import { getCustomerOverview } from "@/lib/operator-overview";
import { formatSol } from "@/lib/invoicing";
import { formatDate, limaToday } from "@/lib/format";
import { OperatorNav } from "@/components/operator-nav";

export const metadata = { title: "Clientes · Operador", robots: { index: false } };
export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  active: "Activo",
  pending: "Sin pagar",
  expired: "Vencido",
  demo: "Demo",
};

export default async function OperatorCustomersPage() {
  await requireOperator();
  const { customers, counts, renewalsSoon, revenue30d } = getCustomerOverview();
  const today = limaToday();

  const tiles: Array<[string, string | number]> = [
    ["Activos", counts.active],
    ["Sin pagar", counts.pending],
    ["Vencidos", counts.expired],
    ["Renuevan en 30 días", renewalsSoon],
    ["Cobrado en 30 días", formatSol(revenue30d)],
    ["Cuentas eliminadas", counts.deleted],
  ];

  return (
    <main id="contenido" tabIndex={-1} className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <header>
        <OperatorNav current="clientes" />
        <h1 className="mt-4 font-display text-4xl tracking-[-0.03em]">Clientes</h1>
        <p className="mt-2 text-sm text-ink-soft">
          Solo lectura. Las cuentas eliminadas se cuentan pero no se listan. No se muestran datos de los titulares, solo
          conteos.
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {tiles.map(([label, value]) => (
          <div key={label} className="card p-4">
            <dt className="font-mono text-xs uppercase tracking-[0.08em] text-ink-soft">{label}</dt>
            <dd className="mt-1 font-display text-2xl">{value}</dd>
          </div>
        ))}
      </dl>

      {customers.length === 0 ? (
        <p className="text-sm text-ink-soft">Aún no hay clientes.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-sm">
            <caption className="sr-only">Clientes por estado de pago</caption>
            <thead className="border-b border-line font-mono text-xs uppercase tracking-[0.06em] text-ink-soft">
              <tr>
                <th scope="col" className="py-2 pr-3">Empresa</th>
                <th scope="col" className="py-2 pr-3">Plan</th>
                <th scope="col" className="py-2 pr-3">Estado</th>
                <th scope="col" className="py-2 pr-3">Pagado hasta</th>
                <th scope="col" className="py-2 pr-3 text-right">Cobrado</th>
                <th scope="col" className="py-2 pr-3 text-right">Usuarios</th>
                <th scope="col" className="py-2 pr-3 text-right">Bancos</th>
                <th scope="col" className="py-2 pr-3 text-right">ARCO abiertas</th>
                <th scope="col" className="py-2 pr-3">Alta</th>
                <th scope="col" className="py-2">Última actividad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {customers.map((c) => {
                const lapsed = c.billing_status === "active" && c.paid_until && c.paid_until.slice(0, 10) < today;
                return (
                  <tr key={c.id}>
                    <td className="py-2.5 pr-3">
                      <span className="font-medium">{c.name}</span>
                      <span className="block text-xs text-ink-soft">
                        RUC {c.ruc || "—"} · {c.email}
                        {!c.onboarded_at && " · sin configurar"}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      {c.plan === "pro" ? "Pro" : "Básico"} · {c.billing_term === "yearly" ? "anual" : "mensual"}
                    </td>
                    <td className="py-2.5 pr-3">
                      {STATUS_LABEL[c.billing_status] ?? c.billing_status}
                      {c.subscription_status && <span className="block text-xs text-ink-soft">MP: {c.subscription_status}</span>}
                    </td>
                    <td className={`py-2.5 pr-3 ${lapsed ? "text-crimson" : ""}`}>{c.paid_until ? formatDate(c.paid_until) : "—"}</td>
                    <td className="py-2.5 pr-3 text-right">{formatSol(c.paid_total)}</td>
                    <td className="py-2.5 pr-3 text-right">{c.users}</td>
                    <td className="py-2.5 pr-3 text-right">{c.banks}</td>
                    <td className="py-2.5 pr-3 text-right">{c.open_requests}</td>
                    <td className="py-2.5 pr-3">{formatDate(c.created_at)}</td>
                    <td className="py-2.5">{c.last_activity ? formatDate(c.last_activity) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
