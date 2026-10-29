"use client";

import { useEffect, useState } from "react";

function format(dueAt: string) {
  const ms = new Date(dueAt).getTime() - Date.now();
  const expired = ms < 0;
  const total = Math.floor(Math.abs(ms) / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return {
    expired,
    label: expired
      ? `Plazo vencido hace ${hours} h ${minutes} min`
      : `${hours} h ${String(minutes).padStart(2, "0")} min restantes`,
    urgent: !expired && hours < 12,
  };
}

export function Countdown({ dueAt, initialLabel }: { dueAt: string; initialLabel: string }) {
  const [state, setState] = useState(() => ({ ...format(dueAt), label: initialLabel }));

  useEffect(() => {
    const tick = () => setState(format(dueAt));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [dueAt]);

  return (
    <span
      className={
        state.expired ? "text-crimson" : state.urgent ? "text-ochre" : "text-ink"
      }
    >
      {state.label}
    </span>
  );
}
