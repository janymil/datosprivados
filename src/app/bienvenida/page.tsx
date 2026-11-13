import { listProviders } from "@/lib/data";
import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { isCompanyActive } from "@/lib/billing";
import { Logo } from "@/components/icons";
import { OnboardingWizard } from "@/components/onboarding-wizard";

export const metadata = { title: "Configura tu cuenta" };

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ rehacer?: string }>;
}) {
  const { company, user } = await requireSession();
  if (!isCompanyActive(company)) redirect("/pago");
  const { rehacer } = await searchParams;
  if (company.onboarded_at && !rehacer) redirect("/app");

  return (
    <div className="min-h-screen bg-paper">
      <header className="flex items-center justify-between border-b border-line bg-paper-2 px-5 py-4 md:px-8">
        <Logo />
        {company.onboarded_at && (
          <Link href="/app" className="font-mono text-xs uppercase tracking-[0.1em] text-ink-soft hover:text-crimson">
            Volver al panel
          </Link>
        )}
      </header>
      <main id="contenido" tabIndex={-1} className="mx-auto w-full max-w-[720px] px-5 py-10 md:py-14">
        <p className="label-mono">Bienvenida · 3 minutos</p>
        <div className="mt-5">
          <OnboardingWizard
            companyName={company.name}
            initial={{
              sector: company.sector,
              address: company.address,
              phone: company.phone,
              dpoName: company.dpo_name || user.name,
              dpoEmail: company.dpo_email || company.email,
              website: company.website,
              salesBand: company.sales_band,
              complaintsUrl: company.complaints_url,
            }}
            initialTools={listProviders(company.id).map((provider) => ({
              category: provider.category,
              name: provider.name,
              country: provider.country,
              custom: Boolean(provider.is_custom),
            }))}
          />
        </div>
      </main>
    </div>
  );
}
