import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "./icons";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-5 border-b border-line pb-7 md:flex-row md:items-end">
      <div>
        {eyebrow && <div className="label-mono">{eyebrow}</div>}
        <h1 className="mt-2 font-display text-[2.2rem] leading-[1.06] tracking-[-0.03em] md:text-[2.65rem]">
          {title}
        </h1>
        {description && (
          <div className="mt-2.5 max-w-[68ch] text-base leading-relaxed text-ink-soft">
            {description}
          </div>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

type Tone = "ok" | "warn" | "danger" | "neutral" | "info";

const TONE: Record<Tone, string> = {
  ok: "border-sage/40 bg-sage/10 text-sage",
  warn: "border-ochre/40 bg-ochre/10 text-ochre",
  danger: "border-crimson/40 bg-crimson/10 text-crimson",
  neutral: "border-line-strong bg-ink/[0.03] text-ink-soft",
  info: "border-ink/25 bg-ink/[0.04] text-ink",
};

export function StatusPill({
  tone = "neutral",
  children,
  dot = true,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1 font-mono text-xs font-medium uppercase tracking-[0.08em] ${TONE[tone]}`}
    >
      {dot && <span className="h-[6px] w-[6px] rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone,
  href,
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "danger" | "warn";
  href?: string;
}) {
  const content = (
    <>
      <p className="label-mono">{label}</p>
      <p
        className={`mt-3 font-display text-[2.35rem] leading-none tracking-[-0.03em] ${
          tone === "danger" ? "text-crimson" : tone === "warn" ? "text-ochre" : ""
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-2 text-sm leading-snug text-ink-soft">{hint}</p>}
    </>
  );

  return href ? (
    <Link href={href} className="card block p-5 transition-colors hover:border-line-strong">
      {content}
    </Link>
  ) : (
    <div className="card p-5">{content}</div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex flex-col items-start gap-4 border border-dashed border-line-strong bg-paper/50 p-8">
      <div className="dot-field h-10 w-10 border border-line-strong" aria-hidden="true" />
      <div>
        <p className="font-display text-2xl tracking-[-0.02em]">{title}</p>
        <p className="mt-1.5 max-w-[56ch] text-base leading-relaxed text-ink-soft">{description}</p>
      </div>
      {action && (
        <Link href={action.href} className="btn btn-ghost btn-sm">
          {action.label}
          <ArrowRightIcon className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export function ComplianceRing({ score, size = 140 }: { score: number; size?: number }) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, score)) / 100);
  const color = score >= 80 ? "var(--sage)" : score >= 50 ? "var(--ochre)" : "var(--crimson)";

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90">
        <circle cx="66" cy="66" r={radius} fill="none" stroke="var(--line)" strokeWidth="8" />
        <circle
          cx="66"
          cy="66"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="butt"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[2.5rem] leading-none tracking-[-0.04em]">{score}</span>
        <span className="mt-1 font-mono text-xs uppercase tracking-[0.12em] text-ink-soft">
          de 100
        </span>
      </div>
    </div>
  );
}

export function Notice({
  tone = "info",
  title,
  children,
}: {
  tone?: Tone;
  title: string;
  children?: ReactNode;
}) {
  const border =
    tone === "danger"
      ? "border-crimson/40 bg-crimson/[0.04]"
      : tone === "warn"
        ? "border-ochre/40 bg-ochre/[0.05]"
        : "border-line-strong bg-paper/60";

  return (
    <div className={`border-l-2 ${border} px-4 py-3.5`}>
      <p className="font-mono text-xs font-medium uppercase tracking-[0.12em] text-ink-soft">{title}</p>
      {children && <div className="mt-1.5 text-[15px] leading-relaxed text-ink">{children}</div>}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`block ${className ?? ""}`}>
      <div className="field-label">{label}</div>
      {children}
      {hint && <div className="mt-1.5 block text-[13.5px] leading-snug text-ink-soft">{hint}</div>}
    </div>
  );
}
