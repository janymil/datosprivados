import Link from "next/link";
import { ForgotPasswordForm } from "@/components/account-forms";

export const metadata = { title: "Recuperar contraseña" };

export default function ForgotPasswordPage() {
  return (
    <div>
      <p className="label-mono">Acceso</p>
      <h1 className="mt-3 font-display text-[2.5rem] leading-[1.05] tracking-[-0.03em]">Recupera tu contraseña.</h1>
      <p className="mt-2.5 text-[16px] leading-relaxed text-ink-soft">
        Escribe el correo de tu cuenta y te enviamos un enlace para elegir una nueva.
      </p>
      <div className="mt-8">
        <ForgotPasswordForm />
      </div>
      <p className="mt-8 border-t border-line pt-5 text-[14.5px] text-ink-soft">
        <Link href="/login" className="link-underline font-medium text-ink">
          Volver a entrar
        </Link>
      </p>
    </div>
  );
}
