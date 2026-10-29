"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckIcon } from "./icons";

/** Aviso breve de confirmación que desaparece solo. */
export function Toast({
  message,
  action,
  duration = 5000,
}: {
  message: string;
  action?: { href: string; label: string };
  duration?: number;
}) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="no-print fixed left-1/2 top-4 z-[60] flex w-[calc(100vw-2rem)] max-w-[480px] -translate-x-1/2 items-center gap-3 border border-sage/40 bg-paper-2 px-4 py-3 text-[15px] shadow-[0_18px_45px_-20px_rgba(23,25,30,0.5)] motion-safe:animate-[toast-in_200ms_ease-out]"
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage text-paper">
        <CheckIcon className="h-3.5 w-3.5" />
      </span>
      <span className="flex-1">{message}</span>
      {action && (
        <Link href={action.href} className="link-underline shrink-0 font-medium">
          {action.label}
        </Link>
      )}
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Cerrar aviso"
        className="shrink-0 px-1 text-ink-soft hover:text-ink"
      >
        ×
      </button>
    </div>
  );
}
