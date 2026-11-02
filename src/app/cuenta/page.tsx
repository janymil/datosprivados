import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { isCompanyActive } from "@/lib/billing";
import { isDemoCompany } from "@/lib/demo";
import { formatDate } from "@/lib/format";
import { LAPSED_RETENTION_DAYS } from "@/lib/jobs";
import { DeleteAccountForm } from "@/components/account-forms";

export const metadata = { title: "Mi cuenta y mis datos" };

/**
 * Disponible aunque la suscripción haya vencido: descargar tus datos y eliminarlos
 * no depende de estar al día en el pago.
 */
export default async function AccountPage() {
  const { company } = await requireSession();
  const demo = isDemoCompany(company);
  const active = isCompanyActive(company);
  const deleteOn =
    !active && company.paid_until
      ? new Date(new Date(company.paid_until).getTime() + LAPSED_RETENTION_DAYS() * 86_400_000).toISOString()
      : null;

  return (
    <div className="space-y-7">
      <div>
        <p className="label-mono">Cuenta</p>
        <h1 className="mt-2 font-display text-[2.2rem] leading-tight tracking-[-0.03em]">Mis datos</h1>
        <p className="mt-2 max-w-[62ch] text-base leading-relaxed text-ink-soft">
          {active ? (
            <Link href="/app/ajustes" className="link-underline">← Volver a Ajustes</Link>
          ) : (
            <>
              Tu suscripción no está activa.{" "}
              <Link href="/pago" className="link-underline font-medium text-ink">Reactivar mi plan</Link>
            </>
          )}
        </p>
      </div>

      {deleteOn && (
        <p className="border-l-3 border-ochre bg-ochre/[0.08] px-4 py-3 text-[15px] leading-relaxed">
          Si no reactivas tu plan, eliminaremos tus datos el <strong>{formatDate(deleteOn)}</strong>. Tu Política de
          Privacidad y tu formulario ARCO publicados siguen visibles hasta entonces, pero no podrás gestionar las
          solicitudes que lleguen.
        </p>
      )}

      <section className="card p-6 md:p-7">
        <h2 className="font-display text-2xl tracking-[-0.02em]">Descargar todo</h2>
        <p className="mt-2 max-w-[62ch] text-[15.5px] leading-relaxed text-ink-soft">
          Un archivo JSON con tu empresa, bancos de datos, solicitudes ARCO, incidentes, documentos con todas sus
          versiones, herramientas, evidencias, actividad y pagos. Si lo quieres para leer o entregar, baja el ZIP: trae
          lo mismo más los documentos en texto y las tablas en CSV.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {demo ? (
            <p className="text-sm text-ink-soft">La exportación no está disponible en la cuenta de demostración.</p>
          ) : (
            <>
              <a href="/cuenta/exportar/zip" className="btn btn-primary btn-sm">
                Descargar expediente (.zip)
              </a>
              <a href="/cuenta/exportar" className="btn btn-ghost btn-sm">
                Descargar datos (.json)
              </a>
            </>
          )}
        </div>
      </section>

      {!demo && (
        <section className="card border-crimson/30 p-6 md:p-7">
          <h2 className="font-display text-2xl tracking-[-0.02em]">Eliminar mi cuenta</h2>
          <p className="mt-2 max-w-[62ch] text-[15.5px] leading-relaxed text-ink-soft">
            Cancelamos tu suscripción y borramos tus datos: bancos, solicitudes ARCO (incluidos los datos de quienes las
            enviaron), incidentes, documentos y usuarios. Solo conservamos los registros de pago, porque la ley
            tributaria nos obliga. <strong>No se puede deshacer.</strong> Descarga tus datos antes.
          </p>
          <div className="mt-5 max-w-[420px]">
            <DeleteAccountForm />
          </div>
        </section>
      )}
    </div>
  );
}
