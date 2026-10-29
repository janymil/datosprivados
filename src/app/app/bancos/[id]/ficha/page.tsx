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
    ["Denominación del banco de datos", bank.name],
    ["Finalidad", bank.purpose || "—"],
    ["Categorías de datos personales", bank.data_categories || "—"],
    ["Base legal del tratamiento", legalBasisLabel(bank.legal_basis)],
    ["Plazo de conservación", bank.retention || "—"],
    ["Destinatarios / encargados", bank.recipients || "—"],
    ["Transferencias internacionales", bank.transfers === "si" ? "Sí" : "No"],
    ["Canal de recolección", bank.channel || "—"],
    ["Código SIPDP", bank.sipdp_code || "Pendiente de registro"],
    ["Fecha de registro", bank.registered_at ? formatDate(bank.registered_at) : "Pendiente"],
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <Link
          href={`/app/bancos/${bank.id}`}
          className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft hover:text-ink"
        >
          ← Volver al banco
        </Link>
        <PrintButton />
      </div>

      <article className="print-page mx-auto w-full max-w-[780px] border border-line bg-white p-8 text-[#17191e] shadow-[0_20px_60px_-40px_rgba(0,0,0,0.4)] md:p-12">
        <header className="flex items-start justify-between gap-6 border-b-2 border-[#17191e] pb-5">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[#52565e]">
              República del Perú · Ley 29733
            </p>
            <h1 className="mt-2 font-display text-[1.9rem] leading-tight tracking-[-0.03em]">
              Ficha técnica de banco de datos
            </h1>
            <p className="mt-1 text-[12px] text-[#52565e]">
              Documento de trabajo para el registro en el SIPDP
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#52565e]">Empresa</p>
            <p className="mt-1 max-w-[220px] font-display text-[15px] leading-tight">{company.name}</p>
            <p className="mt-1 font-mono text-[10px]">RUC {company.ruc}</p>
          </div>
        </header>

        <dl className="mt-6 divide-y divide-[#d9cfbc]">
          {rows.map(([label, value]) => (
            <div key={label} className="grid gap-1 py-3 sm:grid-cols-[220px_1fr] sm:gap-6">
              <dt className="font-mono text-[9px] uppercase tracking-[0.1em] text-[#52565e]">{label}</dt>
              <dd className="text-[12.5px] leading-relaxed">{value}</dd>
            </div>
          ))}
        </dl>

        <section className="mt-6 border-t border-[#d9cfbc] pt-5">
          <h2 className="font-mono text-[9px] uppercase tracking-[0.14em] text-[#52565e]">
            Cómo usar esta ficha
          </h2>
          <ol className="mt-2 space-y-1.5 text-[11.5px] leading-relaxed text-[#33363c]">
            <li>1. Ingresa al portal del SIPDP de la ANPD con tu Clave Única.</li>
            <li>2. Crea o actualiza el banco de datos copiando los campos de esta ficha.</li>
            <li>3. Registra el código que te asigne el sistema en PrivadoPE.</li>
            <li>4. Archiva la constancia junto con este documento.</li>
          </ol>
        </section>

        <footer className="mt-8 flex items-end justify-between gap-6 border-t border-[#d9cfbc] pt-4">
          <div className="text-[10px] leading-relaxed text-[#52565e]">
            <p>Generado con PrivadoPE el {formatDate(new Date().toISOString(), "long")}.</p>
            <p>Documento de trabajo; no reemplaza la constancia oficial de la ANPD.</p>
          </div>
          <div className="shrink-0 border border-[#b0241c] px-3 py-2 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-[#b0241c]">
            {bank.status === "registrado" ? "Registrado" : "Borrador"}
          </div>
        </footer>
      </article>
    </div>
  );
}
