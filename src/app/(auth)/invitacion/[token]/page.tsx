import { notFound } from "next/navigation";
import { acceptInvitationAction } from "@/app/actions/team";
import { getDb, nowIso } from "@/lib/db";
import { findInvitation } from "@/lib/data";
import { Field } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";

export const metadata = { title: "Invitación", robots: { index: false, follow: false } };

const ROLE_TEXT: Record<string, string> = {
  admin: "administrador",
  responsable: "responsable de cumplimiento (puede editar)",
  lector: "lector (solo consulta)",
};

const ERRORS: Record<string, string> = {
  invalida: "Este enlace ya no es válido. Pide uno nuevo a tu administrador.",
  corta: "La contraseña debe tener al menos 8 caracteres.",
  distinta: "Las contraseñas no coinciden.",
  nombre: "Escribe tu nombre.",
  existe: "Ya existe una cuenta con ese correo. Inicia sesión.",
};

export default async function InvitationPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const invitation = findInvitation(token);
  if (!invitation || invitation.accepted_at || invitation.expires_at < nowIso()) notFound();

  const company = getDb().prepare("SELECT name FROM companies WHERE id = ?").get(invitation.company_id) as
    | { name: string }
    | undefined;
  const reset = Boolean(invitation.user_id);

  return (
    <div>
      <p className="label-mono">{reset ? "Restablecer acceso" : "Invitación"}</p>
      <h1 className="mt-3 font-display text-[2.3rem] leading-[1.05] tracking-[-0.03em]">
        {reset ? "Define tu nueva contraseña." : `Únete a ${company?.name ?? "tu equipo"}.`}
      </h1>
      <p className="mt-2.5 text-[16px] leading-relaxed text-ink-soft">
        {reset
          ? `Cuenta: ${invitation.email}.`
          : `Te invitaron con el correo ${invitation.email} como ${ROLE_TEXT[invitation.role] ?? invitation.role}.`}
      </p>

      {error && (
        <p className="mt-5 border-l-3 border-crimson bg-crimson/10 px-4 py-3 text-[15px] text-crimson" role="alert">
          {ERRORS[error] ?? "No se pudo completar. Inténtalo de nuevo."}
        </p>
      )}

      <form action={acceptInvitationAction} className="mt-7 space-y-5">
        <input type="hidden" name="token" value={token} />
        {!reset && (
          <Field label="Tu nombre">
            <input name="name" required minLength={2} className="input" autoComplete="name" />
          </Field>
        )}
        <Field label="Contraseña" hint="Mínimo 8 caracteres.">
          <input name="password" type="password" required minLength={8} className="input" autoComplete="new-password" />
        </Field>
        <Field label="Repite la contraseña">
          <input name="confirm" type="password" required minLength={8} className="input" autoComplete="new-password" />
        </Field>
        <SubmitButton pendingLabel="Entrando…" className="btn btn-primary w-full">
          {reset ? "Guardar y entrar" : "Crear mi acceso"}
        </SubmitButton>
      </form>
    </div>
  );
}
