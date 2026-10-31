"use client";

import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="container-page flex min-h-[70vh] flex-col items-start justify-center gap-5 py-16">
      <p className="label-mono">Error</p>
      <h1 className="font-display text-[2.2rem] leading-[1.05] tracking-[-0.03em]">Algo salió mal.</h1>
      <p className="max-w-[56ch] text-[16px] leading-relaxed text-ink-soft">
        Tu información no se perdió por este error. Intenta de nuevo; si continúa, escríbenos a{" "}
        <a href="mailto:hola@datosprivados.pe" className="link-underline text-ink">
          hola@datosprivados.pe
        </a>
        {error.digest ? ` indicando el código ${error.digest}` : ""}.
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" onClick={() => reset()} className="btn btn-primary">
          Intentar de nuevo
        </button>
        <Link href="/" className="btn btn-ghost">
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
