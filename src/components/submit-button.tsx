"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

/** Botón de envío que se desactiva y muestra un texto de espera mientras se guarda. */
export function SubmitButton({
  children,
  pendingLabel = "Guardando…",
  className = "btn btn-primary",
  name,
  value,
  disabled = false,
}: {
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
  name?: string;
  value?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending || disabled}
      aria-busy={pending}
      className={`${className} disabled:cursor-wait disabled:opacity-60`}
    >
      {pending && (
        <span
          aria-hidden="true"
          className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
        />
      )}
      {pending ? pendingLabel : children}
    </button>
  );
}
