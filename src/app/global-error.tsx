"use client";
import { PLATFORM_CONTACT_EMAIL } from "@/lib/platform-entity";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="es-PE">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: "4rem 1.25rem", maxWidth: 640 }}>
        <h1 style={{ fontSize: "1.75rem" }}>Algo salió mal.</h1>
        <p style={{ lineHeight: 1.6 }}>
          Intenta de nuevo. Si continúa, escríbenos a {PLATFORM_CONTACT_EMAIL}
          {error.digest ? ` indicando el código ${error.digest}` : ""}.
        </p>
        <button type="button" onClick={() => reset()} style={{ padding: "0.6rem 1rem", cursor: "pointer" }}>
          Intentar de nuevo
        </button>
      </body>
    </html>
  );
}
