import { cookies } from "next/headers";
import { requireSession, hasRole } from "@/lib/auth";
import { listPendingInvitations, listUsers } from "@/lib/data";
import { appUrl } from "@/lib/documents";
import { formatDate } from "@/lib/format";
import {
  changeRoleAction,
  inviteMemberAction,
  removeMemberAction,
  resetAccessAction,
  revokeInvitationAction,
} from "@/app/actions/team";
import { CopyButton } from "@/components/copy-button";
import { PageHeader, StatusPill } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { Toast } from "@/components/toast";

export const metadata = { title: "Equipo" };

const ROLES = [
  { id: "admin", label: "Administrador", text: "Todo, incluido el equipo, los datos de la empresa y el plan." },
  { id: "responsable", label: "Responsable", text: "Edita bancos, documentos, solicitudes ARCO, incidentes, herramientas y evidencias." },
  { id: "lector", label: "Lector", text: "Solo consulta. Para tu contador, un auditor o quien necesita ver sin modificar." },
] as const;

const MESSAGES: Record<string, string> = {
  invitado: "Invitación creada. Copia el enlace y envíalo.",
  restablecer: "Enlace de restablecimiento creado. Copia el enlace y envíalo.",
  rol: "Rol actualizado.",
  quitado: "Acceso retirado.",
};

const ERRORS: Record<string, string> = {
  email: "Escribe un correo válido.",
  existe: "Ese correo ya tiene una cuenta en DatosPrivados.",
  ultimo: "Debe quedar al menos un administrador.",
  tu: "No puedes quitar tu propio acceso.",
};

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { company, user } = await requireSession();
  const { ok, error } = await searchParams;
  const isAdmin = hasRole(user.role, "admin");
  const users = listUsers(company.id);
  const invitations = listPendingInvitations(company.id);
  const jar = await cookies();
  const flash = jar.get("pdp_invite")?.value;
  const link = flash ? `${appUrl()}/invitacion/${flash}` : "";

  return (
    <div className="space-y-7">
      <PageHeader
        title="Equipo y permisos"
        description="Quién puede ver y modificar el expediente de cumplimiento de tu empresa. Cada persona entra con su propio usuario, y el historial de actividad registra quién hizo cada cambio."
      />
      {ok && MESSAGES[ok] && <Toast message={MESSAGES[ok]} />}
      {error && ERRORS[error] && (
        <p className="border-l-3 border-crimson bg-crimson/10 px-4 py-3 text-[15px] text-crimson" role="alert">
          {ERRORS[error]}
        </p>
      )}

      {link && (
        <section className="card border-l-3 border-sage p-6">
          <h2 className="font-display text-xl tracking-[-0.02em]">Enlace listo para enviar</h2>
          <p className="mt-1.5 text-[15px] text-ink-soft">
            Vale 7 días y se puede usar una sola vez. Por seguridad, solo se muestra ahora: si lo pierdes, genera otro.
          </p>
          <p className="mt-3 break-all rounded-[3px] border border-line bg-paper-2 px-3 py-2 font-mono text-sm">{link}</p>
          <div className="mt-3">
            <CopyButton text={link} label="Copiar enlace" />
          </div>
        </section>
      )}

      <section className="card p-6">
        <h2 className="font-display text-xl tracking-[-0.02em]">Roles</h2>
        <ul className="mt-3 space-y-1.5 text-[15px]">
          {ROLES.map((role) => (
            <li key={role.id}>
              <strong>{role.label}:</strong> <span className="text-ink-soft">{role.text}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-line px-6 py-4">
          <h2 className="font-display text-xl tracking-[-0.02em]">Integrantes ({users.length})</h2>
        </div>
        <ul className="divide-y divide-line">
          {users.map((member) => (
            <li key={member.id} className="flex flex-col gap-3 px-6 py-4 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <p className="text-base font-medium">
                  {member.name} {member.id === user.id && <span className="text-sm text-ink-soft">(tú)</span>}
                </p>
                <p className="text-sm text-ink-soft">{member.email}</p>
              </div>
              {isAdmin ? (
                <div className="flex flex-wrap items-center gap-2">
                  <form action={changeRoleAction} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={member.id} />
                    <select name="role" defaultValue={member.role} className="input !h-9 !py-1" aria-label="Rol">
                      {ROLES.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    <SubmitButton pendingLabel="…" className="btn btn-ghost btn-sm">
                      Cambiar
                    </SubmitButton>
                  </form>
                  {member.id !== user.id && (
                    <>
                      <form action={resetAccessAction}>
                        <input type="hidden" name="id" value={member.id} />
                        <SubmitButton pendingLabel="…" className="btn btn-ghost btn-sm">
                          Restablecer acceso
                        </SubmitButton>
                      </form>
                      <form action={removeMemberAction}>
                        <input type="hidden" name="id" value={member.id} />
                        <SubmitButton pendingLabel="…" className="btn btn-ghost btn-sm">
                          Quitar
                        </SubmitButton>
                      </form>
                    </>
                  )}
                </div>
              ) : (
                <StatusPill tone="neutral">{ROLES.find((role) => role.id === member.role)?.label ?? "Lector"}</StatusPill>
              )}
            </li>
          ))}
        </ul>
      </section>

      {isAdmin && (
        <>
          {invitations.length > 0 && (
            <section className="card overflow-hidden">
              <div className="border-b border-line px-6 py-4">
                <h2 className="font-display text-xl tracking-[-0.02em]">Invitaciones pendientes</h2>
              </div>
              <ul className="divide-y divide-line">
                {invitations.map((invitation) => (
                  <li key={invitation.id} className="flex flex-wrap items-center gap-3 px-6 py-3.5">
                    <span className="min-w-0 flex-1 text-[15px]">
                      {invitation.email} · {ROLES.find((role) => role.id === invitation.role)?.label}
                      {invitation.user_id ? " · restablecer acceso" : ""}
                      <span className="ml-2 text-sm text-ink-soft">vence {formatDate(invitation.expires_at, "short")}</span>
                    </span>
                    <form action={revokeInvitationAction}>
                      <input type="hidden" name="id" value={invitation.id} />
                      <SubmitButton pendingLabel="…" className="btn btn-ghost btn-sm">
                        Anular
                      </SubmitButton>
                    </form>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="card p-6">
            <h2 className="font-display text-xl tracking-[-0.02em]">Invitar a alguien</h2>
            <p className="mt-1.5 max-w-[68ch] text-[15px] text-ink-soft">
              No enviamos correos: te damos un enlace y se lo mandas por el medio que prefieras. Cada correo puede tener
              una sola cuenta en DatosPrivados.
            </p>
            <form action={inviteMemberAction} className="mt-4 flex flex-wrap items-end gap-3">
              <label className="min-w-[240px] flex-1 text-sm text-ink-soft">
                Correo
                <input name="email" type="email" required className="input mt-1" placeholder="persona@empresa.pe" />
              </label>
              <label className="text-sm text-ink-soft">
                Rol
                <select name="role" defaultValue="responsable" className="input mt-1">
                  {ROLES.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </label>
              <SubmitButton pendingLabel="Creando…">Crear invitación</SubmitButton>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
