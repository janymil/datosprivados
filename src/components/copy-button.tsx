"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label = "Copiar",
  className,
  locked = false,
}: {
  text: string;
  label?: string;
  className?: string;
  /** Desactiva el botón (cuenta de demostración). */
  locked?: boolean;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      disabled={locked}
      title={locked ? "Disponible al activar tu plan" : undefined}
      className={`${className ?? "btn btn-ghost btn-sm"}${locked ? " cursor-not-allowed opacity-50" : ""}`}
    >
      {copied ? "Copiado" : label}
    </button>
  );
}
