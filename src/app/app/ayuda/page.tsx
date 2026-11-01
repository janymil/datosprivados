import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listBanks, listDocuments, listEvidence, listIncidents, listProviders, listRequests } from "@/lib/data";
import { computeCompliance } from "@/lib/compliance";
import { BANK_PRESETS } from "@/lib/bank-presets";
import { JOURNEY, SCREENS, TOPICS, buildSearchDocs } from "@/lib/help-content";
import { PageHeader } from "@/components/ui";
import { SparklesIcon } from "@/components/icons";
import { HelpSearch } from "@/components/help-search";
import { HelpJourney, type JourneyItem } from "@/components/help-journey";
import { HelpNeeds } from "@/components/help-needs";
import { HelpFaq, HelpGlossary, HelpTopics } from "@/components/help-reference";

export const metadata = { title: "Centro de ayuda" };

const TOC = [
  ["ruta", "Ruta de la A a la Z"],
  ["necesidades", "¿Qué necesita mi negocio?"],
  ["mapa", "Mapa de la app"],
  ["articulos", "Todos los artículos"],
  ["glosario", "Glosario"],
  ["preguntas", "Preguntas frecuentes"],
] as const;

const FIRST_TIME = [
  { n: "1", title: "Entiende la ley en 6 minutos", text: "Qué es un dato personal, a quién le toca y cuánto cuesta no cumplir.", href: "/app/ayuda/la-ley-en-simple", cta: "Leer" },
  { n: "2", title: "Descubre qué necesita tu negocio", text: "Marca cómo trabajas y te decimos qué listas y documentos te tocan.", href: "#necesidades", cta: "Probar" },
  { n: "3", title: "Sigue la ruta, paso a paso", text: "14 pasos con tiempo estimado. Los de configuración se marcan solos.", href: "#ruta", cta: "Ver la ruta" },
];

