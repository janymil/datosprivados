import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "./icons";

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col justify-between gap-5 border-b border-line pb-7 md:flex-row md:items-end">
      <div>
        {eyebrow && <p className="label-mono">{eyebrow}</p>}
        <h1 className="mt-2 font-display text-[2rem] leading-[1.05] tracking-[-0.03em] md:text-[2.4rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-[62ch] text-sm leading-relaxed text-ink-soft">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
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
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-[3px] font-mono text-[10px] uppercase tracking-[0.1em] ${TONE[tone]}`}
    >
      {dot && <span className="h-[5px] w-[5px] rounded-full bg-current" />}
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
        className={`mt-3 font-display text-[2.1rem] leading-none tracking-[-0.03em] ${
          tone === "danger" ? "text-crimson" : tone === "warn" ? "text-ochre" : ""
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-2 text-[12px] leading-snug text-ink-soft">{hint}</p>}
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
        <p className="font-display text-xl tracking-[-0.02em]">{title}</p>
        <p className="mt-1 max-w-[52ch] text-sm leading-relaxed text-ink-soft">{description}</p>
      </div>
      {action && (
        <Link href={action.href} className="btn btn-ghost btn-sm">
          {action.label}
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
}

export function ComplianceRing({ score, size = 132 }: { score: number; size?: number }) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - Math.max(0, Math.min(100, score)) / 100);
  const color = score >= 80 ? "var(--sage)" : score >= 50 ? "var(--ochre)" : "var(--crimson)";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90">
        <circle cx="66" cy="66" r={radius} fill="none" stroke="var(--line)" strokeWidth="7" />
        <circle
          cx="66"
          cy="66"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="7"
          strokeLinecap="butt"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-[2.4rem] leading-none tracking-[-0.04em]">{score}</span>
        <span className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink-soft">
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
    <div className={`border-l-2 ${border} px-4 py-3`}>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">{title}</p>
      {children && <div className="mt-1 text-[13px] leading-relaxed text-ink">{children}</div>}
    </div>
  );
}

export function Field({
  label,
  children,
  hint,
  className,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] leading-snug text-ink-soft">{hint}</span>}
    </label>
  );
}
