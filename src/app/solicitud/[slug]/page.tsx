import Link from "next/link";
import { notFound } from "next/navigation";
import { createArcoRequestAction } from "@/app/actions/arco";
import { getPolicyBySlug, getCompanyBySlug } from "@/lib/data";
import { Logo } from "@/components/icons";
import { Field } from "@/components/ui";

export const metadata = { title: "Solicitud de derechos ARCO" };

const TYPES = [
  ["acceso", "Acceso — quiero saber qué datos tienen sobre mí"],
  ["rectificacion", "Rectificación — quiero corregir un dato"],
  ["cancelacion", "Cancelación — quiero que eliminen mis datos"],
  ["oposicion", "Oposición — no quiero que usen mis datos para cierto fin"],
];

export default async function PublicRequestPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  const { slug } = await params;
  const { ok, error } = await searchParams;
  const company = getCompanyBySlug(slug);
  if (!company) notFound();
  const policy = getPolicyBySlug(slug);

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-paper-2">
        <div className="container-page flex h-16 items-center justify-between">
          <Link href="/" aria-label="PrivadoPE">
            <Logo />
          </Link>
          <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-ink-soft">
            Formulario de derechos ARCO
          </span>
        </div>
      </header>

      <main className="container-page grid gap-10 py-10 md:py-16 lg:grid-cols-[0.85fr_1.15fr]">
        <div>
          <p className="label-mono">{company.name} · RUC {company.ruc}</p>
          <h1 className="mt-3 font-display text-[2.2rem] leading-[1.03] tracking-[-0.03em] md:text-[2.8rem]">
            Ejerce tus derechos sobre tus datos.
          </h1>
          <p className="mt-4 max-w-[46ch] text-sm leading-relaxed text-ink-soft">
            Puedes solicitar acceso, rectificación, cancelación u oposición al tratamiento de tus datos
            personales. Es gratuito y no necesitas abogado.
          </p>

          <div className="mt-8 space-y-4 border-t border-line pt-6">
            {[
              ["Plazo de respuesta", "20 días hábiles desde que recibimos tu solicitud."],
              ["Qué necesitamos", "Tu nombre, un documento de contacto y una descripción clara."],
              ["Qué pasa después", "Recibirás un número de ticket y la empresa te contactará."],
            ].map(([title, body]) => (
              <div key={title}>
                <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-ink-soft">{title}</p>
                <p className="mt-1 text-[13px] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>

          {policy && (
            <p className="mt-8 text-[12px] text-ink-soft">
              Antes de enviar, puedes leer la{" "}
              <Link href={`/p/${slug}`} className="link-underline text-ink">
                Política de Privacidad
              </Link>{" "}
              de {company.name}.
            </p>
          )}
        </div>

        <div>
          {ok ? (
            <div className="card p-7 md:p-9">
              <div className="flex h-12 w-12 items-center justify-center border border-sage text-sage">
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
                  <path d="m5 12.5 4.4 4.4L19 6.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </div>
              <p className="mt-5 label-mono">Solicitud registrada</p>
              <h2 className="mt-2 font-display text-[1.9rem] leading-tight tracking-[-0.02em]">
                Recibimos tu pedido.
              </h2>
              <p className="mt-3 text-[13.5px] leading-relaxed text-ink-soft">
                Tu número de ticket es:
              </p>
              <p className="mt-2 border border-line bg-paper px-4 py-3 font-mono text-lg tracking-[0.06em]">
                {ok}
              </p>
              <p className="mt-4 text-[13px] leading-relaxed text-ink-soft">
                {company.name} tiene 20 días hábiles para responderte. Guarda este número para dar
                seguimiento. Si no recibes respuesta, puedes reclamar ante la ANPD.
              </p>
              <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
                <Link href={`/solicitud/${slug}`} className="btn btn-ghost btn-sm">
                  Enviar otra solicitud
                </Link>
                <Link href="/" className="btn btn-primary btn-sm">
                  Conocer PrivadoPE
                </Link>
              </div>
            </div>
          ) : (
            <form action={createArcoRequestAction} className="card space-y-4 p-6 md:p-8">
              <input type="hidden" name="slug" value={slug} />

              {error && (
                <p className="border-l-2 border-crimson bg-crimson/[0.05] px-3 py-2 text-[12.5px] text-crimson">
                  Revisa los campos obligatorios e inténtalo de nuevo.
                </p>
              )}

              <Field label="Tipo de solicitud">
                <select name="type" className="input" defaultValue="acceso" required>
                  {TYPES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nombres y apellidos">
                  <input name="requester_name" required className="input" placeholder="María Fernanda Quispe" />
                </Field>
                <Field label="DNI / CE">
                  <input name="doc_number" className="input" placeholder="45871236" inputMode="numeric" />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Correo electrónico">
                  <input type="email" name="email" required className="input" placeholder="tu@correo.com" />
                </Field>
                <Field label="Teléfono / WhatsApp">
                  <input name="phone" className="input" placeholder="+51 999 999 999" />
                </Field>
              </div>

              <Field
                label="Describe tu solicitud"
                hint="Indica qué dato quieres acceder, corregir, eliminar u objetar, y por qué."
              >
                <textarea
                  name="description"
                  required
                  rows={5}
                  className="input resize-y"
                  placeholder="Solicito acceder a los datos personales que mantienen sobre mí, incluyendo mi historial de compras."
                />
              </Field>

              <label className="flex items-start gap-3 border-t border-line pt-4 text-[12px] leading-relaxed text-ink-soft">
                <input type="checkbox" required className="mt-[3px] h-4 w-4 accent-[#b0241c]" />
                <span>
                  Declaro que la información es veraz y autorizo a {company.name} a contactarme para
                  atender esta solicitud. He leído su Política de Privacidad.
                </span>
              </label>

              <button type="submit" className="btn btn-primary w-full">
                Enviar solicitud
              </button>

              <p className="text-center font-mono text-[9px] uppercase tracking-[0.1em] text-ink-soft">
                Formulario operado con PrivadoPE
              </p>
            </form>
          )}
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-6 text-[11px] text-ink-soft sm:flex-row sm:justify-between">
          <p>
            © 2026 {company.name}. Todos los derechos reservados.
          </p>
          <p className="font-mono uppercase tracking-[0.1em]">
            {company.email} · {company.phone}
          </p>
        </div>
      </footer>
    </div>
  );
}
