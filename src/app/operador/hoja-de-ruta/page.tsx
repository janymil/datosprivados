import { OperatorNav } from "@/components/operator-nav";
import { formatDate } from "@/lib/format";
import { requireOperator } from "@/lib/operator";
import { ROADMAP_STATUS_LABELS, roadmapByStatus } from "@/lib/roadmap";

export const metadata = { title: "Hoja de ruta", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Ideas, servicios futuros y decisiones pendientes. Solo para el operador. */
export default async function RoadmapPage() {
  await requireOperator();
  const groups = roadmapByStatus();

  return (
    <main id="contenido" tabIndex={-1} className="mx-auto max-w-3xl space-y-8 px-4 py-10">
      <header>
        <OperatorNav current="hoja-de-ruta" />
        <h1 className="mt-4 font-display text-4xl tracking-[-0.03em]">Hoja de ruta</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
          Servicios futuros, ideas y decisiones pendientes, para no olvidarlos. Solo la ven los operadores; no es una
          promesa a clientes. Detalle y fuentes en <code>docs/ESTRATEGIA-DIFERENCIACION-Y-PRECIOS.md</code>.
        </p>
      </header>

      {groups.map((group) => (
        <section key={group.status} aria-labelledby={`estado-${group.status}`} className="space-y-4">
          <h2 id={`estado-${group.status}`} className="font-display text-2xl">
            {ROADMAP_STATUS_LABELS[group.status]} <span className="text-ink-soft">({group.items.length})</span>
          </h2>
          {group.items.map((item) => (
            <article key={item.id} id={item.id} className="card space-y-3 p-6">
              <h3 className="font-display text-xl">{item.title}</h3>
              <p className="text-[15px] leading-relaxed">{item.summary}</p>
              {item.price && (
                <p className="text-sm">
                  <strong>Precio propuesto:</strong> {item.price}
                </p>
              )}
              {item.details.length > 0 && (
                <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-ink-soft">
                  {item.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              )}
              {item.dependsOn && (
                <p className="text-sm">
                  <strong>Antes de empezar:</strong> {item.dependsOn}
                </p>
              )}
              <p className="font-mono text-xs text-ink-soft">
                Fuente: {item.source} · anotado el {formatDate(item.addedAt, "long")}
              </p>
            </article>
          ))}
        </section>
      ))}
    </main>
  );
}
