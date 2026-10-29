import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { listDocuments } from "@/lib/data";
import { updateCompanyAction } from "@/app/actions/company";
import { Field, PageHeader } from "@/components/ui";
import { GuideBox, Term } from "@/components/help";
import { SECTORS, SECTOR_GROUPS, findSectorByLabel } from "@/lib/sectors";
import { SubmitButton } from "@/components/submit-button";
import { CopyButton } from "@/components/copy-button";
import { appUrl } from "@/lib/documents";
import { Toast } from "@/components/toast";

export const metadata = { title: "Empresa" };

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
        title="Datos de tu empresa"
        description={
          <>
            Tu negocio es el <Term k="responsable">Responsable del tratamiento</Term> ante la{" "}
            <Term k="anpd">ANPD</Term>. Estos datos aparecen automáticamente en tu Política de Privacidad, tus textos de consentimiento y tus fichas del <Term k="sipdp">SIPDP</Term>.
          </>
        }
      />

      <GuideBox
        title="¿Por qué son importantes estos datos y qué es el Oficial de Datos Personales (ODP)?"
        what={
          <>
            Aquí defines la identidad legal de tu negocio (RUC 10 o RUC 20) y el correo donde recibirás consultas de privacidad o pedidos <Term k="arco">ARCO</Term>.
          </>
        }
        why={
          <>
            La <Term k="ley29733">Ley 29733</Term> exige que toda persona sepa exactamente quién guarda sus datos (Razón social, RUC y dirección) y a qué correo escribir para ejercer sus derechos.
          </>
        }
        how={
          <>
            Sobre el <Term k="odp">Oficial de Datos Personales (ODP)</Term>: según el <Term k="ds016">DS 016-2024-JUS</Term>, solo es obligatorio si tratas grandes volúmenes de datos o datos sensibles como parte de tu actividad. Aun en ese caso, las microempresas (ventas hasta 150 <Term k="uit">UIT</Term>) recién deben designarlo desde el <strong>30 de noviembre de 2028</strong> (pequeñas empresas, nov. 2027). Hoy puedes poner tu propio nombre y correo como contacto de privacidad.
          </>
        }
      />

      {ok && (
        <Toast
          message="Datos guardados. Actualiza tus documentos si cambiaste algo."
          action={{ href: "/app/documentos", label: "Ir" }}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <form action={updateCompanyAction} className="card p-6 md:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Razón social o Nombre comercial (RUC 10 / 20)"
              className="sm:col-span-2"
              hint="Tal como figura en tu Ficha RUC de SUNAT."
            >
              <input name="name" defaultValue={company.name} required className="input" />
            </Field>

            <Field label="Número de RUC (11 dígitos)">
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

            <Field label="Rubro o sector principal">
              <select name="sector" defaultValue={company.sector} className="input">
                {company.sector && !findSectorByLabel(company.sector) && (
                  <option value={company.sector}>{company.sector}</option>
                )}
                {SECTOR_GROUPS.map((group) => (
                  <optgroup key={group} label={group}>
                    {SECTORS.filter((sector) => sector.group === group).map((sector) => (
                      <option key={sector.id} value={sector.label}>
                        {sector.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </Field>

            <Field label="Correo general del negocio">
              <input type="email" name="email" defaultValue={company.email} required className="input" />
            </Field>

            <Field label="Teléfono / WhatsApp de contacto">
              <input name="phone" defaultValue={company.phone} className="input" placeholder="+51 987 654 321" />
            </Field>

            <Field
              label="Domicilio fiscal o dirección del local"
              className="sm:col-span-2"
              hint="La Ley 29733 exige indicar una dirección física en tu Política de Privacidad."
            >
              <input
                name="address"
                defaultValue={company.address}
                className="input"
                placeholder="Av. La Mar 1234, Miraflores, Lima"
              />
            </Field>

            <div className="sm:col-span-2 border-t border-line pt-5">
              <p className="label-mono">Contacto de privacidad</p>
              <p className="mt-1.5 max-w-[62ch] text-[15px] leading-relaxed text-ink-soft">
                Quien revisa las solicitudes <Term k="arco">ARCO</Term>. Puedes ser tú mismo.
              </p>
            </div>

            <Field label="Nombre">
              <input name="dpo_name" defaultValue={company.dpo_name} className="input" placeholder="Ej. Lucía Rojas" />
            </Field>

            <Field
              label="Correo de privacidad"
            >
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
            <SubmitButton>Guardar datos de mi empresa</SubmitButton>
          </div>
        </form>

        <div className="space-y-5">
          <section className="card p-6">
            <p className="label-mono">Tus enlaces públicos</p>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              Ponlos en tu web, firma de correo o perfil de WhatsApp e Instagram.
            </p>
            <ul className="mt-4 space-y-4 border-t border-line pt-4">
              {[
                { label: "Formulario ARCO", path: `/solicitud/${company.slug}`, active: true },
                { label: "Política de Privacidad", path: `/p/${company.slug}`, active: Boolean(policy?.published) },
              ].map((link) => (
                <li key={link.path}>
                  <p className="text-[15px] font-medium">{link.label}</p>
                  {link.active ? (
                    <div className="mt-1.5 flex items-center gap-2">
                      <code className="min-w-0 flex-1 truncate border border-line bg-paper px-2.5 py-1.5 font-mono text-xs">
                        {appUrl()}
                        {link.path}
                      </code>
                      <CopyButton text={`${appUrl()}${link.path}`} label="Copiar" />
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-ink-soft">
                      Aún sin publicar.{" "}
                      <Link href="/app/documentos" className="link-underline text-ink">
                        Publicar
                      </Link>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
