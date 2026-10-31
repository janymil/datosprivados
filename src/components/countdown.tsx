"use client";

import { useEffect, useState } from "react";

/** Reloj de cuenta regresiva en formato HH:MM:SS (48:00:00 → 47:59:58). */
function format(dueAt: string) {
  const ms = new Date(dueAt).getTime() - Date.now();
  const expired = ms < 0;
  const total = Math.floor(Math.abs(ms) / 1000);
  const pad = (value: number) => String(value).padStart(2, "0");
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return {
    expired,
    label: `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`,
    urgent: !expired && hours < 12,
  };
}

export function Countdown({ dueAt, initialLabel }: { dueAt: string; initialLabel: string }) {
  const [state, setState] = useState(() => ({ ...format(dueAt), label: initialLabel }));

  useEffect(() => {
    const tick = () => setState(format(dueAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [dueAt]);

  return (
    <span
      className={`tabular-nums ${
        state.expired ? "text-crimson" : state.urgent ? "text-ochre" : "text-ink"
      }`}
    >
      {state.label}
    </span>
  );
}
