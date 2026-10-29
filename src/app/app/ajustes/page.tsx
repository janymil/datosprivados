import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listActivity, listBanks, listDocuments, listIncidents, listRequests } from "@/lib/data";
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
        eyebrow="Cuenta"
        title="Ajustes"
        description="Plan, cuenta y exportación del expediente. En el MVP los pagos y las notificaciones están simulados."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="label-mono">Plan actual</p>
              <p className="mt-2 font-display text-[2rem] leading-none capitalize tracking-[-0.03em]">
                {company.plan}
              </p>
              <p className="mt-2 text-[12.5px] text-ink-soft">
                {company.plan === "pro"
                  ? "Bancos y solicitudes ilimitadas, soporte prioritario."
                  : "2 bancos de datos y hasta 30 solicitudes ARCO al año."}
              </p>
            </div>
            <StatusPill tone="ok">Activo</StatusPill>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            <Link href="/#precios" className="btn btn-ghost btn-sm">
              Comparar planes
            </Link>
            <a
              href={`mailto:hola@privadope.pe?subject=Cambio de plan · ${company.name}`}
              className="btn btn-primary btn-sm"
            >
              Cambiar de plan
            </a>
          </div>
          <p className="mt-3 font-mono text-[9px] uppercase tracking-[0.1em] text-ink-soft">
            Cobros con Culqi / Niubiz · pendiente de integración
          </p>
        </section>

        <section className="card p-6">
          <p className="label-mono">Cuenta</p>
          <dl className="mt-3 divide-y divide-line border-t border-line text-[13px]">
            {[
              ["Nombre", user.name],
              ["Correo", user.email],
              ["Rol", "Administrador"],
              ["Empresa", company.name],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4 py-3">
                <dt className="text-ink-soft">{label}</dt>
                <dd className="truncate text-right">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-[11.5px] leading-relaxed text-ink-soft">
            Para cambiar el correo o la contraseña, escríbenos. La autenticación con múltiples usuarios
            llega en la siguiente versión.
          </p>
        </section>

        <section className="card p-6">
          <p className="label-mono">Notificaciones</p>
          <p className="mt-2 text-[12.5px] leading-relaxed text-ink-soft">
            La versión de producción enviará recordatorios por correo y WhatsApp. En este MVP no se
            envían mensajes automáticos.
          </p>
          <ul className="mt-4 space-y-3 border-t border-line pt-4 text-[12.5px]">
            {[
              ["ARCO por vencer", "Aviso 5 días hábiles antes del vencimiento."],
              ["Incidente registrado", "Alerta inmediata al responsable de privacidad."],
              ["Resumen semanal", "Estado del expediente cada lunes."],
            ].map(([title, body]) => (
              <li key={title} className="flex items-start gap-3">
                <span className="mt-[6px] h-2 w-2 shrink-0 border border-line-strong bg-line" />
                <div>
                  <p>{title}</p>
                  <p className="text-[11.5px] text-ink-soft">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="border border-ink bg-ink p-6 text-paper">
          <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-paper/40">
            Exportación
          </p>
          <h2 className="mt-2 font-display text-xl tracking-[-0.02em]">Lleva tu expediente contigo</h2>
          <p className="mt-2 text-[12.5px] leading-relaxed text-paper/65">
            Descarga un JSON con tu empresa, bancos de datos, solicitudes ARCO, incidentes y documentos.
            Sirve como respaldo o para entregarlo a tu abogado.
          </p>
          <div className="mt-4">
            <DownloadButton
              text={exported}
              filename={`expediente-${company.slug}.json`}
              label="Descargar expediente (.json)"
            />
          </div>
          <p className="mt-4 border-t border-paper/15 pt-3 font-mono text-[9px] uppercase tracking-[0.1em] text-paper/40">
            {banks.length} bancos · {requests.length} solicitudes · {incidents.length} incidentes ·{" "}
            {documents.length} documentos
          </p>
        </section>
      </div>

      <section className="border-l-2 border-line-strong bg-paper-2 px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">Estado del MVP</p>
        <p className="mt-1 max-w-[80ch] text-[13px] leading-relaxed">
          Esta instancia guarda los datos en SQLite, dentro del servidor. Antes de abrir al público falta:
          autenticación multiusuario, cobros, envío real de correos y WhatsApp, respaldos y términos
          legales revisados.
        </p>
      </section>
    </div>
  );
}
