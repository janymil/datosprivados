"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import { checkRucAction, loginAction, signupAction, type AuthState, type RucLiveCheck } from "@/app/actions/auth";
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

      <p className="text-[14.5px] text-ink-soft">
        <Link href="/olvide" className="link-underline">
          ¿Olvidaste tu contraseña?
        </Link>
      </p>

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

/**
 * RUC con verificación inmediata: al completar los 11 dígitos o salir del campo se
 * consulta la SUNAT y se muestra la razón social y el estado debajo. Al crear la
 * cuenta se verifica de nuevo en el servidor; esto solo adelanta el resultado.
 */
function RucField() {
  const [check, setCheck] = useState<RucLiveCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const lastChecked = useRef("");

  async function verify(value: string) {
    const ruc = value.replace(/\D/g, "");
    if (ruc.length !== 11) {
      lastChecked.current = "";
      setCheck(null);
      return;
    }
    if (ruc === lastChecked.current) return;
    lastChecked.current = ruc;
    setChecking(true);
    try {
      const result = await checkRucAction(ruc);
      // Si el usuario cambió el RUC mientras se consultaba, este resultado ya no vale.
      if (lastChecked.current === ruc) setCheck(result);
    } catch {
      if (lastChecked.current === ruc) setCheck({ ok: false, message: "No pudimos verificar tu RUC ahora. Lo verificamos al crear la cuenta.", retry: true });
    } finally {
      if (lastChecked.current === ruc) setChecking(false);
    }
  }

  return (
    <div>
    <Field label="RUC" hint="11 dígitos. Al completarlo lo consultamos en la SUNAT: debe existir y estar ACTIVO. Solo empresas o personas con negocio constituidas en el Perú.">
      <input
        name="ruc"
        required
        inputMode="numeric"
        pattern="\d{11}"
        maxLength={11}
        className="input"
        placeholder="20604567891"
        onChange={(e) => {
          if (e.currentTarget.value.replace(/\D/g, "").length === 11) void verify(e.currentTarget.value);
          else if (check || lastChecked.current) {
            lastChecked.current = "";
            setCheck(null);
          }
        }}
        onBlur={(e) => void verify(e.currentTarget.value)}
      />
    </Field>
      {/* Fuera de Field: con un solo control hijo, Field asocia etiqueta y ayuda al input. */}
      <p id="ruc-check" aria-live="polite" className="mt-1.5 min-h-[1.25rem] text-[14px] leading-snug">
        {checking ? (
          <span className="text-ink-soft">Consultando la SUNAT…</span>
        ) : check?.ok ? (
          <span className="text-sage">
            ✓ {check.razonSocial} — {check.estado}
            {check.condicion ? ` · ${check.condicion}` : ""}
          </span>
        ) : check ? (
          <span className={check.retry ? "text-ink-soft" : "text-crimson"}>{check.message}</span>
        ) : null}
      </p>
    </div>
  );
}

export function SignupForm({
  plan,
  sector,
}: {
  plan: string;
  sector?: string;
}) {
  const [state, formAction, pending] = useActionState(signupAction, initial);

  return (
    <form action={formAction} className="space-y-5">
      <ErrorBox message={state.error} />
      <input type="hidden" name="plan" value={plan} />
      {sector && <input type="hidden" name="sector" value={sector} />}

      <Field label="Nombre de la empresa" hint="Al verificar tu RUC se reemplaza por la razón social registrada en la SUNAT. Podrás editarla después en «Empresa».">
        <input name="company" required className="input" placeholder="Casa Verde Perú S.A.C." />
      </Field>

      <RucField />

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

      <label className="flex items-start gap-3 text-[14.5px] leading-relaxed text-ink-soft">
        <input type="checkbox" name="accept_legal" required className="mt-1 h-4 w-4 shrink-0" />
        <span>
          Acepto los{" "}
          <a href="/terminos" target="_blank" rel="noopener" className="link-underline font-medium text-ink">
            Términos y condiciones
          </a>{" "}
          y la{" "}
          <a href="/privacidad" target="_blank" rel="noopener" className="link-underline font-medium text-ink">
            Política de privacidad
          </a>
          .
        </span>
      </label>

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
