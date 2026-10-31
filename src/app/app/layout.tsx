import Link from "next/link";
import { redirect } from "next/navigation";
import { DEMO_EMAIL, requireSession } from "@/lib/auth";
import { isCompanyActive } from "@/lib/billing";
import { getStats, listBanks, listDocuments, listIncidents, listRequests, listProviders, listEvidence } from "@/lib/data";
import { computeCompliance } from "@/lib/compliance";
import { logoutAction } from "@/app/actions/auth";
import { AppNav } from "@/components/app-nav";
import { AiChatAssistant } from "@/components/ai-chat-assistant";
import { aiMode } from "@/lib/ai";
import { Logo } from "@/components/icons";
import { companyShortId } from "@/lib/documents";

export const metadata = {
  title: "Panel",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { company, user } = await requireSession();
  if (!isCompanyActive(company)) redirect("/pago");
  const isDemo = user.email === DEMO_EMAIL;
  const stats = getStats(company.id);
  const compliance = computeCompliance({
    company,
    banks: listBanks(company.id),
    requests: listRequests(company.id),
    incidents: listIncidents(company.id),
    documents: listDocuments(company.id),
    providers: listProviders(company.id),
    evidence: listEvidence(company.id),
  });

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[276px_1fr] print:block">
      <aside className="no-print hidden border-r border-line bg-paper-2 lg:flex lg:min-h-screen lg:flex-col lg:sticky lg:top-0 lg:h-screen">
        <div className="px-5 pb-5 pt-6">
          <Link href="/" aria-label="DatosPrivados, inicio">
            <Logo />
          </Link>

          <div className="mt-6 border border-line bg-paper px-3.5 py-3.5">
            <p className="truncate font-display text-lg leading-tight">{company.name}</p>
            <div className="mt-1.5 flex items-center justify-between gap-2">
              <p className="font-mono text-xs uppercase tracking-[0.08em] text-ink-soft">
                {companyShortId(company)}
              </p>
              <span className="border border-line-strong px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-ink-soft">
                {company.plan}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col px-2.5">
          <AppNav badges={{ arco: stats.openRequests, incidents: stats.incidentsOpen }} />
        </div>

        <div className="border-t border-line px-5 py-4">
          <Link
            href={`/solicitud/${company.slug}`}
            className="flex items-center justify-between gap-2 font-mono text-xs font-medium uppercase tracking-[0.08em] text-ink-soft hover:text-crimson"
          >
            Página pública ARCO
            <span aria-hidden="true">↗</span>
          </Link>
          <div className="mt-4 flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink font-mono text-xs font-semibold text-paper">
              {user.name
                .split(" ")
                .slice(0, 2)
                .map((part) => part[0])
                .join("")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium leading-tight">{user.name}</p>
              <p className="truncate text-xs text-ink-soft">{user.email}</p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-ink-soft hover:text-crimson"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="no-print flex items-center justify-between border-b border-line bg-paper-2 px-4 py-3.5 lg:hidden">
          <Link href="/app" aria-label="DatosPrivados, panel">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-ink-soft">
              {company.plan}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="font-mono text-xs font-medium uppercase tracking-[0.08em] text-ink-soft hover:text-crimson"
              >
                Salir
              </button>
            </form>
          </div>
        </header>

        <div className="no-print lg:hidden">
          <AppNav variant="mobile" badges={{ arco: stats.openRequests, incidents: stats.incidentsOpen }} />
        </div>

        <main className="flex-1 px-4 pb-28 pt-7 md:px-8 lg:px-10 lg:pb-24 lg:pt-10 print:p-0">
          <div className="mx-auto w-full max-w-[1100px]">
            {isDemo && (
              <div className="no-print mb-6 flex flex-col gap-2 border-l-3 border-ochre bg-ochre/[0.08] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                <p>
                  <strong>Estás en la demo de Casa Verde.</strong> Los datos son de ejemplo.
                </p>
                <div className="flex flex-wrap items-center gap-4 font-mono text-xs uppercase tracking-[0.08em]">
                  <Link href="/demo/salir?to=registro" className="font-semibold text-crimson hover:underline">
                    Crear mi cuenta
                  </Link>
                  <Link href="/demo/salir" className="text-ink-soft hover:text-ink">
                    Salir de la demo
                  </Link>
                </div>
              </div>
            )}
            {!isDemo && user.role !== "admin" && user.role !== "responsable" && (
              <p className="no-print mb-6 border-l-3 border-ink bg-ink/[0.04] px-4 py-3 text-sm">
                <strong>Acceso de solo lectura.</strong> Puedes consultar todo, pero no modificar. Pide a un administrador
                que cambie tu rol si necesitas editar.
              </p>
            )}
            {children}
          </div>
        </main>

        <footer className="no-print border-t border-line px-4 pb-24 pt-4 md:px-8 lg:px-10 lg:pb-4">
          <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-2 text-xs text-ink-soft sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono uppercase tracking-[0.08em]">
              DatosPrivados · Herramienta de gestión — no reemplaza asesoría legal
            </p>
            <p>Ley 29733 · DS 016-2024-JUS</p>
          </div>
        </footer>

        <AiChatAssistant
          companyName={company.name}
          companyRuc={company.ruc}
          companyPlan={company.plan}
          complianceScore={compliance.score}
          mode={aiMode()}
        />
      </div>
    </div>
  );
}
