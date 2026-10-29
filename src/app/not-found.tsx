import Link from "next/link";
import { Logo } from "@/components/icons";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="container-page flex h-16 items-center">
          <Link href="/" aria-label="PrivadoPE">
            <Logo />
          </Link>
        </div>
      </header>
      <div className="container-page flex flex-1 flex-col justify-center py-16">
        <p className="label-mono">Error 404</p>
        <h1 className="mt-3 max-w-[16ch] font-display text-[2.6rem] leading-[1.02] tracking-[-0.03em]">
          Esta página no está en el expediente.
        </h1>
        <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-ink-soft">
          Puede que el enlace haya cambiado o que la empresa aún no haya publicado su política de
          privacidad.
        </p>
        <div className="mt-7 flex flex-wrap gap-2">
          <Link href="/" className="btn btn-primary">
            Volver al inicio
          </Link>
          <Link href="/demo" className="btn btn-ghost">
            Abrir la demo
          </Link>
        </div>
      </div>
    </main>
  );
}
