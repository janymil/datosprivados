import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/auth-forms";

export const metadata = { title: "Entrar" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/app");

  return (
    <div>
      <p className="label-mono">Acceso</p>
      <h1 className="mt-3 font-display text-[2.2rem] leading-[1.05] tracking-[-0.03em]">
        Entra a tu expediente.
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Gestiona tus bancos de datos, solicitudes y documentos desde un solo lugar.
      </p>

      <div className="mt-8">
        <LoginForm />
      </div>

      <div className="mt-8 border-t border-line pt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft">Cuenta de prueba</p>
        <p className="mt-1 text-[12.5px] text-ink-soft">
          demo@privadope.pe · demo1234 —{" "}
          <Link href="/demo" className="link-underline text-ink">
            abrir sin contraseña
          </Link>
        </p>
      </div>
    </div>
  );
}
