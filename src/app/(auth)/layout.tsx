import Link from "next/link";
import { Logo } from "@/components/icons";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[0.92fr_1.08fr]">
      <aside className="relative hidden overflow-hidden bg-ink px-10 py-10 text-paper lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute inset-0 opacity-[0.13] dot-field" />
        <Link href="/" className="relative inline-flex w-fit" aria-label="PrivadoPE, inicio">
          <span className="inline-flex items-baseline">
            <span className="font-display text-[1.6rem] leading-none tracking-[-0.03em] text-paper">
              Privado
            </span>
            <span className="font-display text-[1.6rem] italic leading-none tracking-[-0.05em] text-[#e2574c]">
              PE
            </span>
            <span className="mb-[4px] ml-[3px] inline-block h-[6px] w-[6px] rounded-full bg-[#e2574c]" />
          </span>
        </Link>

        <div className="relative max-w-[38ch]">
          <p className="font-mono text-[12px] uppercase tracking-[0.18em] text-paper/50">
            Expediente de cumplimiento
          </p>
          <p className="mt-6 font-display text-[2.6rem] leading-[1.06] tracking-[-0.03em]">
            La diferencia entre tener datos y tener <em className="text-[#e2574c]">un problema</em> es
            saber dónde están.
          </p>
          <div className="mt-8 space-y-3.5 border-t border-paper/15 pt-6">
            {[
              "Inventario de bancos de datos",
              "Plazos ARCO de 20 días hábiles",
              "Incidentes con reloj de 48 horas",
            ].map((item) => (
              <p key={item} className="flex items-center gap-3 text-[15.5px] text-paper/80">
                <span className="h-px w-5 bg-[#e2574c]" />
                {item}
              </p>
            ))}
          </div>
        </div>

        <p className="relative font-mono text-[12px] uppercase tracking-[0.12em] text-paper/45">
          Lima, Perú · Ley 29733
        </p>
      </aside>

      <main className="flex min-h-screen flex-col">
        <div className="flex items-center justify-between border-b border-line px-5 py-4 lg:hidden">
          <Link href="/" aria-label="PrivadoPE, inicio">
            <Logo />
          </Link>
          <Link href="/" className="font-mono text-[12.5px] uppercase tracking-[0.1em] text-ink-soft">
            Volver
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 py-10">
          <div className="w-full max-w-[460px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
