import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { saveBankAction } from "@/app/actions/company";
import { BankForm } from "@/components/bank-form";
import { PageHeader } from "@/components/ui";
import { Term } from "@/components/help";

export const metadata = { title: "Nuevo banco de datos" };

export default async function NewBankPage() {
  const { company } = await requireSession();

  return (
    <div className="max-w-[820px] space-y-7">
      <nav className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-soft" aria-label="Ruta">
        <Link href="/app/bancos" className="hover:text-ink">
          Bancos de datos
        </Link>
        <span className="mx-2 text-line-strong">/</span>
        <span className="text-ink">Nuevo</span>
      </nav>

      <PageHeader
        title={
          <>
            Declara un <Term k="banco">banco de datos</Term>
          </>
        }
        description={
          <>
            Elige una plantilla y ajusta lo que no aplique. Después te damos la ficha lista para el <Term k="sipdp">SIPDP</Term>.
          </>
        }
      />

      <div className="card p-6 md:p-8">
        <BankForm companyPlan={company.plan} action={saveBankAction} />
      </div>
    </div>
  );
}
