type IconProps = { className?: string };

const base = "shrink-0";

export function ShieldIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${base} ${className ?? ""}`} aria-hidden="true">
      <path
        d="M12 2.8 4.8 5.6v5.6c0 4.4 2.9 8.3 7.2 9.9 4.3-1.6 7.2-5.5 7.2-9.9V5.6L12 2.8Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="m8.9 11.9 2.1 2.1 4.1-4.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function FileIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${base} ${className ?? ""}`} aria-hidden="true">
      <path d="M6 2.8h7.4L19 8.4v12.8H6V2.8Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M13 3v5.6h5.7M9 12.5h6M9 16h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function InboxIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${base} ${className ?? ""}`} aria-hidden="true">
      <path
        d="M3 13.5 5.6 4h12.8L21 13.5v5.7H3v-5.7Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M3 13.5h5l1.4 2.4h5.2l1.4-2.4h5" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

export function AlertIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${base} ${className ?? ""}`} aria-hidden="true">
      <path d="M12 3 2.8 20h18.4L12 3Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M12 9.5v4.6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" />
    </svg>
  );
}

export function DatabaseIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${base} ${className ?? ""}`} aria-hidden="true">
      <ellipse cx="12" cy="6" rx="7.2" ry="3" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4.8 6v12c0 1.7 3.2 3 7.2 3s7.2-1.3 7.2-3V6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4.8 12c0 1.7 3.2 3 7.2 3s7.2-1.3 7.2-3" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${base} ${className ?? ""}`} aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M12 2.8v2.4M12 18.8v2.4M21.2 12h-2.4M5.2 12H2.8M18.5 5.5l-1.7 1.7M7.2 16.8l-1.7 1.7M18.5 18.5l-1.7-1.7M7.2 7.2 5.5 5.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${base} ${className ?? ""}`} aria-hidden="true">
      <path d="M4 12h15M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${base} ${className ?? ""}`} aria-hidden="true">
      <path d="m5 12.5 4.4 4.4L19 6.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ClockIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${base} ${className ?? ""}`} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12 7v5.2l3.4 2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function BuildingIcon({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={`${base} ${className ?? ""}`} aria-hidden="true">
      <path d="M4 21V5.5L12 2.8l8 2.7V21" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M4 21h16M9 21v-5h6v5M8 9h1.5M8 12.5h1.5M14.5 9H16M14.5 12.5H16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline ${className ?? ""}`}>
      <span className="font-display text-[1.35rem] leading-none tracking-[-0.03em]">Privado</span>
      <span className="font-display text-[1.35rem] italic leading-none tracking-[-0.05em] text-crimson">
        PE
      </span>
      <span className="mb-[4px] ml-[3px] inline-block h-[5px] w-[5px] rounded-full bg-crimson" aria-hidden="true" />
    </span>
  );
}
