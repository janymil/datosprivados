import Link from "next/link";
import { verifyEmailAction } from "@/app/actions/account";

export const metadata = { title: "Confirmar correo", robots: { index: false } };

/** El token se consume al pulsar el botón (POST), no al abrir el enlace: los antivirus que abren enlaces no lo gastan. */
export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; cambio?: string; error?: string }>;
}) {
  const { token, cambio, error } = await searchParams;
  return (
    <div>
      <p className="label-mono">Cuenta</p>
      <h1 className="mt-3 font-display text-[2.5rem] leading-[1.05] tracking-[-0.03em]">
        {cambio === "1" ? "Confirma tu correo nuevo." : "Confirma tu correo."}
      </h1>
      {error || !token ? (
        <p className="mt-6 text-[15px] leading-relaxed text-ink-soft">
          El enlace no es válido o ya venció. Inicia sesión y pide uno nuevo desde Ajustes.{" "}
          <Link href="/login" className="link-underline font-medium text-ink">
            Entrar
          </Link>
        </p>
      ) : (
        <form action={verifyEmailAction} className="mt-8">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="cambio" value={cambio === "1" ? "1" : "0"} />
          <button type="submit" className="btn btn-primary">
            Confirmar
          </button>
        </form>
      )}
    </div>
  );
}
