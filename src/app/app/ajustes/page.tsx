import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listActivity, listBanks, listDocuments, listIncidents, listRequests } from "@/lib/data";
import { switchCompanyPlanAction } from "@/app/actions/ai";
import { DownloadButton } from "@/components/download-button";
import { PageHeader, StatusPill } from "@/components/ui";

export const metadata = { title: "Ajustes" };

export default async function SettingsPage() {
  const { company, user } = await requireSession();
  const banks = listBanks(company.id);
  const requests = listRequests(company.id);
  const incidents = listIncidents(company.id);
  const documents = listDocuments(company.id);
  const activity = listActivity(company.id, 50);

  const exported = JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      company,
      banks,
      arco_requests: requests,
      incidents,
      documents,
      activity,
    },
    null,
    2
  );

  return (
    <div className="space-y-7">
      <PageHeader
        title="Ajustes"
        description="Plan, cuenta y exportación del expediente."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6 md:p-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label-mono">Plan actual</p>
              <p className="mt-2 font-display text-[2.2rem] leading-none capitalize tracking-[-0.03em]">
                {company.plan}
              </p>
              <p className="mt-2.5 text-[15.5px] text-ink-soft">
                {company.plan === "pro"
                  ? "Incluye Asistente Legal 24/7 + redacción automática en tus módulos (solicitudes ARCO, autocompletado SIPDP, evaluación de incidentes 48 h y revisor de WhatsApp) + bancos y solicitudes ilimitadas."
                  : "Incluye Asistente Legal 24/7 para consultas y redacción de correos/documentos + hasta 2 bancos de datos y 30 solicitudes ARCO al año."}
              </p>
            </div>
            <StatusPill tone="ok">Activo</StatusPill>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-line pt-4">
            <form action={switchCompanyPlanAction}>
              <input
                type="hidden"
                name="plan"
                value={company.plan === "pro" ? "basico" : "pro"}
              />
              <button type="submit" className="btn btn-primary btn-sm">
                {company.plan === "pro"
                  ? "Cambiar a Plan Básico"
                  : "Cambiar a Plan Pro"}
              </button>
            </form>
            <Link href="/#precios" className="btn btn-ghost btn-sm">
              Comparar planes
            </Link>
          </div>
          <p className="mt-3.5 font-mono text-xs uppercase tracking-[0.08em] text-ink-soft">
            Puedes alternar aquí entre el Plan Básico (S/ 19) y el Plan Pro (S/ 39)
          </p>
        </section>

        <section className="card p-6 md:p-7">
          <p className="label-mono">Cuenta</p>
          <dl className="mt-3 divide-y divide-line border-t border-line text-[15.5px]">
            {[
              ["Nombre", user.name],
              ["Correo", user.email],
              ["Rol", "Administrador"],
              ["Empresa", company.name],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-3">
                <dt className="text-ink-soft">{label}</dt>
                <dd className="truncate text-right font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3.5 text-sm leading-relaxed text-ink-soft">
            Para cambiar el correo o la contraseña, escríbenos. La autenticación con múltiples usuarios
            llega en la siguiente versión.
          </p>
        </section>

        <section className="border border-ink bg-ink p-6 text-paper md:p-7">
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-paper/55">
            Exportación
          </p>
          <h2 className="mt-2 font-display text-2xl tracking-[-0.02em]">Lleva tu expediente contigo</h2>
          <p className="mt-2 text-[15.5px] leading-relaxed text-paper/80">
            Descarga un JSON con tu empresa, bancos de datos, solicitudes ARCO, incidentes y documentos.
            Sirve como respaldo o para entregarlo a tu abogado.
          </p>
          <div className="mt-5">
            <DownloadButton
              text={exported}
              filename={`expediente-${company.slug}.json`}
              label="Descargar expediente (.json)"
            />
          </div>
          <p className="mt-5 border-t border-paper/15 pt-3.5 font-mono text-xs uppercase tracking-[0.08em] text-paper/55">
            {banks.length} bancos · {requests.length} solicitudes · {incidents.length} incidentes ·{" "}
            {documents.length} documentos
          </p>
        </section>
      </div>
    </div>
  );
}
