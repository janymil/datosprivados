const LIMA = "America/Lima";

export function limaToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LIMA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function limaDateTimeLocal(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: LIMA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

export function formatDate(value: string | null | undefined, style: "short" | "long" = "long") {
  if (!value) return "—";
  const date = new Date(value.length <= 10 ? `${value}T12:00:00-05:00` : value);
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: LIMA,
    day: "2-digit",
    month: style === "long" ? "long" : "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("es-PE", {
    timeZone: LIMA,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

export function daysLeftLabel(dueAt: string) {
  const today = limaToday();
  const diff = Math.round(
    (new Date(`${dueAt}T12:00:00-05:00`).getTime() - new Date(`${today}T12:00:00-05:00`).getTime()) /
      86_400_000
  );
  if (diff < 0) return `Vencida hace ${Math.abs(diff)} día${Math.abs(diff) === 1 ? "" : "s"}`;
  if (diff === 0) return "Vence hoy";
  return `Quedan ${diff} día${diff === 1 ? "" : "s"}`;
}

export function hoursLeft(dueAt: string) {
  const ms = new Date(dueAt).getTime() - Date.now();
  const hours = Math.floor(Math.abs(ms) / 3_600_000);
  const minutes = Math.floor((Math.abs(ms) % 3_600_000) / 60_000);
  return { expired: ms < 0, hours, minutes };
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
