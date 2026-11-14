import Link from "next/link";
import { notFound } from "next/navigation";
import { DiffView } from "@/components/diff-view";
import { DocBody } from "@/components/doc-body";
import { OperatorNav } from "@/components/operator-nav";
import { SubmitButton } from "@/components/submit-button";
import { formatDateTime } from "@/lib/format";
import { getLegalChange } from "@/lib/legal-changes";
import { requireOperator } from "@/lib/operator";
import { approveLegalChangeAction, lawyerLegalChangeAction, rejectLegalChangeAction } from "../actions";
import { STATUS_LABEL } from "../labels";

export const metadata = { title: "Cambio legal", robots: { index: false } };
export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = { clause: "Cláusulas", fact: "Hechos legales", module: "Ayuda, guías y prompt", page: "Páginas y código" };

const MESSAGE: Record<string, string> = {
  aprobado: "Aprobado. GitHub está corriendo las pruebas; si pasan, se fusiona y el servidor lo publica.",
  rechazado: "Rechazado.",
  abogado: "Enviado a la lista del abogado.",
};
const ERROR: Record<string, string> = {
  "ya-decidido": "Este cambio ya estaba decidido.",
  "motivo-requerido": "Escribe el motivo.",
  "no-existe": "El cambio no existe.",
  envio: "No se pudo enviar a GitHub. El motivo está abajo; puedes volver a aprobar.",
};

export default async function LegalChangePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireOperator();
  const { id } = await params;
  const { ok, error } = await searchParams;
  const change = getLegalChange(id);
  if (!change) notFound();

  const affected = JSON.parse(change.affected) as Array<{ kind: string; source: string }>;
  const groups = Object.entries(
    affected.reduce<Record<string, string[]>>((acc, a) => ((acc[a.kind] ??= []).push(a.source), acc), {})
  );
  const canDecide = change.status === "nuevo";
  const canRetry = change.status === "fallo";
  const afterLawyer = change.status === "abogado";
  const repo = process.env.GITHUB_REPOSITORY || "janymil/datosprivados";

  return (
    <main id="contenido" tabIndex={-1} className="mx-auto max-w-4xl space-y-8 px-4 py-10">
      <header>
        <OperatorNav current="legal" />
        <p className="mt-4 text-sm">
          <Link href="/operador/legal" className="text-ink-soft hover:text-ink">
            ← Cambios legales
          </Link>
        </p>
        <h1 className="mt-2 font-display text-3xl tracking-[-0.02em]">{change.title}</h1>
        <p className="mt-2 font-mono text-xs uppercase tracking-[0.08em] text-ink-soft">
          {change.kind === "norma" ? "cambio de norma" : "auditoría"} · {change.id} · {STATUS_LABEL[change.status]}
        </p>
      </header>

      {ok && MESSAGE[ok] && <p className="border-l-3 border-sage bg-sage/[0.08] px-4 py-3 text-sm">{MESSAGE[ok]}</p>}
      {error && <p className="border-l-3 border-crimson bg-crimson/[0.06] px-4 py-3 text-sm">{ERROR[error] ?? "No se pudo completar."}</p>}

      <section className="card p-6">
        <h2 className="font-display text-2xl">Qué cambia y por qué</h2>
        <div className="mt-3">
          <DocBody content={change.summary} />
        </div>
        {change.source_url && (
          <p className="mt-3 text-sm">
            Fuente:{" "}
            <a href={change.source_url} className="underline" rel="noreferrer" target="_blank">
              {change.source_url}
            </a>
          </p>
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl">Qué afecta ({affected.length})</h2>
        {groups.length === 0 ? (
          <p className="mt-2 text-sm text-ink-soft">El cambio no declaró textos afectados.</p>
        ) : (
          <dl className="mt-3 space-y-3">
            {groups.map(([kind, sources]) => (
              <div key={kind}>
                <dt className="text-sm font-medium">{KIND_LABEL[kind] ?? kind}</dt>
                <dd className="mt-1 font-mono text-xs leading-relaxed text-ink-soft break-all">{sources.join(" · ")}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>

      <section>
        <h2 className="font-display text-2xl">Diferencia exacta</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Rama <span className="font-mono">{change.branch}</span> en el commit{" "}
          <span className="font-mono">{change.head_sha.slice(0, 7)}</span>. Si la rama cambia después de aprobar, GitHub
          no la publica.
        </p>
        <div className="mt-4">
          <DiffView diff={change.diff} />
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-display text-2xl">Historial</h2>
        <ul className="mt-3 space-y-1 text-sm">
          <li>Propuesto: {formatDateTime(change.created_at)}</li>
          {change.decided_at && (
            <li>
              Decidido: {formatDateTime(change.decided_at)} por {change.decided_by}
              {change.reason ? ` — «${change.reason}»` : ""}
            </li>
          )}
          {change.dispatched_at && <li>Enviado a GitHub: {formatDateTime(change.dispatched_at)}</li>}
          {change.merged_sha && (
            <li>
              Fusionado:{" "}
              <a className="font-mono underline" href={`https://github.com/${repo}/commit/${change.merged_sha}`} rel="noreferrer" target="_blank">
                {change.merged_sha.slice(0, 7)}
              </a>
            </li>
          )}
          {change.deployed_at && <li>Publicado en el sitio: {formatDateTime(change.deployed_at)}</li>}
          {change.error && <li className="text-crimson">Problema: {change.error}</li>}
        </ul>
      </section>

      {(canDecide || canRetry || afterLawyer) && (
        <section className="space-y-6">
          <form action={approveLegalChangeAction} className="card p-6">
            <input type="hidden" name="id" value={change.id} />
            <h2 className="font-display text-2xl">{canRetry ? "Volver a aprobar" : "Aprobar"}</h2>
            <p className="mt-2 text-sm text-ink-soft">
              GitHub comprueba que la rama siga en este commit, corre todas las pruebas y lo fusiona solo si pasan. Luego
              el servidor lo publica y avisa a tus clientes que sus documentos cambiaron.
            </p>
            <SubmitButton pendingLabel="Enviando…" className="btn btn-primary mt-4">
              Aprobar y publicar
            </SubmitButton>
          </form>

          <div className="grid gap-6 sm:grid-cols-2">
              <form action={rejectLegalChangeAction} className="card p-6">
                <input type="hidden" name="id" value={change.id} />
                <h2 className="font-display text-xl">Rechazar</h2>
                <label className="mt-3 block text-sm">
                  Motivo
                  <textarea name="reason" required minLength={3} rows={3} className="input mt-1 block w-full" />
                </label>
                <SubmitButton pendingLabel="Guardando…" className="btn btn-ghost btn-sm mt-3">
                  Rechazar
                </SubmitButton>
              </form>
              {canDecide && (
              <form action={lawyerLegalChangeAction} className="card p-6">
                <input type="hidden" name="id" value={change.id} />
                <h2 className="font-display text-xl">Enviar al abogado</h2>
                <label className="mt-3 block text-sm">
                  Qué debe revisar
                  <textarea name="reason" required minLength={3} rows={3} className="input mt-1 block w-full" />
                </label>
                <SubmitButton pendingLabel="Guardando…" className="btn btn-ghost btn-sm mt-3">
                  Enviar al abogado
                </SubmitButton>
              </form>
              )}
            </div>
        </section>
      )}
    </main>
  );
}
