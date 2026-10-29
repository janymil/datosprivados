import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listDocuments } from "@/lib/data";
import { updateCompanyAction } from "@/app/actions/company";
import { Field, PageHeader } from "@/components/ui";

export const metadata = { title: "Empresa" };

const SECTORS = [
  "Comercio electrónico",
  "Servicios profesionales",
  "Salud y bienestar",
  "Educación",
  "Alimentos y bebidas",
  "Inmobiliaria",
  "Turismo",
  "Otros",
];

export default async function CompanyPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string }>;
}) {
  const { company } = await requireSession();
  const { ok } = await searchParams;
  const documents = listDocuments(company.id);
  const policy = documents.find((doc) => doc.kind === "politica");

  return (
    <div className="space-y-7">
      <PageHeader
        eyebrow="Expediente · Identidad"
        title="Tu empresa"
        description="Estos datos alimentan la política de privacidad, los consentimientos y la ficha SIPDP. Mantenerlos al día es parte del cumplimiento."
      />

      {ok && (
        <p className="border-l-2 border-sage bg-sage/[0.07] px-4 py-3 text-[13px]">
          Datos actualizados. Regenera tus documentos para reflejar los cambios.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <form action={updateCompanyAction} className="card p-6 md:p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Razón social" className="sm:col-span-2">
              <input name="name" defaultValue={company.name} required className="input" />
            </Field>

            <Field label="RUC">
              <input
                name="ruc"
                defaultValue={company.ruc}
                required
                inputMode="numeric"
                pattern="\d{11}"
                maxLength={11}
                className="input"
              />
            </Field>

            <Field label="Sector">
              <select name="sector" defaultValue={company.sector} className="input">
                {SECTORS.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Correo de contacto">
              <input type="email" name="email" defaultValue={company.email} required className="input" />
            </Field>

            <Field label="Teléfono">
              <input name="phone" defaultValue={company.phone} className="input" placeholder="+51 987 654 321" />
            </Field>

            <Field label="Domicilio fiscal" className="sm:col-span-2">
              <input
                name="address"
                defaultValue={company.address}
                className="input"
                placeholder="Av. La Mar 1234, Miraflores, Lima"
              />
            </Field>

            <div className="sm:col-span-2 border-t border-line pt-5">
              <p className="label-mono">Responsable de privacidad</p>
              <p className="mt-1 max-w-[60ch] text-[12px] leading-relaxed text-ink-soft">
                La persona o área que atiende consultas y solicitudes. No es obligatorio designar un
                Oficial de Datos Personales, pero sí tener un canal claro.
              </p>
            </div>

            <Field label="Nombre del responsable">
              <input name="dpo_name" defaultValue={company.dpo_name} className="input" placeholder="Lucía Rojas" />
            </Field>

            <Field label="Correo de privacidad">
              <input
                type="email"
                name="dpo_email"
                defaultValue={company.dpo_email}
                className="input"
                placeholder="privacidad@empresa.pe"
              />
            </Field>
          </div>

          <div className="mt-6 flex justify-end border-t border-line pt-5">
            <button type="submit" className="btn btn-primary">
              Guardar cambios
            </button>
          </div>
        </form>

        <div className="space-y-5">
          <section className="card p-5">
            <p className="label-mono">Identificador público</p>
            <p className="mt-2 border border-line bg-paper px-3 py-2 font-mono text-[12px]">
              /{company.slug}
            </p>
            <p className="mt-2 text-[11.5px] leading-relaxed text-ink-soft">
              Se usa en las URLs de tu formulario ARCO y de tu política. No se puede cambiar en el MVP.
            </p>

            <div className="mt-4 space-y-2 border-t border-line pt-4">
              <Link
                href={`/solicitud/${company.slug}`}
                target="_blank"
                className="flex items-center justify-between gap-2 text-[12px] hover:text-crimson"
              >
                Formulario ARCO <span aria-hidden="true">↗</span>
              </Link>
              {policy?.published ? (
                <Link
                  href={`/p/${company.slug}`}
                  target="_blank"
                  className="flex items-center justify-between gap-2 text-[12px] hover:text-crimson"
                >
                  Política publicada <span aria-hidden="true">↗</span>
                </Link>
              ) : (
                <p className="text-[12px] text-ink-soft">Política sin publicar</p>
              )}
            </div>
          </section>

          <section className="border border-line bg-paper p-5">
            <p className="label-mono">Antes de publicar</p>
            <ul className="mt-3 space-y-2 text-[12px] leading-relaxed text-ink-soft">
              <li className="flex gap-2">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-crimson" />
                Verifica que el RUC y la razón social coincidan con tu ficha RUC.
              </li>
              <li className="flex gap-2">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-crimson" />
                Usa un correo de privacidad que revises al menos una vez por semana.
              </li>
              <li className="flex gap-2">
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-crimson" />
                Si cambias de domicilio, actualízalo aquí y regenera la política.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
