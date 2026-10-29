import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SignupForm } from "@/components/auth-forms";

export const metadata = { title: "Crear cuenta" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const session = await getSession();
  if (session) redirect("/app");
  const { plan } = await searchParams;
  const selected = plan === "pro" ? "pro" : "basico";

  return (
    <div>
      <p className="label-mono">14 días gratis · sin tarjeta</p>
      <h1 className="mt-3 font-display text-[2.2rem] leading-[1.05] tracking-[-0.03em]">
        Abre tu expediente.
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">
        Cinco minutos para registrar tu empresa. El resto lo guía la plataforma.
      </p>

      <div className="mt-8">
        <SignupForm plan={selected} />
      </div>
    </div>
  );
}
