import { appUrl, companyShortId } from "@/legal/shared";
import type { DocumentSpec, LegalContext } from "@/legal/types";

/** Textos de consentimiento A–G (antes `buildConsentTexts`). */

const v = ({ company }: LegalContext) => ({
  name: company.name,
  shortId: companyShortId(company),
  contact: company.dpo_email || company.email,
  policyUrl: `${appUrl()}/p/${company.slug}`,
  arcoUrl: `${appUrl()}/solicitud/${company.slug}`,
});

export const consentimientoSpec: DocumentSpec = {
  kind: "consentimiento",
  join: "\n\n",
  clauses: [
    {
      id: "consentimiento.a.formulario-web",
      cites: [],
      text: (ctx) => {
        const { name, shortId, contact, policyUrl, arcoUrl } = v(ctx);
        return `## A. Formulario web — Separación obligatoria de finalidades (Ley N.° 29733 y DS 016-2024-JUS)

**1. Aviso de lectura obligatoria (para procesar el pedido o consulta):**
> [ ] He leído y comprendo la Política de Privacidad de **${name}** (${shortId}), disponible en ${policyUrl}, respecto al tratamiento de mis datos personales necesarios para atender mi compra, pedido o consulta.

**2. Checkbox opcional e independiente para publicidad / marketing (NO premarcado):**
> [ ] *(Opcional)* Autorizo de forma libre, previa, expresa e informada a **${name}** a tratar mi nombre, correo electrónico y teléfono/WhatsApp en su banco de datos de «Prospectos y Promociones» para enviarme ofertas, descuentos y novedades comerciales, hasta que decida revocar mi consentimiento. Sé que puedo ejercer mis derechos ARCO o darme de baja gratis en ${arcoUrl} o escribiendo a ${contact}.

*Regla legal crítica (ANPD):* La casilla de publicidad **jamás debe estar marcada por defecto** y el cliente debe poder comprar o enviar su consulta aunque deje en blanco la casilla de publicidad.`;
      },
    },
    {
      id: "consentimiento.b.whatsapp",
      cites: [],
      text: (ctx) => {
        const { name, shortId, policyUrl, arcoUrl } = v(ctx);
        return `## B. WhatsApp / Redes Sociales — Solicitud de permiso (Opt-in)

**Mensaje para pedir permiso de promociones por WhatsApp:**
> Hola, te saluda **${name}** (${shortId}). Tus datos de contacto serán utilizados únicamente para atender tu consulta o pedido conforme a nuestra Política de Privacidad (${policyUrl}).
>
> Adicionalmente, ¿nos autorizas de forma voluntaria a enviarte promociones y descuentos futuros por este medio? Responde **«SÍ ACEPTO»** si deseas suscribirte. Puedes solicitar gratis la eliminación de tus datos o ejercer tus derechos ARCO en cualquier momento escribiendo «BAJA» o ingresando a ${arcoUrl}.

*Evidencia (art. 9 del DS 016-2024-JUS: la carga de la prueba del consentimiento es tuya):* Guarda captura o registro del mensaje donde el cliente respondió «SÍ ACEPTO» con fecha y hora. Si no responde afirmativamente, no es lícito volver a contactarlo con publicidad (art. 26.2). Atiende cualquier «BAJA» en un máximo de 10 días (art. 26.5), con un trámite no más complejo que el usado para suscribirse.`;
      },
    },
    {
      id: "consentimiento.c.doble-opt-in",
      cites: [],
      text: (ctx) => {
        const { name, shortId, contact, policyUrl, arcoUrl } = v(ctx);
        return `## C. Correo electrónico — Confirmación de suscripción (Doble Opt-in)

> **Asunto:** Confirma tu suscripción a las novedades de ${name}
>
> Hola: recibimos una solicitud para suscribir este correo a las comunicaciones comerciales de **${name}** (${shortId}).
>
> Para otorgar tu consentimiento libre, previo, expreso, informado e inequívoco, haz clic en el siguiente botón: **[CONFIRMAR MI SUSCRIPCIÓN]**. Si no realizaste esta solicitud, ignora este mensaje y tus datos no serán almacenados.
>
> Tus datos se conservarán en nuestro banco de datos de promociones hasta que revoques tu autorización. Puedes darte de baja en un clic o ejercer tus derechos ARCO gratis en ${arcoUrl} o escribiendo a ${contact}. Política de Privacidad completa: ${policyUrl}.`;
      },
    },
    {
      id: "consentimiento.d.encabezado",
      cites: [],
      text: ({ profile }) => `## D. Autorización para el tratamiento de datos sensibles${profile.sensitive || profile.biometric ? ` — ${profile.title}` : ""}

*Base legal:* art. 13.6 de la Ley N.° 29733 y art. 8 del DS N.° 016-2024-JUS: el consentimiento para datos sensibles debe darse **por escrito**, con firma manuscrita, digital, electrónica u otra modalidad que garantice la voluntad del titular. La carga de la prueba es tuya (art. 9). Son sensibles, entre otros, los datos genéticos y biométricos, neuronales, de salud física o mental, de afiliación sindical, de la vida afectiva o familiar y los hábitos de la esfera más íntima (art. 2.6).`,
    },
    {
      id: "consentimiento.d-uso.obligatorio",
      cites: [],
      when: ({ profile }) => profile.sensitive || profile.biometric,
      text: ({ profile }) =>
        `*Tu rubro (${profile.title}) trata datos sensibles de forma habitual: esta autorización es obligatoria antes de la primera atención y debe archivarse firmada.*`,
    },
    {
      id: "consentimiento.d-uso.si-aplica",
      cites: [],
      when: ({ profile }) => !(profile.sensitive || profile.biometric),
      text: () =>
        `*Úsala solo si recoges datos sensibles (salud, biometría, afiliación sindical, vida afectiva o familiar u otros del art. 2.6 del DS N.° 016-2024-JUS). Si no los recoges, no la uses: pedir datos de más viola el principio de proporcionalidad.*`,
    },
    {
      id: "consentimiento.d.autorizacion",
      cites: [],
      text: (ctx) => {
        const { company, profile } = ctx;
        const { name, shortId, contact, arcoUrl } = v(ctx);
        return `> **AUTORIZACIÓN EXPRESA PARA EL TRATAMIENTO DE DATOS SENSIBLES**
> Yo, ________________________________________, identificado(a) con DNI/CE N.° ______________, declaro haber sido informado(a) de la Política de Privacidad de **${name}** (${shortId}) y otorgo mi consentimiento libre, previo, expreso, informado, inequívoco y por escrito para el tratamiento de mis datos personales sensibles consistentes en ${profile.consent.data}, con la única finalidad de ${profile.consent.purpose}.
>
> Entiendo que estos datos serán conservados con acceso restringido, que ${name} no los usará para publicidad ni para finalidades distintas, y que no se transfieren a terceros salvo los indicados en la Política de Privacidad o por mandato legal.
>
> Conozco que puedo revocar esta autorización o ejercer gratuitamente mis derechos de acceso, rectificación, cancelación, oposición y portabilidad en ${arcoUrl}, en ${contact} o en ${company.address || "el domicilio de la empresa"}.
>
> Firma del titular: ________________________   Fecha: ____/____/20___`;
      },
    },
    {
      id: "consentimiento.e.aviso-corto",
      cites: [],
      text: (ctx) => {
        const { name, shortId, contact, policyUrl, arcoUrl } = v(ctx);
        return `## E. Aviso corto para boletas, cupones físicos o pie de página

> **Privacidad de Datos (Ley N.° 29733):** **${name}** (${shortId}) trata tus datos personales para ejecutar la relación contractual y cumplir obligaciones legales ante SUNAT. Puedes consultar nuestra Política de Privacidad completa en ${policyUrl} y ejercer gratuitamente tus derechos ARCO en ${arcoUrl} o en ${contact}.`;
      },
    },
    {
      id: "consentimiento.f.menores",
      cites: [],
      when: ({ profile }) => profile.minors,
      text: (ctx) => {
        const { name, shortId, contact, policyUrl, arcoUrl } = v(ctx);
        return `## F. Consentimiento de padres o tutores y de adolescentes (art. 22 y 23 del DS N.° 016-2024-JUS)

*Menores de 14 años: firma el padre, madre o tutor. De 14 a 17 años: el adolescente puede consentir por sí mismo, con información en lenguaje comprensible; aun así, conviene que firme también un adulto responsable cuando el servicio es continuado (colegio, academia, gimnasio). Solo se piden los datos de identidad y dirección de los padres para obtener el consentimiento (art. 23.2).*

> **AUTORIZACIÓN PARA EL TRATAMIENTO DE DATOS DE UN MENOR DE EDAD**
> Yo, ________________________________________, DNI/CE N.° ______________, en calidad de ☐ padre ☐ madre ☐ tutor/a legal de ________________________________________ (edad: ____ años), autorizo a **${name}** (${shortId}) a tratar los datos personales del menor para [indicar finalidad: matrícula, seguimiento, atención, comunicaciones con la familia, emergencias], conforme a la Política de Privacidad ${policyUrl}.
>
> ☐ Autorizo, de forma **separada y opcional**, el uso de fotografías o videos del menor en [redes sociales / página web / material impreso] del establecimiento.
> ☐ **No** autorizo ese uso de imagen (mi decisión no afecta la matrícula ni el servicio).
>
> Puedo revocar esta autorización y ejercer los derechos ARCO gratuitamente en ${arcoUrl} o en ${contact}.
>
> Firma: ________________________   Fecha: ____/____/20___`;
      },
    },
    {
      id: "consentimiento.g.imagen-voz",
      cites: [],
      when: ({ profile }) => profile.imageUse,
      text: (ctx) => {
        const { name, contact } = v(ctx);
        return `## G. Autorización de uso de imagen y voz (Código Civil, art. 15)

*La imagen y la voz de una persona no pueden aprovecharse sin su autorización expresa. Pídela **por separado** de cualquier otro permiso y no condiciones el servicio a ella.*

> **AUTORIZACIÓN DE USO DE IMAGEN Y VOZ**
> Yo, ________________________________________, DNI/CE N.° ______________, autorizo a **${name}** a utilizar mi imagen y voz captadas en [fotografías / videos] para [indicar medio: redes sociales, web, folletos, publicidad] durante [indicar plazo, p. ej. 2 años], sin que ello afecte mi atención. Puedo revocar esta autorización en cualquier momento escribiendo a ${contact}; el material ya difundido se retirará en un plazo diligente que no excede de 10 días (art. 10.2).
>
> Firma: ________________________   Fecha: ____/____/20___`;
      },
    },
    {
      id: "consentimiento.nota.borrador",
      cites: [],
      text: () => `---

*Textos elaborados con DatosPrivados conforme al Art. 5, 13 y 18 de la Ley N.° 29733 y al DS N.° 016-2024-JUS (arts. 5 a 10, 22, 23 y 26). Son un borrador: valida con un abogado las cláusulas de datos sensibles y de menores.*`,
    },
  ],
};
