import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listBanks } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { EmptyState, PageHeader, StatusPill } from "@/components/ui";
import { ArrowRightIcon } from "@/components/icons";

export const metadata = { title: "Bancos de datos" };

export default async function BanksPage() {
  const { company } = await requireSession();
  const banks = listBanks(company.id);
  const registered = banks.filter((bank) => bank.status === "registrado").length;

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Expediente · Inventario"
        title="Bancos de datos"
        description="Declara cada conjunto de datos personales que tratas. Con esta información generamos tu política y preparamos el registro en el SIPDP."
        actions={
          <>
            <Link href="/app/documentos" className="btn btn-ghost btn-sm">
              Generar documentos
            </Link>
            <Link href="/app/bancos/nuevo" className="btn btn-primary btn-sm">
              Nuevo banco
            </Link>
          </>
        }
      />

      <div className="flex flex-col gap-3 border border-line bg-paper-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-2xl leading-none">{registered}</span>
          <span className="text-[13px] text-ink-soft">
            de {banks.length} bancos con código SIPDP guardado
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-[5px] w-40 bg-line">
            <div
              className="h-full bg-sage"
              style={{ width: `${banks.length ? (registered / banks.length) * 100 : 0}%` }}
            />
          </div>
          <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-soft">
            {banks.length ? Math.round((registered / banks.length) * 100) : 0}%
          </span>
        </div>
      </div>

      {banks.length === 0 ? (
        <EmptyState
          title="Aún no declaras bancos de datos"
          description="Empieza por los tres básicos: clientes, colaboradores y proveedores. Puedes ajustar la finalidad y los plazos después."
          action={{ href: "/app/bancos/nuevo", label: "Declarar el primero" }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {banks.map((bank) => (
            <Link
              key={bank.id}
              href={`/app/bancos/${bank.id}`}
              className="group card flex flex-col justify-between p-5 transition-colors hover:border-line-strong"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-[1.3rem] leading-tight tracking-[-0.02em] group-hover:text-crimson">
                    {bank.name}
                  </h2>
                  <StatusPill tone={bank.status === "registrado" ? "ok" : "neutral"}>
                    {bank.status === "registrado" ? "Registrado" : "Borrador"}
                  </StatusPill>
                </div>
                <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-ink-soft">
                  {bank.purpose || "Sin finalidad declarada."}
                </p>
                <p className="mt-3 line-clamp-1 text-[11.5px] text-ink-soft/80">
                  {bank.data_categories || "Sin categorías de datos."}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-line pt-3">
                <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-ink-soft">
                  {bank.status === "registrado"
                    ? `${bank.sipdp_code} · ${formatDate(bank.registered_at, "short")}`
                    : "Sin código SIPDP"}
                </span>
                <ArrowRightIcon className="h-3.5 w-3.5 text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:text-crimson" />
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="border-l-2 border-line-strong bg-paper-2 px-5 py-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">
          Sobre el registro SIPDP
        </p>
        <p className="mt-1 max-w-[80ch] text-[13px] leading-relaxed text-ink">
          El registro se realiza en la plataforma de la ANPD. PrivadoPE te entrega la ficha con todos
          los campos y guarda el código y la fecha que obtengas. Si un banco cambia de finalidad,
          actualízalo aquí y vuelve a declararlo.
        </p>
      </div>
    </div>
  );
}
