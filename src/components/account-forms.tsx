"use client";

import { useActionState, type ReactNode } from "react";
import {
  changePasswordAction,
  deleteAccountAction,
  requestEmailChangeAction,
  requestPasswordResetAction,
  resetPasswordAction,
  type AccountState,
} from "@/app/actions/account";
import { Field } from "@/components/ui";

const initial: AccountState = {};

function Messages({ state }: { state: AccountState }) {
  return (
    <>
      {state.error && (
        <p role="alert" className="border-l-3 border-crimson bg-crimson/[0.05] px-4 py-3 text-[14.5px] leading-snug text-crimson">
          {state.error}
        </p>
      )}
      {state.ok && (
        <p role="status" className="border-l-3 border-sage bg-sage/[0.08] px-4 py-3 text-[14.5px] leading-snug">
          {state.ok}
        </p>
      )}
    </>
  );
}

function AccountForm({
  action,
  submit,
  pendingLabel,
  danger,
  children,
}: {
  action: (prev: AccountState, formData: FormData) => Promise<AccountState>;
  submit: string;
  pendingLabel: string;
  danger?: boolean;
  children: ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction} className="space-y-4">
      <Messages state={state} />
      {children}
      <button
        type="submit"
        disabled={pending}
        className={`btn btn-sm ${danger ? "btn-ghost text-crimson" : "btn-primary"} disabled:opacity-60`}
      >
        {pending ? pendingLabel : submit}
      </button>
    </form>
  );
}

export function ForgotPasswordForm() {
  return (
    <AccountForm action={requestPasswordResetAction} submit="Enviarme el enlace" pendingLabel="Enviando…">
      <Field label="Correo electrónico">
        <input type="email" name="email" autoComplete="email" required className="input" placeholder="tu@empresa.pe" />
      </Field>
    </AccountForm>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  return (
    <AccountForm action={resetPasswordAction} submit="Guardar contraseña" pendingLabel="Guardando…">
      <input type="hidden" name="token" value={token} />
      <Field label="Contraseña nueva" hint="Al menos 10 caracteres.">
        <input type="password" name="password" autoComplete="new-password" required minLength={10} className="input" />
      </Field>
    </AccountForm>
  );
}

export function ChangePasswordForm() {
  return (
    <AccountForm action={changePasswordAction} submit="Cambiar contraseña" pendingLabel="Guardando…">
      <Field label="Contraseña actual">
        <input type="password" name="current" autoComplete="current-password" required className="input" />
      </Field>
      <Field label="Contraseña nueva" hint="Al menos 10 caracteres. Cerramos tus otras sesiones.">
        <input type="password" name="next" autoComplete="new-password" required minLength={10} className="input" />
      </Field>
    </AccountForm>
  );
}

export function ChangeEmailForm() {
  return (
    <AccountForm action={requestEmailChangeAction} submit="Enviar enlace de confirmación" pendingLabel="Enviando…">
      <Field label="Correo nuevo">
        <input type="email" name="email" autoComplete="email" required className="input" />
      </Field>
      <Field label="Tu contraseña">
        <input type="password" name="password" autoComplete="current-password" required className="input" />
      </Field>
    </AccountForm>
  );
}

export function DeleteAccountForm() {
  return (
    <AccountForm action={deleteAccountAction} submit="Eliminar mi cuenta y mis datos" pendingLabel="Eliminando…" danger>
      <Field label="Tu contraseña">
        <input type="password" name="password" autoComplete="current-password" required className="input" />
      </Field>
      <Field label="Escribe ELIMINAR para confirmar">
        <input name="confirm" required autoComplete="off" className="input" placeholder="ELIMINAR" />
      </Field>
    </AccountForm>
  );
}
