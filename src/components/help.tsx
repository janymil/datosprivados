"use client";

import { useState, useRef, useEffect, type ReactNode } from "react";
import { GLOSSARY, type GlossaryKey } from "@/lib/glossary";

export type { GlossaryKey, GlossaryEntry } from "@/lib/glossary";

export function Term({
  k,
  children,
  className = "",
}: {
  k: GlossaryKey;
  children?: ReactNode;
  className?: string;
}) {
  const entry = GLOSSARY[k];
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [open]);

  if (!entry) return <>{children}</>;

  return (
    <span
      ref={ref}
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        title="Ver qué significa"
        className="inline cursor-help border-b border-dotted border-ink-soft/60 text-inherit transition-colors hover:border-crimson hover:text-crimson"
      >
        {children ?? entry.term}
      </button>

      {open && (
        <span
          role="tooltip"
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-full left-1/2 z-50 mb-2.5 w-[340px] -translate-x-1/2 rounded-[3px] border border-ink bg-paper-2 p-4 text-left font-sans text-ink shadow-[0_18px_45px_-10px_rgba(23,25,30,0.48)] sm:w-[400px]"
        >
          <span className="flex items-center justify-between gap-2 border-b border-line pb-2">
            <span className="font-mono text-xs font-bold uppercase tracking-[0.12em] text-crimson">
              {entry.term}
            </span>
            <span className="rounded-sm bg-crimson/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-crimson">
              En simple
            </span>
          </span>
          <span className="mt-2 block font-mono text-[11.5px] leading-snug text-ink-soft">
            {entry.official}
          </span>
          <span className="mt-2.5 block text-[14.5px] font-normal leading-relaxed text-ink">
            {entry.plain}
          </span>
          <span className="mt-3 block rounded-[2px] border-l-3 border-sage bg-sage/[0.1] px-3 py-2 text-[13.5px] font-normal leading-snug text-ink">
            <strong className="font-mono text-[11px] uppercase tracking-[0.06em] text-sage">
              Ejemplo real:{" "}
            </strong>
            {entry.example}
          </span>
        </span>
      )}
    </span>
  );
}

export function GuideBox({
  title = "Guía rápida para entender esta sección",
  what,
  why,
  how,
  defaultOpen = false,
}: {
  title?: string;
  what: ReactNode;
  why: ReactNode;
  how: ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<"what" | "why" | "how">("what");

  const tabs = [
    {
      id: "what" as const,
      num: "01",
      label: "¿Qué es en simple?",
      badgeColor: "text-crimson border-crimson bg-crimson/10",
      content: what,
    },
    {
      id: "why" as const,
      num: "02",
      label: "¿Por qué lo exige la ley?",
      badgeColor: "text-ochre border-ochre bg-ochre/10",
      content: why,
    },
    {
      id: "how" as const,
      num: "03",
      label: "¿Qué tienes que hacer aquí?",
      badgeColor: "text-sage border-sage bg-sage/10",
      content: how,
    },
  ];

  const currentTab = tabs.find((t) => t.id === activeTab)!;

  return (
    <div className="rounded-[3px] border border-line-strong bg-paper-2 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex flex-1 items-center gap-3 text-left"
          aria-expanded={isOpen}
        >
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-crimson font-mono text-xs font-bold text-paper">
            ?
          </span>
          <span className="font-display text-[1.05rem] leading-snug tracking-[-0.01em] text-ink sm:text-lg">
            {title}
          </span>
        </button>

        <div className="flex items-center gap-2">
          <div className={`${isOpen ? "sm:flex" : ""} hidden items-center gap-1`}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setIsOpen(true);
                }}
                className={`rounded-[2px] border px-2.5 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.06em] transition-colors ${
                  isOpen && activeTab === tab.id
                    ? "border-ink bg-ink text-paper"
                    : "border-line-strong bg-paper text-ink-soft hover:border-ink hover:text-ink"
                }`}
              >
                {tab.num}. {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            className="ml-2 font-mono text-xs font-semibold uppercase tracking-[0.1em] text-crimson hover:underline"
          >
            <span className="hidden sm:inline">{isOpen ? "Ocultar " : "Ver explicación "}</span>
            <span aria-hidden="true">{isOpen ? "−" : "+"}</span>
            <span className="sr-only sm:hidden">{isOpen ? "Ocultar" : "Ver explicación"}</span>
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-line bg-paper p-5">
          <div className="mb-3 flex flex-wrap gap-1.5 sm:hidden">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-[2px] border px-2.5 py-1.5 font-mono text-xs font-medium uppercase tracking-[0.06em] ${
                  activeTab === tab.id
                    ? "border-ink bg-ink text-paper"
                    : "border-line-strong bg-paper-2 text-ink-soft"
                }`}
              >
                {tab.num}. {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <span
                className={`inline-block rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.1em] ${currentTab.badgeColor}`}
              >
                Paso {currentTab.num} · {currentTab.label}
              </span>
              <div className="mt-2.5 max-w-[78ch] text-base leading-relaxed text-ink">
                {currentTab.content}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 border-t border-line pt-3 sm:border-t-0 sm:pt-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-label={tab.label}
                  className={`h-2.5 rounded-full transition-all ${
                    activeTab === tab.id ? "w-7 bg-crimson" : "w-2.5 bg-line-strong hover:bg-ink/40"
                  }`}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  const idx = tabs.findIndex((t) => t.id === activeTab);
                  setActiveTab(tabs[(idx + 1) % tabs.length].id);
                }}
                className="ml-2 font-mono text-xs font-semibold uppercase tracking-[0.08em] text-ink hover:text-crimson"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
