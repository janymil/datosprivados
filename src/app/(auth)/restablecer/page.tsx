import Link from "next/link";
import { ResetPasswordForm } from "@/components/account-forms";

export const metadata = { title: "Nueva contraseña", robots: { index: false } };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div>
      <p className="label-mono">Acceso</p>
      <h1 className="mt-3 font-display text-[2.5rem] leading-[1.05] tracking-[-0.03em]">Elige una contraseña nueva.</h1>
      <div className="mt-8">
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="text-[15px] text-ink-soft">
            El enlace no es válido.{" "}
            <Link href="/olvide" className="link-underline font-medium text-ink">
              Pide uno nuevo
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
