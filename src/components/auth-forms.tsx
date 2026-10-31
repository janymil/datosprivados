"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, signupAction, type AuthState } from "@/app/actions/auth";
import { Field } from "@/components/ui";

const initial: AuthState = {};

function ErrorBox({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="border-l-3 border-crimson bg-crimson/[0.05] px-4 py-3 text-[14.5px] leading-snug text-crimson"
    >
      {message}
    </p>
  );
}

export function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initial);

  return (
    <form action={formAction} className="space-y-5">
      <ErrorBox message={state.error} />

      <Field label="Correo electrónico">
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          className="input"
          placeholder="tu@empresa.pe"
        />
      </Field>

      <Field label="Contraseña">
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className="input"
          placeholder="••••••••"
        />
      </Field>

      <button type="submit" disabled={pending} className="btn btn-primary w-full disabled:opacity-60">
        {pending ? "Entrando…" : "Entrar"}
      </button>

      <div className="flex items-center gap-3 pt-1">
        <span className="h-px flex-1 bg-line" />
        <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-ink-soft">o</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      <Link href="/demo" prefetch={false} className="btn btn-ghost w-full">
        Entrar a la demo con datos de ejemplo
      </Link>

      <p className="pt-2 text-[14.5px] text-ink-soft">
        ¿Aún no tienes cuenta?{" "}
        <Link href="/registro" className="link-underline font-medium text-ink">
          Crear una cuenta
        </Link>
      </p>
    </form>
  );
}

export function SignupForm({
  plan,
  term,
  sector,
}: {
  plan: string;
  term?: string;
  sector?: string;
}) {
  const [state, formAction, pending] = useActionState(signupAction, initial);

  return (
    <form action={formAction} className="space-y-5">
      <ErrorBox message={state.error} />
      <input type="hidden" name="plan" value={plan} />
      <input type="hidden" name="term" value={term ?? "monthly"} />
      {sector && <input type="hidden" name="sector" value={sector} />}

      <Field label="Nombre de la empresa" hint="Al verificar tu RUC se reemplaza por la razón social registrada en la SUNAT. Podrás editarla después en «Empresa».">
        <input name="company" required className="input" placeholder="Casa Verde Perú S.A.C." />
      </Field>

      <Field label="RUC" hint="11 dígitos. Lo verificamos con la SUNAT: debe existir y estar ACTIVO. Solo empresas o personas con negocio constituidas en el Perú.">
        <input
          name="ruc"
          required
          inputMode="numeric"
          pattern="\d{11}"
          maxLength={11}
          className="input"
          placeholder="20604567891"
        />
      </Field>

      <Field label="Tu nombre">
        <input name="name" required className="input" placeholder="Lucía Rojas" />
      </Field>

      <Field label="Correo de trabajo">
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          className="input"
          placeholder="tu@empresa.pe"
        />
      </Field>

      <Field label="Contraseña" hint="Mínimo 10 caracteres.">
        <input
          type="password"
          name="password"
          required
          minLength={10}
          autoComplete="new-password"
          className="input"
          placeholder="••••••••"
        />
      </Field>

      <button type="submit" disabled={pending} className="btn btn-primary w-full disabled:opacity-60">
        {pending ? "Creando cuenta…" : `Crear cuenta ${plan === "pro" ? "Pro" : "Básica"}`}
      </button>

      <p className="text-[13.5px] leading-relaxed text-ink-soft">
        Al crear tu cuenta podrás armar tu expediente y elegir el plan que necesites.
      </p>

      <p className="text-[14.5px] text-ink-soft">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="link-underline font-medium text-ink">
          Iniciar sesión
        </Link>
      </p>
    </form>
  );
}
