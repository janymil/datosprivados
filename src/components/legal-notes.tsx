import Link from "next/link";

/**
 * Avisos legales que deben verse, no esconderse en el pie:
 * - `TemplateNotice`: los documentos son plantillas generadas, no asesoría legal,
 *   hasta que el abogado revise los textos (P0-LEGAL, área 7).
 * - `HolidayDisclaimer`: los plazos se cuentan en días hábiles con los feriados
 *   nacionales cargados; los regionales y los días no laborables por decreto no se
 *   descuentan solos.
 */

export function TemplateNotice({ className = "" }: { className?: string }) {
  return (
    <div
      role="note"
      className={`border-l-3 border-ochre bg-ochre/[0.08] px-4 py-3 text-[15px] leading-relaxed ${className}`.trim()}
    >
      <strong>Son plantillas, no asesoría legal.</strong> Cada documento se arma con los datos de tu empresa y sigue la
      Ley N.° 29733 y su Reglamento, pero no sustituye la revisión de un abogado. Antes de publicarlo, comprueba que
      describa lo que realmente haces con los datos.{" "}
      <Link href="/app/ayuda/documentos" className="link-underline font-medium text-ink">
        Cómo revisar tus documentos
      </Link>
      .
    </div>
  );
}

export function HolidayDisclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`text-sm leading-relaxed text-ink-soft ${className}`.trim()}>
      Los plazos se cuentan en días hábiles (lunes a viernes, sin feriados nacionales). Los feriados regionales y los
      días no laborables declarados por decreto no se descuentan solos: si tu región los tiene, tenlos en cuenta al
      responder.
    </p>
  );
}
