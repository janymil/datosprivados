import Link from "next/link";
import type { ComplianceItem } from "@/lib/compliance";
import { CheckIcon } from "./icons";

/**
 * Lista ordenada de pasos de configuración. Solo el primer paso pendiente se
 * muestra expandido con su botón, para que el usuario sepa qué hacer ahora.
 */
export function PlanSteps({ items }: { items: ComplianceItem[] }) {
  const current = items.findIndex((item) => !item.ok);

  return (
    <ol className="divide-y divide-line border-y border-line">
      {items.map((item, index) => {
        const isCurrent = index === current;
        return (
          <li key={item.label} className={`flex items-start gap-3.5 px-3 py-3.5 ${isCurrent ? "bg-paper-2" : ""}`}>
            <span
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-xs font-semibold ${
                item.ok
                  ? "border-sage bg-sage text-paper"
                  : isCurrent
                    ? "border-crimson bg-crimson text-paper"
                    : "border-line-strong text-ink-soft"
              }`}
              aria-hidden="true"
            >
              {item.ok ? <CheckIcon className="h-3.5 w-3.5" /> : index + 1}
            </span>

            <div className="min-w-0 flex-1">
              <p
                className={`text-base leading-snug ${
                  item.ok ? "text-ink-soft line-through decoration-line-strong" : isCurrent ? "font-semibold" : ""
                }`}
              >
                {item.label}
                <span className="sr-only">{item.ok ? " (completado)" : isCurrent ? " (paso actual)" : " (pendiente)"}</span>
              </p>
              {isCurrent && (
                <>
                  <p className="mt-1 text-[15px] leading-relaxed text-ink-soft">{item.detail}</p>
                  {item.href && (
                    <Link href={item.href} className="btn btn-primary btn-sm mt-3">
                      {item.cta} →
                    </Link>
                  )}
                </>
              )}
            </div>

            {!item.ok && !isCurrent && item.href && (
              <Link
                href={item.href}
                className="shrink-0 font-mono text-xs font-medium uppercase tracking-[0.08em] text-ink-soft hover:text-crimson"
              >
                Ir →
              </Link>
            )}
          </li>
        );
      })}
    </ol>
  );
}
