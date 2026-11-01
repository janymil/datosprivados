import Link from "next/link";
import { Logo } from "@/components/icons";
import { logoutAction } from "@/app/actions/auth";

export default function PagoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-paper-2">
        <div className="mx-auto flex w-full max-w-[900px] items-center justify-between gap-4 px-5 py-4">
          <Link href="/" aria-label="DatosPrivados, inicio">
            <Logo />
          </Link>
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
      <main className="mx-auto w-full max-w-[820px] px-5 py-10 md:py-14">{children}</main>
      <footer className="mx-auto w-full max-w-[820px] px-5 pb-8 text-xs leading-relaxed text-ink-soft">
        Pago procesado por MercadoPago. DatosPrivados no almacena los datos de tu tarjeta.{" "}
        <Link href="/cuenta" className="link-underline">
          Descargar o eliminar mis datos
        </Link>
        .
      </footer>
    </div>
  );
}
