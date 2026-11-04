import Link from "next/link";
import { redirect } from "next/navigation";
import { DEMO_EMAIL, getSession } from "@/lib/auth";
import { SignupForm } from "@/components/auth-forms";
import { findSectorById } from "@/lib/sectors";

export const metadata = { title: "Crear cuenta" };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; sector?: string }>;
}) {
  const session = await getSession();
  const isDemo = session?.user.email === DEMO_EMAIL;
  if (session && !isDemo) redirect("/app");
  const { plan, sector } = await searchParams;
  const selected = plan === "pro" ? "pro" : "basico";
  const template = sector ? findSectorById(sector) : undefined;

  return (
    <div>
      <p className="label-mono">Acceso · registro de empresa</p>
      <h1 className="mt-3 font-display text-[2.5rem] leading-[1.05] tracking-[-0.03em]">
        Abre tu expediente.
      </h1>
      <p className="mt-2.5 text-[16px] leading-relaxed text-ink-soft">
        Cinco minutos para registrar tu empresa. El resto lo guía la plataforma.
      </p>
      <p className="mt-3 border-l-3 border-line-strong bg-paper-2 px-4 py-2.5 text-sm leading-relaxed text-ink-soft">
        Solo empresas o personas con negocio constituidas en el Perú. El SIPDP exige RUC peruano para
        inscribir bancos de datos. Después de crear la cuenta pagas el primer mes.
      </p>

      {isDemo && (
        <p className="mt-5 border-l-3 border-ochre bg-ochre/[0.08] px-4 py-3 text-[15px] leading-relaxed">
          Estás viendo la demo de Casa Verde. Para crear tu cuenta,{" "}
          <Link href="/demo/salir?to=registro" className="link-underline font-medium text-ink">
            sal de la demo
          </Link>{" "}
          o completa este formulario; la demo se cerrará sola.
        </p>
      )}

      {template && (
        <p className="mt-5 border-l-3 border-sage bg-sage/[0.08] px-4 py-3 text-[15px] leading-relaxed">
          Empiezas con la plantilla <strong>{template.label}</strong>. Después podrás ajustar las listas
          y el rubro.
        </p>
      )}

      <div className="mt-8">
        <SignupForm plan={selected} sector={template?.id} />
      </div>
    </div>
  );
}
