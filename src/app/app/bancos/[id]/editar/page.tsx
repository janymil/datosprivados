import Link from "next/link";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getBank } from "@/lib/data";
import { saveBankAction } from "@/app/actions/company";
import { BankForm } from "@/components/bank-form";
import { PageHeader } from "@/components/ui";

export const metadata = { title: "Editar banco de datos" };

export default async function EditBankPage({ params }: { params: Promise<{ id: string }> }) {
  const { company } = await requireSession();
  const { id } = await params;
  const bank = getBank(company.id, id);
  if (!bank) notFound();

  return (
    <div className="max-w-[820px] space-y-7">
      <nav className="font-mono text-[12px] uppercase tracking-[0.1em] text-ink-soft" aria-label="Ruta">
        <Link href="/app/bancos" className="hover:text-ink">
          Bancos de datos
        </Link>
        <span className="mx-2 text-line-strong">/</span>
        <Link href={`/app/bancos/${bank.id}`} className="hover:text-ink">
          {bank.name}
        </Link>
        <span className="mx-2 text-line-strong">/</span>
        <span className="text-ink">Editar</span>
      </nav>

      <PageHeader
        title="Editar banco de datos"
        description="Los cambios afectan la ficha SIPDP y los documentos que generes a partir de ahora."
      />

      <div className="card p-6 md:p-8">
        <BankForm bank={bank} companyPlan={company.plan} action={saveBankAction} />
      </div>
    </div>
  );
}
