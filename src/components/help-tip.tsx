"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { TIPS, type TipKey } from "@/lib/help-tips";

/**
 * Tooltip contextual: un ⓘ junto a un campo, estado o título que explica en dos
 * líneas qué es y, si hay más, enlaza al artículo de la Ayuda. Se abre con el
 * mouse, con el teclado (Enter/Espacio) o con un toque, y se cierra con Esc.
 * Los textos viven en `lib/help-tips.ts`.
 */
export function HelpTip({ k, className = "", label }: { k: TipKey; className?: string; label?: string }) {
  const tip = TIPS[k];
  const id = useId();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; width: number; below: boolean }>({ left: 0, width: 320, below: false });
  const wrapRef = useRef<HTMLSpanElement>(null);
  const hoverOpened = useRef(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const place = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const width = Math.min(320, document.documentElement.clientWidth - 16);
    const desired = rect.left + rect.width / 2 - width / 2;
    const clamped = Math.max(8, Math.min(desired, document.documentElement.clientWidth - 8 - width));
    setPos({ left: clamped - rect.left, width, below: rect.top < 200 });
  }, []);

  useLayoutEffect(() => {
    if (open) place();
  }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    const onDown = (event: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("resize", place);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      window.removeEventListener("resize", place);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open, place]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const show = () => {
    clearTimeout(closeTimer.current);
    hoverOpened.current = true;
    setOpen(true);
  };
  // Un pequeño retraso deja pasar el mouse del ícono al globo (para poder pulsar «Saber más»).
  const hide = () => {
    clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  return (
    <span ref={wrapRef} className={`relative inline-flex align-middle ${className}`} onPointerEnter={(event) => event.pointerType === "mouse" && show()}
      onPointerLeave={(event) => event.pointerType === "mouse" && hide()}
    >
      <button
        type="button"
        aria-label={label ?? `Ayuda: ${tip.title}`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          // Si el mouse acaba de abrirlo al pasar, el clic lo deja abierto en vez de cerrarlo.
          if (hoverOpened.current) hoverOpened.current = false;
          else setOpen((value) => !value);
        }}
        className="inline-flex h-[18px] w-[18px] shrink-0 cursor-help items-center justify-center rounded-full border border-ink-soft/50 font-mono text-[11px] font-semibold leading-none text-ink-soft transition-colors hover:border-crimson hover:bg-crimson hover:text-paper focus-visible:border-crimson focus-visible:text-crimson"
      >
        <span aria-hidden="true">?</span>
      </button>

      {open && (
        <span
          id={id}
          role="tooltip"
          style={{ left: pos.left, width: pos.width }}
          className={`absolute z-50 rounded-[3px] border border-ink bg-paper-2 p-3.5 text-left font-sans text-ink shadow-[0_18px_45px_-10px_rgba(23,25,30,0.48)] ${
            pos.below ? "top-full mt-2" : "bottom-full mb-2"
          }`}
        >
          <span className="block font-mono text-[11px] font-bold uppercase tracking-[0.1em] text-crimson">{tip.title}</span>
          <span className="mt-1.5 block text-[14px] font-normal normal-case leading-relaxed tracking-normal text-ink">
            {tip.text}
          </span>
          {tip.topic && (
            <Link
              href={`/app/ayuda/${tip.topic}`}
              className="mt-2.5 inline-block font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-crimson hover:underline"
            >
              Saber más →
            </Link>
          )}
        </span>
      )}
    </span>
  );
}
