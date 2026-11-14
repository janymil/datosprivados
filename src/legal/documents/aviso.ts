import { appUrl } from "@/legal/shared";
import type { DocumentSpec, LegalContext } from "@/legal/types";

/** Avisos cortos de privacidad (antes `buildShortNotices`). */

const v = ({ company }: LegalContext) => ({
  name: company.name,
  contact: company.dpo_email || company.email,
  policyUrl: `${appUrl()}/p/${company.slug}`,
  arcoUrl: `${appUrl()}/solicitud/${company.slug}`,
});

export const avisoSpec: DocumentSpec = {
  kind: "aviso",
  join: "\n\n",
  clauses: [
    {
      id: "aviso.a.formulario-web",
      cites: [],
      text: (ctx) => {
        const { name, contact, policyUrl, arcoUrl } = v(ctx);
        return `## A. Formulario web (debajo del botón «Enviar»)

> Al enviar este formulario, ${name} tratará tus datos para atender tu solicitud. Puedes ejercer tus derechos de acceso, rectificación, cancelación, oposición y portabilidad en ${arcoUrl} o escribiendo a ${contact}. Política de Privacidad: ${policyUrl}`;
      },
    },
    {
      id: "aviso.b.checkout",
      cites: [],
      text: (ctx) => {
        const { name, policyUrl } = v(ctx);
        const checkoutNotice =
          ctx.profile.terms === "plataforma"
            ? `> Al suscribirte, ${name} tratará tus datos de cuenta y de pago para cobrar la suscripción, emitir la constancia de pago y atender reclamos. El cobro se renueva automáticamente hasta que canceles desde tu perfil. Política de Privacidad: ${policyUrl}`
            : `> Al comprar, ${name} tratará tus datos de contacto, entrega y pago para atender tu pedido, emitir el comprobante y gestionar garantías o reclamos. No te enviaremos publicidad sin tu permiso aparte. Política de Privacidad: ${policyUrl}`;
        return `## B. Checkout o pantalla de pago (antes de confirmar)

${checkoutNotice}`;
      },
    },
    {
      id: "aviso.c.whatsapp",
      cites: [],
      text: (ctx) => {
        const { name, policyUrl, arcoUrl } = v(ctx);
        return `## C. Primer contacto por WhatsApp o redes (mensaje de bienvenida)

> Hola, te saluda ${name}. Para atender tu consulta trataremos tus datos conforme a nuestra Política de Privacidad (${policyUrl}). No te enviaremos promociones sin tu permiso: si quieres recibirlas, responde «SÍ ACEPTO»; si no, simplemente seguimos con tu consulta. Puedes pedir la baja o ejercer tus derechos ARCO escribiendo «BAJA» o en ${arcoUrl}.`;
      },
    },
    {
      id: "aviso.d.firma-correo",
      cites: [],
      text: (ctx) => {
        const { name, policyUrl, arcoUrl } = v(ctx);
        return `## D. Firma de correo y pie de página

> ${name} · Tratamos tus datos para responder a tu mensaje. Política de Privacidad: ${policyUrl} · Derechos ARCO: ${arcoUrl}`;
      },
    },
    {
      id: "aviso.e.comprobante",
      cites: [],
      text: (ctx) => {
        const { policyUrl, arcoUrl } = v(ctx);
        return `## E. Boleta, recibo o comprobante (pie de documento)

> Tus datos se usan para la emisión de este comprobante y el cumplimiento de obligaciones tributarias. Información completa y derechos ARCO: ${policyUrl} · ${arcoUrl}`;
      },
    },
    {
      id: "aviso.f.registro-app",
      cites: [],
      text: (ctx) => {
        const { policyUrl } = v(ctx);
        return `## F. Onboarding de la app o registro (checkbox separado)

> [ ] He leído la Política de Privacidad (${policyUrl}) y acepto el tratamiento de mis datos para crear y administrar mi cuenta.
>
> [ ] *(Opcional)* Acepto recibir novedades y promociones. Puedo darme de baja cuando quiera.`;
      },
    },
    {
      id: "aviso.g.datos-sensibles",
      cites: [],
      when: ({ profile }) => profile.sensitive || profile.biometric,
      text: (ctx) => {
        const { policyUrl, arcoUrl } = v(ctx);
        return `## G. Ficha de ingreso o historia (antes de recoger datos sensibles)

> Para atenderte necesitamos datos de salud u otros datos sensibles. Los trataremos solo con tu autorización escrita (te la pediremos en el siguiente paso), con acceso restringido y sin usarlos para publicidad. Información completa y derechos ARCO: ${policyUrl} · ${arcoUrl}`;
      },
    },
    {
      id: "aviso.nota.regla-practica",
      cites: [],
      text: () => `---

*Regla práctica: el aviso corto no reemplaza a la política; la ubica (art. 7 del DS N.° 016-2024-JUS). Debe estar visible antes de que la persona entregue el dato, no después, e incluir al menos quién eres, para qué usas el dato y dónde ejercer derechos.*`,
    },
  ],
};
