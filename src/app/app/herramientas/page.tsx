import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listProviders } from "@/lib/data";
import { saveToolsAction, updateProviderAction } from "@/app/actions/tools";
import { ToolsPicker } from "@/components/tools-picker";
import { PageHeader, StatusPill } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { Toast } from "@/components/toast";
import { ADEQUATE_COUNTRIES, ADEQUATE_LIST_REVIEWED, isAbroad, toolCategory } from "@/lib/provider-catalog";
import { sectorLegalProfile } from "@/lib/sector-legal";

export const metadata = { title: "Herramientas" };

export default async function ToolsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; saved?: string }>;
}) {
  const { company } = await requireSession();
  const { ok, saved } = await searchParams;
  const providers = listProviders(company.id);
  const profile = sectorLegalProfile(company);
  const abroad = providers.filter((provider) => isAbroad(provider.country));
  const pendingContracts = providers.filter((p) => p.dpa_status === "pendiente").length;
  const pendingTransfers = abroad.filter((p) => p.transfer_status === "pendiente").length;

  return (
    <div className="space-y-7">
      <PageHeader
        title="Herramientas y proveedores"
        description="Los programas y servicios que reciben datos de tus clientes: web, correo, WhatsApp, pagos, publicidad, nube. Si guardan datos fuera del Perú, la ley te pide informarlo, firmar un contrato y comunicarlo a la ANPD."
      />

      {(ok || saved) && (
        <Toast message={ok ? "Herramientas guardadas. Revisa tus documentos desactualizados." : "Estado guardado."} />
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="label-mono">Herramientas</p>
          <p className="mt-2 font-display text-3xl">{providers.length}</p>
        </div>
        <div className="card p-5">
          <p className="label-mono">Datos fuera del Perú</p>
          <p className="mt-2 font-display text-3xl">{abroad.length}</p>
          <p className="mt-1 text-sm text-ink-soft">Cada una es una transferencia internacional.</p>
        </div>
        <div className="card p-5">
          <p className="label-mono">Pendientes</p>
          <p className="mt-2 font-display text-3xl">{pendingContracts + pendingTransfers}</p>
          <p className="mt-1 text-sm text-ink-soft">
            {pendingContracts} contratos · {pendingTransfers} comunicaciones a la ANPD
          </p>
        </div>
      </section>

      <p className="max-w-[80ch] text-sm leading-relaxed text-ink-soft">
        {ADEQUATE_COUNTRIES.length === 0
          ? `Países con nivel adecuado: la ANPD no ha publicado ninguna resolución que conozcamos (revisado el ${ADEQUATE_LIST_REVIEWED}). Por eso, todo envío de datos al exterior exige garantías (cláusulas contractuales, art. 18.2 y 20) además de comunicarse a la ANPD.`
          : `Países con nivel adecuado declarados: ${ADEQUATE_COUNTRIES.map((entry) => `${entry.country} (${entry.resolution})`).join(", ")}.`}{" "}
        Verifica siempre en el portal de la ANPD (gob.pe/anpd) si hay novedades.
      </p>

      {abroad.length > 0 && (
        <section className="card border-l-3 border-ochre p-6">
          <h2 className="font-display text-xl tracking-[-0.02em]">Qué hacer con las que guardan datos fuera del Perú</h2>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-[15px] leading-relaxed">
            <li>
              <strong>Informa</strong> el país y el proveedor en tu Política de Privacidad (art. 6.1.7). Lo hacemos por ti
              al actualizar tus documentos.
            </li>
            <li>
              <strong>Firma un contrato</strong> con cada proveedor: cláusulas que le impongan al menos tus mismas
              obligaciones (art. 20). La mayoría ofrece un DPA en su cuenta; usa también el modelo de{" "}
              <Link href="/app/documentos?tab=encargo" className="link-underline">
                Encargo y transferencias
              </Link>
              .
            </li>
            <li>
              <strong>Comunica</strong> el flujo transfronterizo a la ANPD (art. 21.2): se registra al inscribir o
              modificar tu banco de datos en el SIPDP.
            </li>
            <li>Marca abajo el estado de cada paso para dejar constancia.</li>
          </ol>
        </section>
      )}

      <section className="card overflow-hidden">
        <div className="border-b border-line px-6 py-4">
          <h2 className="font-display text-xl tracking-[-0.02em]">Tu lista</h2>
        </div>
        {providers.length === 0 ? (
          <p className="px-6 py-5 text-[15px] text-ink-soft">
            {company.tools_declared_at
              ? "Declaraste que no usas herramientas externas."
              : "Aún no declaraste tus herramientas. Usa el selector de abajo."}
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {providers.map((provider) => {
              const out = isAbroad(provider.country);
              return (
                <li key={provider.id} className="flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-base font-medium">
                      {provider.name}
                      <StatusPill tone={out ? "warn" : "ok"}>
                        {out ? (provider.country === "No sé" ? "País por verificar" : provider.country) : "Perú"}
                      </StatusPill>
                    </p>
                    <p className="mt-0.5 text-sm text-ink-soft">
                      {toolCategory(provider.category)?.label ?? provider.category}
                      {provider.is_custom ? " · escrita por ti" : ""}
                    </p>
                  </div>
                  {provider.dpa_status === "no_aplica" && !out ? (
                    <p className="text-sm text-ink-soft">Es tuya: no requiere contrato.</p>
                  ) : (
                    <form action={updateProviderAction} className="flex flex-wrap items-end gap-2.5">
                      <input type="hidden" name="id" value={provider.id} />
                      <input type="hidden" name="name" value={provider.name} />
                      <label className="text-xs text-ink-soft">
                        Contrato de encargo
                        <select name="dpa_status" defaultValue={provider.dpa_status} className="input mt-1 !h-9 !py-1">
                          <option value="pendiente">Pendiente</option>
                          <option value="firmado">Firmado / aceptado</option>
                          <option value="no_aplica">No aplica</option>
                        </select>
                      </label>
                      {out && (
                        <label className="text-xs text-ink-soft">
                          Comunicado a la ANPD
                          <select
                            name="transfer_status"
                            defaultValue={provider.transfer_status}
                            className="input mt-1 !h-9 !py-1"
                          >
                            <option value="pendiente">Pendiente</option>
                            <option value="comunicado">Comunicado</option>
                          </select>
                        </label>
                      )}
                      <SubmitButton pendingLabel="…" className="btn btn-ghost btn-sm">
                        Guardar
                      </SubmitButton>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <details className="card group" open={providers.length === 0}>
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-6 py-4 font-display text-xl tracking-[-0.02em] [&::-webkit-details-marker]:hidden">
          Agregar o quitar herramientas
          <span className="text-sm font-sans text-ink-soft">Editar lista</span>
        </summary>
        <form action={saveToolsAction} className="space-y-5 border-t border-line p-6">
          <ToolsPicker
            family={profile.family}
            initialWeb={profile.web || Boolean(company.website)}
            initial={providers.map((provider) => ({
              category: provider.category,
              name: provider.name,
              country: provider.country,
              custom: Boolean(provider.is_custom),
            }))}
          />
          <SubmitButton pendingLabel="Guardando…">Guardar herramientas</SubmitButton>
        </form>
      </details>
    </div>
  );
}
