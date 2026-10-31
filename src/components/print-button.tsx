"use client";

export function PrintButton({
  label = "Imprimir / PDF",
  locked = false,
}: {
  label?: string;
  /** Desactiva el botón (cuenta de demostración). */
  locked?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      disabled={locked}
      title={locked ? "Disponible al activar tu plan" : undefined}
      className={`btn btn-ghost btn-sm no-print${locked ? " cursor-not-allowed opacity-50" : ""}`}
    >
      {label}
    </button>
  );
}
