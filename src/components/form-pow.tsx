"use client";

import { useEffect, useState } from "react";
import type { Challenge } from "@/lib/form-pow";

/**
 * Resuelve en el navegador el desafío del formulario ARCO (prueba de trabajo) y
 * lo entrega en campos ocultos. Es opcional por diseño: si JavaScript falla o el
 * dispositivo es muy lento, el servidor sigue teniendo los límites por IP y el
 * campo trampa; el aviso explica qué hacer si no se puede verificar.
 *
 * `lib/form-pow.ts` es `server-only` (usa node:crypto); aquí solo se usa el tipo.
 */
type Props = { challenge: Pick<Challenge, "salt" | "difficulty" | "expires" | "signature"> };

async function solve(salt: string, difficulty: number): Promise<number | null> {
  const encoder = new TextEncoder();
  const digest = async (counter: number) => new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(`${salt}${counter}`)));
  const bits = (bytes: Uint8Array) => {
    let count = 0;
    for (const byte of bytes) {
      if (byte === 0) {
        count += 8;
        continue;
      }
      for (let mask = 0x80; mask > 0; mask >>= 1) {
        if ((byte & mask) === 0) count += 1;
        else return count;
      }
    }
    return count;
  };

  // Tope de intentos: si el dispositivo es muy lento, se entrega sin resolver y el
  // servidor responde con un mensaje claro en vez de quedarse colgado.
  for (let counter = 0; counter < 5_000_000; counter += 1) {
    if (bits(await digest(counter)) >= difficulty) return counter;
  }
  return null;
}

export function FormPow({ challenge }: Props) {
  const [counter, setCounter] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    solve(challenge.salt, challenge.difficulty)
      .then((value) => {
        if (cancelled) return;
        if (value === null) setFailed(true);
        else setCounter(value);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [challenge.salt, challenge.difficulty]);

  return (
    <>
      <input type="hidden" name="pow_salt" value={challenge.salt} />
      <input type="hidden" name="pow_signature" value={challenge.signature} />
      <input type="hidden" name="pow_difficulty" value={challenge.difficulty} />
      <input type="hidden" name="pow_expires" value={challenge.expires} />
      <input type="hidden" name="pow_counter" value={counter ?? ""} />
      {counter === null && !failed && (
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink-soft" aria-live="polite">
          Verificando que eres una persona…
        </p>
      )}
      {failed && (
        <p className="border-l-3 border-ochre bg-ochre/[0.08] px-3.5 py-2.5 text-sm leading-relaxed">
          Tu navegador no pudo completar la verificación automática. Recarga la página o, si sigue igual, envía tu
          solicitud escribiendo a la empresa desde el correo de contacto que aparece abajo.
        </p>
      )}
    </>
  );
}
