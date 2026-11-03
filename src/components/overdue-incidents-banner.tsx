import Link from "next/link";

/**
 * Aviso dentro del panel de incidentes cuyo plazo de 48 h venció sin registrar la
 * notificación (área 9). El correo puede fallar o pasar desapercibido; esto se ve
 * en cualquier pantalla del panel hasta que el incidente se atiende.
 */
export function OverdueIncidentsBanner({ incidentIds }: { incidentIds: string[] }) {
  if (incidentIds.length === 0) return null;
  return (
    <div
      role="alert"
      className="no-print mb-5 border-l-3 border-crimson bg-crimson/[0.06] px-4 py-3 text-[15px] leading-relaxed"
    >
      <p>
        <strong>
          {incidentIds.length === 1
            ? "Tienes un incidente pasado el plazo de 48 horas."
            : `Tienes ${incidentIds.length} incidentes pasados el plazo de 48 horas.`}
        </strong>{" "}
        La notificación a la ANPD vence a las 48 h desde que lo detectaste.{" "}
        <Link href="/app/incidentes" className="link-underline font-medium text-crimson">
          Revisarlos ahora
        </Link>
        .
      </p>
      {incidentIds.length > 0 && (
        <ul className="mt-1.5 list-disc pl-5 text-sm">
          {incidentIds.slice(0, 3).map((id) => (
            <li key={id}>
              <Link href={`/app/incidentes/${id}`} className="link-underline">
                Abrir incidente
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
