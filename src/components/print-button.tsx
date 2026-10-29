"use client";

export function PrintButton({ label = "Imprimir / PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className="btn btn-ghost btn-sm no-print">
      {label}
    </button>
  );
}