export default async function HelpCenterPage() {
  const { company } = await requireSession();
  const compliance = computeCompliance({
    company,
    banks: listBanks(company.id),
    requests: listRequests(company.id),
    incidents: listIncidents(company.id),
    documents: listDocuments(company.id),
    providers: listProviders(company.id),
    evidence: listEvidence(company.id),
  });
  const doneByKey = new Map(compliance.items.map((item) => [item.key, item.ok]));

  const steps: JourneyItem[] = JOURNEY.map((step) => ({
    ...step,
    done: step.doneKey ? (doneByKey.get(step.doneKey) ?? false) : null,
  }));
  const bankNames = Object.fromEntries(BANK_PRESETS.map((preset) => [preset.id, preset.name]));
  const cards = TOPICS.map(({ slug, title, summary, minutes, section }) => ({ slug, title, summary, minutes, section }));

  return (
    <div className="space-y-14">
      <header className="border-b border-line pb-10">
        <PageHeader
          eyebrow="Centro de ayuda"
          title="Todo lo que necesitas saber, sin saber de leyes."
          description={
            <>
              Guía completa de DatosPrivados: qué es la <strong>Ley 29733</strong>, qué le toca a <strong>{company.name}</strong>, qué hacer
              de la A a la Z y cómo usar cada pantalla. Busca, sigue la ruta o pregúntale al asistente.
            </>
          }
          actions={
            <Link href="/app/asistente" className="btn btn-primary">
              <SparklesIcon className="h-4 w-4" />
              Preguntar al asistente
            </Link>
          }
        />
        <div className="mt-8">
          <HelpSearch docs={buildSearchDocs()} />
        </div>

        <nav aria-label="Secciones de la ayuda" className="mt-8 flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs uppercase tracking-[0.08em]">
          {TOC.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="text-ink-soft hover:text-crimson">
              {label}
            </a>
          ))}
        </nav>
      </header>

      <section aria-labelledby="primera-vez">
        <p className="label-mono">¿Primera vez aquí?</p>
        <h2 id="primera-vez" className="mt-1 font-display text-[1.9rem] leading-tight tracking-[-0.025em]">
          Empieza por estos tres pasos
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {FIRST_TIME.map((card) => (
            <Link
              key={card.n}
              href={card.href}
              className="group border border-line bg-paper-2 p-5 transition-all hover:-translate-y-0.5 hover:border-ink hover:shadow-[5px_5px_0_0_var(--ink)]"
            >
              <span className="font-display text-5xl italic leading-none text-crimson/80">{card.n}</span>
              <span className="mt-3 block font-display text-[1.25rem] leading-snug tracking-[-0.01em]">{card.title}</span>
              <span className="mt-1.5 block leading-relaxed text-ink-soft">{card.text}</span>
              <span className="mt-3 inline-block font-mono text-xs font-semibold uppercase tracking-[0.08em] text-crimson group-hover:underline">
                {card.cta} →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section id="ruta" aria-labelledby="ruta-titulo">
        <p className="label-mono">De la A a la Z</p>
        <h2 id="ruta-titulo" className="mt-1 font-display text-[1.9rem] leading-tight tracking-[-0.025em]">
          Tu ruta de cumplimiento, paso a paso
        </h2>
        <p className="mb-6 mt-2 max-w-[68ch] text-ink-soft">
          Desde crear la cuenta hasta el mantenimiento. Los pasos de configuración se marcan solos según lo que ya hiciste en tu cuenta; los demás
          los marcas tú.
        </p>
        <HelpJourney steps={steps} />
      </section>

      <section id="necesidades" aria-labelledby="necesidades-titulo">
        <p className="label-mono">Para tu caso</p>
        <h2 id="necesidades-titulo" className="mt-1 font-display text-[1.9rem] leading-tight tracking-[-0.025em]">
          ¿Qué necesita mi negocio?
        </h2>
        <p className="mb-6 mt-2 max-w-[68ch] text-ink-soft">
          No todos los negocios necesitan lo mismo. Cuéntanos cómo trabajas y te armamos la lista.
        </p>
        <HelpNeeds bankNames={bankNames} />
      </section>

      <section id="mapa" aria-labelledby="mapa-titulo">
        <p className="label-mono">Dónde está cada cosa</p>
        <h2 id="mapa-titulo" className="mt-1 font-display text-[1.9rem] leading-tight tracking-[-0.025em]">
          Mapa de la app
        </h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SCREENS.map((screen) => (
            <div key={screen.href} className="flex flex-col border border-line bg-paper-2 p-4">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-soft">{screen.group}</span>
              <Link href={screen.href} className="mt-1 font-display text-[1.2rem] leading-snug tracking-[-0.01em] hover:text-crimson">
                {screen.label} →
              </Link>
              <p className="mt-1.5 text-[0.95rem] leading-relaxed">{screen.what}</p>
              <p className="mt-1 text-[0.9rem] leading-relaxed text-ink-soft">
                <strong className="font-semibold text-ink">Cuándo:</strong> {screen.when}
              </p>
              <Link
                href={`/app/ayuda/${screen.topic}`}
                className="mt-auto pt-3 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-crimson hover:underline"
              >
                Guía de esta pantalla
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section id="articulos" aria-labelledby="articulos-titulo">
        <p className="label-mono">Biblioteca</p>
        <h2 id="articulos-titulo" className="mb-5 mt-1 font-display text-[1.9rem] leading-tight tracking-[-0.025em]">
          Todos los artículos
        </h2>
        <HelpTopics topics={cards} />
      </section>

      <section id="glosario" aria-labelledby="glosario-titulo">
        <p className="label-mono">Palabras difíciles, en simple</p>
        <h2 id="glosario-titulo" className="mb-5 mt-1 font-display text-[1.9rem] leading-tight tracking-[-0.025em]">
          Glosario
        </h2>
        <HelpGlossary />
      </section>

      <section id="preguntas" aria-labelledby="preguntas-titulo">
        <p className="label-mono">Lo que más se pregunta</p>
        <h2 id="preguntas-titulo" className="mb-5 mt-1 font-display text-[1.9rem] leading-tight tracking-[-0.025em]">
          Preguntas frecuentes
        </h2>
        <HelpFaq />
      </section>

      <section className="border-2 border-ink bg-ink p-7 text-paper md:p-9">
        <h2 className="font-display text-[1.7rem] leading-tight tracking-[-0.02em]">¿No encontraste lo que buscabas?</h2>
        <p className="mt-2 max-w-[60ch] text-paper/80">
          El asistente legal conoce todo este contenido, la ley y el estado de tu cuenta. Pregúntale como le preguntarías a una persona.
        </p>
        <Link href="/app/asistente" className="btn btn-crimson mt-5">
          <SparklesIcon className="h-4 w-4" />
          Abrir el asistente
        </Link>
      </section>
    </div>
  );
}
