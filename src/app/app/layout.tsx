import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { getStats } from "@/lib/data";
import { logoutAction } from "@/app/actions/auth";
import { AppNav } from "@/components/app-nav";
import { Logo } from "@/components/icons";

export const metadata = {
  title: "Panel",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { company, user } = await requireSession();
  const stats = getStats(company.id);

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[266px_1fr] print:block">
      <aside className="no-print hidden border-r border-line bg-paper-2 lg:flex lg:min-h-screen lg:flex-col lg:sticky lg:top-0 lg:h-screen">
        <div className="px-5 pb-5 pt-6">
          <Link href="/" aria-label="PrivadoPE, inicio">
            <Logo />
          </Link>

          <div className="mt-6 border border-line bg-paper px-3 py-3">
            <p className="truncate font-display text-[15px] leading-tight">{company.name}</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-soft">
                RUC {company.ruc}
              </p>
              <span className="border border-line-strong px-1.5 py-[1px] font-mono text-[8px] uppercase tracking-[0.12em] text-ink-soft">
                {company.plan}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-1 flex-col px-2">
          <AppNav badges={{ arco: stats.openRequests, incidents: stats.incidentsOpen }} />
        </div>

        <div className="border-t border-line px-5 py-4">
          <Link
            href={`/solicitud/${company.slug}`}
            className="flex items-center justify-between gap-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft hover:text-crimson"
          >
            Página pública ARCO
            <span aria-hidden="true">↗</span>
          </Link>
          <div className="mt-4 flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink font-mono text-[10px] text-paper">
              {user.name
                .split(" ")
                .slice(0, 2)
                .map((part) => part[0])
                .join("")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium leading-tight">{user.name}</p>
              <p className="truncate text-[10px] text-ink-soft">{user.email}</p>
            </div>
            <form action={logoutAction}>
              <button
                type="submit"
                className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-soft hover:text-crimson"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        <header className="no-print flex items-center justify-between border-b border-line bg-paper-2 px-4 py-3 lg:hidden">
          <Link href="/app" aria-label="PrivadoPE, panel">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[9px] uppercase tracking-[0.1em] text-ink-soft">
              {company.plan}
            </span>
            <form action={logoutAction}>
              <button
                type="submit"
                className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink-soft hover:text-crimson"
              >
                Salir
              </button>
            </form>
          </div>
        </header>

        <div className="no-print lg:hidden">
          <AppNav variant="mobile" badges={{ arco: stats.openRequests, incidents: stats.incidentsOpen }} />
        </div>

        <main className="flex-1 px-4 pb-16 pt-7 md:px-8 lg:px-10 lg:pt-10 print:p-0">
          <div className="mx-auto w-full max-w-[1080px]">{children}</div>
        </main>

        <footer className="no-print border-t border-line px-4 py-4 md:px-8 lg:px-10">
          <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-2 text-[10px] text-ink-soft sm:flex-row sm:items-center sm:justify-between">
            <p className="font-mono uppercase tracking-[0.1em]">
              PrivadoPE · MVP · los documentos son borradores
            </p>
            <p>Ley 29733 · DS 016-2024-JUS</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
