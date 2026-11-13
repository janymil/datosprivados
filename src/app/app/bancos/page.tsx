import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listBanks, listCancelledBanks } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { EmptyState, PageHeader, StatusPill } from "@/components/ui";
import { ArrowRightIcon } from "@/components/icons";
import { GuideBox, Term } from "@/components/help";
import { findSectorByLabel } from "@/lib/sectors";
import { getBankPreset } from "@/lib/bank-presets";
import { Toast } from "@/components/toast";

export const metadata = { title: "Bancos de datos" };

/**
 * Compara el nombre que el usuario le puso a su banco con el nombre de la
 * plantilla del rubro. No pretende ser exacto: basta con que compartan una
 * palabra significativa ("clientes", "seguridad", "facturación") para no
 * mostrarlo como faltante después de haberlo renombrado.
 */
const STOPWORDS = new Set([
  "para",
  "online",
  "ecommerce",
  "digital",
  "datos",
  "segun",
  "otros",
  "otras",
]);

function bankWords(value: string): string[] {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 4 && !STOPWORDS.has(word));
}

function sameBankName(declared: string, preset: string): boolean {
  const declaredWords = bankWords(declared);
  const presetWords = bankWords(preset);
  if (declaredWords.length === 0 || presetWords.length === 0) return false;
  return declaredWords.some((word) => presetWords.includes(word));
}

