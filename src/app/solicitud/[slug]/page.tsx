import Link from "next/link";
import { notFound } from "next/navigation";
import { createArcoRequestAction } from "@/app/actions/arco";
import { getPolicyBySlug, getCompanyBySlug, hasRequestTicket } from "@/lib/data";
import { Logo } from "@/components/icons";
import { Field } from "@/components/ui";
import { companyIdentityLine } from "@/lib/documents";

export const metadata = { title: "Solicitud de derechos ARCO" };

const TYPES = [
  ["acceso", "Acceso (20 días hábiles) — quiero saber qué datos míos tienen y cómo los usan"],
  ["rectificacion", "Rectificación (10 días hábiles) — quiero corregir o actualizar un dato mío"],
  ["cancelacion", "Cancelación (10 días hábiles) — quiero que eliminen mis datos de sus listas"],
  ["oposicion", "Oposición (10 días hábiles) — no quiero que usen mis datos (ej. no más publicidad)"],
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
  // Solo se muestra la constancia de un ticket que existe para esta empresa.
  const ticket = ok && hasRequestTicket(company.id, ok) ? ok : undefined;

  return (
    <div className="min-h-screen">
      <header className="border-b border-line bg-paper-2">
        <div className="container-page flex h-16 items-center justify-between">
          <Link href="/" aria-label="DatosPrivados">
            <Logo />
          </Link>
          <span className="font-mono text-xs uppercase tracking-[0.1em] text-ink-soft">
            Canal oficial de Derechos ARCO · Ley N.° 29733
          </span>
        </div>
      </header>

      <main className="container-page grid gap-10 py-10 md:py-16 lg:grid-cols-[0.88fr_1.12fr]">
        <div>
          <p className="label-mono">{companyIdentityLine(company)}</p>
          <h1 className="mt-3 font-display text-[2.3rem] leading-[1.03] tracking-[-0.03em] md:text-[2.85rem]">
            Ejerce tus derechos sobre tus datos personales.
          </h1>
          <p className="mt-4 max-w-[50ch] text-base leading-relaxed text-ink-soft">
            Conforme a la <strong>Ley N.° 29733</strong> y su Reglamento (<strong>DS N.° 016-2024-JUS</strong>), puedes solicitar gratis a <strong>{company.name}</strong> conocer qué datos tuyos guarda, corregirlos, eliminarlos o pedir que dejen de enviarte publicidad.
          </p>

          <div className="mt-8 space-y-5 border-t border-line pt-6">
            {[
              [
                "Trámite 100 % gratuito",
                "Ejercer tus derechos ARCO es totalmente gratuito y no necesitas abogado.",
              ],
              [
                "Plazos legales de respuesta (en días hábiles)",
                "Hasta 10 días hábiles para Rectificación, Cancelación u Oposición, y hasta 20 días hábiles para solicitudes de Acceso.",
              ],
              [
                "Número de seguimiento (Ticket)",
                "Al enviar este formulario recibirás un código único de ticket con la fecha exacta de recepción.",
              ],
            ].map(([title, body]) => (
              <div key={title}>
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.1em] text-crimson">{title}</p>
                <p className="mt-1 text-[15.5px] leading-relaxed">{body}</p>
              </div>
            ))}
          </div>

          {policy && (
            <p className="mt-8 text-sm text-ink-soft">
              También puedes consultar la{" "}
              <Link href={`/p/${slug}`} className="link-underline text-ink">
                Política de Privacidad completa
              </Link>{" "}
              de {company.name}.
            </p>
          )}
        </div>

        <div>
          {ticket ? (
            <div className="card p-7 md:p-9">
              <div className="flex h-12 w-12 items-center justify-center border border-sage text-sage">
                <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
                  <path d="m5 12.5 4.4 4.4L19 6.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </div>
              <p className="mt-5 label-mono">Constancia de recepción</p>
              <h2 className="mt-2 font-display text-[2rem] leading-tight tracking-[-0.02em]">
                Recibimos tu solicitud ARCO.
              </h2>
              <p className="mt-3 text-base leading-relaxed text-ink-soft">
                Guarda tu código de ticket para cualquier consulta o seguimiento:
              </p>
              <p className="mt-2 border border-line bg-paper px-4 py-3 font-mono text-xl font-semibold tracking-[0.06em]">
                {ticket}
              </p>
              <p className="mt-4 text-[15.5px] leading-relaxed text-ink-soft">
                <strong>{company.name}</strong> responderá a tu correo electrónico dentro del plazo legal (10 días hábiles para Rectificación, Cancelación u Oposición; 20 días hábiles para Acceso). Si no recibes atención en plazo, tienes derecho a acudir ante la Autoridad Nacional de Protección de Datos Personales (ANPD - MINJUSDH).
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5 border-t border-line pt-5">
                <Link href={`/solicitud/${slug}`} className="btn btn-ghost btn-sm">
                  Enviar otra solicitud
                </Link>
                <Link href="/" className="btn btn-primary btn-sm">
                  Conocer DatosPrivados
                </Link>
              </div>
            </div>
          ) : (
            <form action={createArcoRequestAction} className="card space-y-5 p-6 md:p-8">
              <input type="hidden" name="slug" value={slug} />
              <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />

              {error && (
                <p className="border-l-3 border-crimson bg-crimson/[0.06] px-3.5 py-2.5 text-sm text-crimson">
                  {error === "limite"
                    ? "Recibimos muchas solicitudes desde tu conexión. Intenta de nuevo en unos minutos."
                    : error === "demo"
                      ? "Esta es una página de demostración: no se guardan solicitudes. Crea tu cuenta para tener tu propio formulario."
                      : "Por favor completa los campos obligatorios e inténtalo de nuevo."}
                </p>
              )}

              <Field
                label="¿Qué derecho deseas ejercer?"
                hint="Elige la opción que mejor describa tu pedido."
              >
                <select name="type" className="input" defaultValue="acceso" required>
                  {TYPES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tus nombres y apellidos completos">
                  <input name="requester_name" required className="input" placeholder="María Fernanda Quispe" />
                </Field>
                <Field label="DNI / Carné de Extranjería">
                  <input name="doc_number" className="input" placeholder="45871236" inputMode="numeric" />
                </Field>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tu correo electrónico (para enviarte la respuesta)">
                  <input type="email" name="email" required className="input" placeholder="tu@correo.com" />
                </Field>
                <Field label="Teléfono / WhatsApp (opcional)">
                  <input name="phone" className="input" placeholder="+51 999 999 999" />
                </Field>
              </div>

              <Field
                label="Detalla tu pedido con claridad"
                hint="Por ejemplo: «Deseo que eliminen mi número 999-999-999 de su lista de promociones por WhatsApp» o «Deseo saber qué datos míos guardan»."
              >
                <textarea
                  name="description"
                  required
                  rows={5}
                  className="input resize-y"
                  placeholder="Escribe aquí los detalles de tu solicitud..."
                />
              </Field>

              <label className="flex items-start gap-3 border-t border-line pt-4 text-sm leading-relaxed text-ink-soft">
                <input type="checkbox" required className="mt-1 h-4 w-4 accent-[#b0241c]" />
                <span>
                  Declaro ser el titular de los datos personales indicados y autorizo a {company.name} a contactarme exclusivamente para responder esta solicitud ARCO.
                </span>
              </label>

              <button type="submit" className="btn btn-primary w-full">
                Enviar solicitud gratuita
              </button>

              <p className="text-center font-mono text-xs uppercase tracking-[0.08em] text-ink-soft">
                Canal de atención gestionado con DatosPrivados · Ley 29733
              </p>
            </form>
          )}
        </div>
      </main>

      <footer className="border-t border-line">
        <div className="container-page flex flex-col gap-2 py-6 text-xs text-ink-soft sm:flex-row sm:justify-between">
          <p>
            © 2026 {company.name}. Atención gratuita de Derechos ARCO.
          </p>
          <p className="font-mono uppercase tracking-[0.08em]">
            {company.email} · {company.phone}
          </p>
        </div>
      </footer>
    </div>
  );
}
