import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getBank } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { legalBasisLabel } from "@/lib/documents";
import { PrintButton } from "@/components/print-button";

export const metadata = { title: "Ficha SIPDP" };

export default async function BankSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { company } = await requireSession();
  const { id } = await params;
  const bank = getBank(company.id, id);
  if (!bank) notFound();

  const rows: Array<[string, string]> = [
    ["1. Denominación del banco de datos", bank.name],
    ["2. Finalidad y usos previstos", bank.purpose || "—"],
    ["3. Categorías de datos personales", bank.data_categories || "—"],
    ["4. Base legal del tratamiento", legalBasisLabel(bank.legal_basis)],
    ["5. Plazo de conservación", bank.retention || "—"],
    ["6. Destinatarios / encargados externos", bank.recipients || "—"],
    [
      "7. Flujo transfronterizo (transferencia internacional)",
      bank.transfers === "si" ? "Sí (alojamiento o servicios en nube fuera del Perú)" : "No (solo en territorio peruano)",
    ],
    ["8. Canal de obtención de los datos", bank.channel || "—"],
    ["9. Código de inscripción RNPDP / SIPDP", bank.sipdp_code || "Pendiente de inscripción"],
    ["10. Fecha de inscripción", bank.registered_at ? formatDate(bank.registered_at) : "Pendiente"],
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <Link
          href={`/app/bancos/${bank.id}`}
          className="font-mono text-xs uppercase tracking-[0.08em] text-ink-soft hover:text-ink"
        >
          ← Volver al banco de datos
        </Link>
        <div className="flex items-center gap-2.5">
          <a
            href="https://sipdp.minjus.gob.pe/"
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost btn-sm"
          >
            Abrir portal SIPDP (MINJUSDH) ↗
          </a>
          <PrintButton label="Imprimir / Guardar PDF" />
        </div>
      </div>

      <article className="print-page mx-auto w-full max-w-[820px] border border-line bg-white p-8 text-[#17191e] shadow-[0_20px_60px_-40px_rgba(0,0,0,0.4)] md:p-12">
        <header className="flex items-start justify-between gap-6 border-b-2 border-[#17191e] pb-5">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-[#52565e]">
              República del Perú · Ley N.° 29733 y DS N.° 016-2024-JUS
            </p>
            <h1 className="mt-2 font-display text-[2rem] leading-tight tracking-[-0.03em]">
              Ficha técnica de banco de datos personales
            </h1>
            <p className="mt-1.5 text-sm text-[#52565e]">
              Hoja de trabajo para la inscripción gratuita en el RNPDP / Portal SIPDP (MINJUSDH)
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-[#52565e]">Responsable</p>
            <p className="mt-1 max-w-[230px] font-display text-lg leading-tight">{company.name}</p>
            <p className="mt-1 font-mono text-xs">RUC {company.ruc}</p>
          </div>
        </header>

        <dl className="mt-6 divide-y divide-[#d9cfbc]">
          {rows.map(([label, value]) => (
            <div key={label} className="grid gap-1.5 py-3.5 sm:grid-cols-[250px_1fr] sm:gap-6">
              <dt className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-[#52565e]">{label}</dt>
              <dd className="text-[15.5px] leading-relaxed">{value}</dd>
            </div>
          ))}
        </dl>

        <section className="mt-6 border-t border-[#d9cfbc] pt-5">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#52565e]">
            Pasos para inscribir este banco gratis en el portal del Estado (SIPDP)
          </h2>
          <ol className="mt-2.5 space-y-2 text-sm leading-relaxed text-[#33363c]">
            <li>
              <strong>1.</strong> Ingresa al portal oficial del Sistema Integrado de Protección de Datos Personales (SIPDP) del MINJUSDH:{" "}
              <span className="font-mono">https://sipdp.minjus.gob.pe/</span>
            </li>
            <li>
              <strong>2.</strong> Crea tu usuario o inicia sesión (si actúas como empresa RUC 20, adjunta la vigencia de poder o ficha RUC del representante legal según pide el sistema).
            </li>
            <li>
              <strong>3.</strong> Selecciona «Inscripción de Banco de Datos Personales» (trámite gratuito, S/ 0) y copia los campos de esta ficha técnica.
            </li>
            <li>
              <strong>4.</strong> Descarga la Constancia de Inscripción que emite el sistema y guarda el código asignado dentro de PrivadoPE.
            </li>
          </ol>
        </section>

        <footer className="mt-8 flex items-end justify-between gap-6 border-t border-[#d9cfbc] pt-4">
          <div className="text-xs leading-relaxed text-[#52565e]">
            <p>Generado con PrivadoPE el {formatDate(new Date().toISOString(), "long")}.</p>
            <p>Hoja de trabajo interna; la inscripción oficial se acredita con la constancia emitida por la ANPD.</p>
          </div>
          <div className="shrink-0 border border-[#b0241c] px-3.5 py-2 text-center font-mono text-xs font-semibold uppercase tracking-[0.12em] text-[#b0241c]">
            {bank.status === "registrado" ? "Inscrito en SIPDP" : "Borrador por inscribir"}
          </div>
        </footer>
      </article>
    </div>
  );
}
