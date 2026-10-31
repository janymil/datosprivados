import { notFound } from "next/navigation";
import { getDb, nowIso } from "@/lib/db";
import { getDocument, getReviewByToken, sha256 } from "@/lib/data";
import { submitReviewAction } from "@/app/actions/review";
import { DocBody } from "@/components/doc-body";
import { SubmitButton } from "@/components/submit-button";
import { formatDate } from "@/lib/format";

export const metadata = { title: "Revisión de documento", robots: { index: false, follow: false } };

const ERRORS: Record<string, string> = {
  invalida: "Este enlace ya no es válido o ya fue respondido.",
  decision: "Elige si apruebas el documento o si tienes observaciones.",
  nombre: "Escribe tu nombre completo.",
  notas: "Si hay observaciones, descríbelas.",
  cambio: "El documento cambió mientras lo revisabas. Recarga la página y revisa la versión actual.",
};

/**
 * Página pública con enlace secreto: el abogado lee el documento y deja su
 * decisión sin crear cuenta. Solo ve ese documento y el nombre de la empresa.
 */
export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; done?: string }>;
}) {
  const { token } = await params;
  const { error, done } = await searchParams;
  const review = getReviewByToken(token);
  if (!review) notFound();

  const company = getDb().prepare("SELECT name, ruc FROM companies WHERE id = ?").get(review.company_id) as
    | { name: string; ruc: string }
    | undefined;
  const doc = getDocument(review.company_id, review.document_kind);
  if (!company || !doc) notFound();

  const expired = review.status === "pendiente" && review.expires_at < nowIso();
  const answered = review.status !== "pendiente";

  return (
    <main className="mx-auto w-full max-w-[860px] px-5 py-10">
      <p className="label-mono">Revisión legal · borrador generado con DatosPrivados</p>
      <h1 className="mt-3 font-display text-[2.2rem] leading-tight tracking-[-0.03em]">{doc.title}</h1>
      <p className="mt-2 text-[15.5px] text-ink-soft">
        Empresa: <strong className="text-ink">{company.name}</strong> (RUC {company.ruc}) · versión {doc.version} del{" "}
        {formatDate(doc.updated_at, "short")}. Marco: Ley N.° 29733 y DS N.° 016-2024-JUS.
      </p>

      {(done || answered) && (
        <p className="mt-6 border-l-3 border-sage bg-sage/10 px-4 py-3 text-[15px]" role="status">
          {answered
            ? `Respuesta registrada: ${review.status === "aprobado" ? "aprobado" : "con observaciones"} por ${review.reviewer_name} el ${formatDate(review.responded_at, "short")}. Gracias.`
            : "Gracias."}
        </p>
      )}
      {error && (
        <p className="mt-6 border-l-3 border-crimson bg-crimson/10 px-4 py-3 text-[15px] text-crimson" role="alert">
          {ERRORS[error] ?? "No se pudo registrar tu respuesta."}
        </p>
      )}
      {expired && (
        <p className="mt-6 border-l-3 border-ochre bg-ochre/10 px-4 py-3 text-[15px]">
          Este enlace venció. Pide uno nuevo a la empresa.
        </p>
      )}

      <article className="mt-8 border border-line bg-white p-6 md:p-9">
        <DocBody content={doc.content} />
      </article>

      {!answered && !expired && (
        <form action={submitReviewAction} className="mt-8 space-y-5 border border-line bg-paper-2 p-6">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="content_hash" value={sha256(doc.content)} />
          <h2 className="font-display text-2xl tracking-[-0.02em]">Tu revisión</h2>
          <p className="text-[15px] text-ink-soft">
            Tu decisión queda registrada con tu nombre y la fecha, y vale únicamente para el texto que ves arriba. Si la
            empresa lo modifica después, la revisión deja de figurar como vigente.
          </p>

          <fieldset className="space-y-2">
            <legend className="field-label">Decisión</legend>
            <label className="flex items-start gap-2.5 text-[15.5px]">
              <input type="radio" name="decision" value="aprobado" required className="mt-1" />
              <span>Lo revisé y no tengo observaciones.</span>
            </label>
            <label className="flex items-start gap-2.5 text-[15.5px]">
              <input type="radio" name="decision" value="observado" className="mt-1" />
              <span>Tengo observaciones (descríbelas abajo).</span>
            </label>
          </fieldset>

          <label className="block text-sm text-ink-soft">
            Observaciones
            <textarea name="notes" rows={5} maxLength={3000} className="input mt-1" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-ink-soft">
              Nombre completo
              <input name="name" required minLength={3} defaultValue={review.reviewer_name} className="input mt-1" />
            </label>
            <label className="block text-sm text-ink-soft">
              N.° de colegiatura (opcional)
              <input name="license" maxLength={60} className="input mt-1" placeholder="CAL 12345" />
            </label>
            <label className="block text-sm text-ink-soft sm:col-span-2">
              Correo (opcional)
              <input name="email" type="email" defaultValue={review.reviewer_email} className="input mt-1" />
            </label>
          </div>
          <SubmitButton pendingLabel="Enviando…">Enviar mi revisión</SubmitButton>
          <p className="text-xs text-ink-soft">
            DatosPrivados no verifica la colegiatura ni presta asesoría legal: el abogado responde ante la empresa.
          </p>
        </form>
      )}
    </main>
  );
}