export default async function BanksPage({ searchParams }: { searchParams: Promise<{ eliminado?: string }> }) {
  const { company } = await requireSession();
  const { eliminado } = await searchParams;
  const banks = listBanks(company.id);
  const cancelledBanks = listCancelledBanks(company.id);
  const registered = banks.filter((bank) => bank.status === "registrado").length;

  // Cobertura esperada para el rubro: sirve para que nadie olvide un banco entero
  // (el caso típico: una plataforma sin banco de facturación o de logs).
  const sector = findSectorByLabel(company.sector);
  const suggestedNames = (sector?.banks ?? [])
    .map((id) => getBankPreset(id)?.name)
    .filter((name): name is string => Boolean(name));
  const coverageMissing = suggestedNames.filter(
    (name) => !banks.some((bank) => sameBankName(bank.name, name))
  );
  const coverageTotal = suggestedNames.length;

  return (
    <div className="space-y-7">
      {eliminado && <Toast message="Banco de datos eliminado." />}
      <PageHeader
        title={
          <>
            Tus <Term k="banco">bancos de datos</Term> <span className="text-ink-soft">(tus listas)</span>
          </>
        }
        description={
          <>
            Cada lista de personas que guardas: clientes, trabajadores, proveedores, cámaras. No es un banco financiero.
          </>
        }
        actions={
          <>
            <Link href="/app/bancos/nuevo" className="btn btn-primary btn-sm">
              + Nuevo banco (con plantillas)
            </Link>
          </>
        }
      />

      <GuideBox
        title="¿Qué es un Banco de Datos, por qué debo inscribirlo y cuánto cuesta?"
        defaultOpen={banks.length === 0}
        what={
          <>
            Cada grupo de personas del que guardas información es un <Term k="banco">banco de datos</Term>. Por ejemplo: <strong>1) Clientes</strong>, <strong>2) Trabajadores</strong> y <strong>3) Proveedores</strong> son 3 bancos distintos.
          </>
        }
        why={
          <>
            La <Term k="ley29733">Ley 29733</Term> exige inscribir cada banco en el Registro Nacional (<Term k="rnpdp">RNPDP</Term>) de la <Term k="anpd">ANPD</Term>. Según el nuevo reglamento <Term k="ds016">DS 016-2024-JUS</Term>, <strong>el trámite en el Estado es 100 % gratuito (S/ 0)</strong> y virtual.
          </>
        }
        how={
          <>
            <strong>1)</strong> Haz clic en «Nuevo banco» y elige una plantilla lista.{" "}
            <strong>2)</strong> Abre su «Ficha SIPDP» y cópiala en{" "}
            <a
              href="https://sipdp.minjus.gob.pe/"
              target="_blank"
              rel="noreferrer"
              className="link-underline font-medium"
            >
              sipdp.minjus.gob.pe
            </a>
            . <strong>3)</strong> Anota aquí el código que te den.
          </>
        }
      />

      <div className="flex flex-col gap-3 border border-line bg-paper-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-baseline gap-3">
          <span className="font-display text-3xl leading-none">{registered}</span>
          <span className="text-base text-ink-soft">
            de {banks.length} bancos inscritos con código oficial del <Term k="sipdp">SIPDP</Term>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-[6px] w-44 bg-line">
            <div
              className="h-full bg-sage"
              style={{ width: `${banks.length ? (registered / banks.length) * 100 : 0}%` }}
            />
          </div>
          <span className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-ink-soft">
            {banks.length ? Math.round((registered / banks.length) * 100) : 0}%
          </span>
        </div>
      </div>

      {coverageMissing.length > 0 && (
        <div className="border-l-3 border-crimson bg-paper-2 px-5 py-4">
          <p className="text-[15px] leading-relaxed">
            <strong>Tu rubro suele tener {coverageTotal} bancos y tienes {banks.length}.</strong> Te faltarían:{" "}
            <span className="text-ink-soft">{coverageMissing.join(", ")}</span>.
          </p>
          <p className="mt-1.5 text-sm text-ink-soft">
            No es una obligación automática: declara solo los que realmente tratas. Si alguno aplica,{" "}
            <Link href="/app/bancos/nuevo" className="link-underline font-medium text-ink">
              créalo con su plantilla
            </Link>{" "}
            y quedará en tu política de privacidad.
          </p>
        </div>
      )}

      {banks.length === 0 ? (
        <EmptyState
          title="Aún no has declarado tus listas (bancos de datos)"
          description="No tienes que redactar nada desde cero: tenemos plantillas listas con 1 clic para Clientes, Trabajadores en planilla, Marketing por WhatsApp, Proveedores, Cámaras y Pacientes."
          action={{ href: "/app/bancos/nuevo", label: "Declarar el primero con plantilla" }}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {banks.map((bank) => (
            <Link
              key={bank.id}
              href={`/app/bancos/${bank.id}`}
              className="group card flex flex-col justify-between p-6 transition-colors hover:border-line-strong"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-[1.45rem] leading-tight tracking-[-0.02em] group-hover:text-crimson">
                    {bank.name}
                  </h2>
                  <StatusPill tone={bank.status === "registrado" ? "ok" : "neutral"}>
                    {bank.status === "registrado" ? "Inscrito en SIPDP" : "Borrador (falta inscribir)"}
                  </StatusPill>
                </div>
                <p className="mt-2.5 line-clamp-2 text-[15.5px] leading-relaxed text-ink-soft">
                  {bank.purpose || "Sin finalidad declarada."}
                </p>
                <p className="mt-3 line-clamp-1 text-sm text-ink-soft/90">
                  <strong className="font-mono text-xs uppercase tracking-wider text-ink-soft">Datos: </strong>
                  {bank.data_categories || "Sin categorías de datos."}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-line pt-3.5">
                <span className="font-mono text-xs uppercase tracking-[0.06em] text-ink-soft">
                  {bank.status === "registrado"
                    ? `${bank.sipdp_code} · ${formatDate(bank.registered_at, "short")}`
                    : "Haz clic para ver la Ficha SIPDP y registrar"}
                </span>
                <ArrowRightIcon className="h-4 w-4 text-ink-soft transition-transform group-hover:translate-x-0.5 group-hover:text-crimson" />
              </div>
            </Link>
          ))}
        </div>
      )}

      {cancelledBanks.length > 0 && (
        <details className="border border-line px-5 py-4">
          <summary className="cursor-pointer font-mono text-xs uppercase tracking-[0.08em] text-ink-soft hover:text-ink">
            Inscripciones canceladas ({cancelledBanks.length})
          </summary>
          <ul className="mt-3 divide-y divide-line">
            {cancelledBanks.map((bank) => (
              <li key={bank.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                <Link href={`/app/bancos/${bank.id}`} className="link-underline">
                  {bank.name}
                </Link>
                <span className="font-mono text-xs text-ink-soft">
                  {bank.sipdp_code} · cancelado el {formatDate(bank.cancelled_at, "short")}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
