import "server-only";

import { getDb } from "./db";
import { limaToday } from "./format";

/**
 * Vista de clientes para el operador: solo lectura y sin datos de los titulares
 * (ARCO, incidentes): solo conteos. Las cuentas eliminadas se cuentan pero no se
 * listan; su fila queda solo como registro tributario.
 */
export type CustomerRow = {
  id: string;
  name: string;
  ruc: string;
  email: string;
  plan: string;
  billing_term: string;
  billing_status: string;
  subscription_status: string | null;
  paid_until: string | null;
  created_at: string;
  onboarded_at: string | null;
  users: number;
  banks: number;
  open_requests: number;
  last_activity: string | null;
  paid_total: number;
};

export type CustomerOverview = {
  customers: CustomerRow[];
  counts: Record<"active" | "pending" | "expired" | "demo" | "deleted", number>;
  /** Clientes activos cuyo período pagado vence en los próximos 30 días. */
  renewalsSoon: number;
  /** Cobros aprobados en los últimos 30 días (S/). */
  revenue30d: number;
};

export function getCustomerOverview(now = new Date()): CustomerOverview {
  const db = getDb();
  const customers = db
    .prepare(
      `SELECT c.id, c.name, c.ruc, c.email, c.plan, c.billing_term, c.billing_status, c.subscription_status,
              c.paid_until, c.created_at, c.onboarded_at,
              (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id) AS users,
              (SELECT COUNT(*) FROM data_banks b WHERE b.company_id = c.id AND b.status != 'cancelado') AS banks,
              (SELECT COUNT(*) FROM arco_requests r WHERE r.company_id = c.id AND r.status IN ('nuevo', 'en_proceso')) AS open_requests,
              (SELECT MAX(a.created_at) FROM activity a WHERE a.company_id = c.id) AS last_activity,
              (SELECT COALESCE(SUM(p.amount), 0) FROM payments p WHERE p.company_id = c.id AND p.status = 'approved') AS paid_total
       FROM companies c
       WHERE c.billing_status != 'deleted' AND c.deleted_at IS NULL
       ORDER BY CASE c.billing_status WHEN 'active' THEN 0 WHEN 'pending' THEN 1 WHEN 'expired' THEN 2 ELSE 3 END,
                c.created_at DESC`
    )
    .all()
    .map((row) => ({ ...(row as CustomerRow) }));

  const counts = { active: 0, pending: 0, expired: 0, demo: 0, deleted: 0 };
  for (const row of db.prepare("SELECT billing_status AS s, COUNT(*) AS n FROM companies GROUP BY billing_status").all() as {
    s: string;
    n: number;
  }[]) {
    if (row.s in counts) counts[row.s as keyof typeof counts] = row.n;
  }

  const today = limaToday(now);
  const in30 = limaToday(new Date(now.getTime() + 30 * 86_400_000));
  const renewalsSoon = customers.filter(
    (c) => c.billing_status === "active" && c.paid_until && c.paid_until.slice(0, 10) >= today && c.paid_until.slice(0, 10) <= in30
  ).length;
  const since = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const revenue30d =
    (
      db
        .prepare("SELECT COALESCE(SUM(amount), 0) AS total FROM payments WHERE status = 'approved' AND COALESCE(paid_at, created_at) >= ?")
        .get(since) as { total: number }
    ).total ?? 0;

  return { customers, counts, renewalsSoon, revenue30d };
}
