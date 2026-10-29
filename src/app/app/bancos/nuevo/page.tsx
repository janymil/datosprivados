import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { saveBankAction } from "@/app/actions/company";
import { BankForm } from "@/components/bank-form";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Nuevo banco de datos" };

export default async function NewBankPage() {
  await requireSession();

  return (
    <div className="max-w-[760px] space-y-7">
      <nav className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft" aria-label="Ruta">
        <Link href="/app/bancos" className="hover:text-ink">
          Bancos de datos
        </Link>
        <span className="mx-2 text-line-strong">/</span>
        <span className="text-ink">Nuevo</span>
      </nav>

      <PageHeader
        eyebrow="Paso 1 de 2"
        title="Declara un banco de datos"
        description="No necesitas el lenguaje legal exacto: describe con claridad qué datos tienes y para qué los usas. Luego podrás generar la ficha para el SIPDP."
      />

      <div className="card p-6 md:p-8">
        <BankForm action={saveBankAction} />
      </div>
    </div>
  );
}
