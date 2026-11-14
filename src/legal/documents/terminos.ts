import { appUrl, complaintsLink, controllerParagraph, isForeign } from "@/legal/shared";
import type { Clause, DocumentSpec, LegalContext } from "@/legal/types";

/**
 * Términos y condiciones (antes `buildTermsOfService` y `buildSalesTerms`).
 * Dos variantes según el perfil del rubro: plataforma digital o venta de bienes y servicios.
 */

const v = ({ company }: LegalContext) => ({
  name: company.name,
  contact: company.dpo_email || company.email,
  policyUrl: `${appUrl()}/p/${company.slug}`,
  arcoUrl: `${appUrl()}/solicitud/${company.slug}`,
  complaintsUrl: complaintsLink(company),
});

const plataforma = (ctx: LegalContext) => ctx.profile.terms !== "venta";
const venta = (ctx: LegalContext) => ctx.profile.terms === "venta";

const PLATAFORMA: Clause[] = [
  {
    id: "terminos.plataforma-1.quien-presta",
    cites: [],
    when: plataforma,
    text: (ctx) => `## 1. Quién presta el servicio

${controllerParagraph(ctx.company)}.

El servicio se comercializa bajo la marca que ${ctx.company.name} use en su web y aplicaciones móviles.`,
  },
  {
    id: "terminos.plataforma-2.objeto-aceptacion",
    cites: [],
    when: plataforma,
    text: (ctx) => `## 2. Objeto y aceptación

Estos Términos regulan el acceso y uso del servicio descrito en la sección 3. Al crear una cuenta, marcar la casilla de aceptación o pagar un plan, declaras que:

1. Tienes al menos **18 años** y capacidad legal para contratar.
2. Has leído y aceptas estos Términos y la **Política de Privacidad** (${v(ctx).policyUrl}).
3. La información que registras es veraz y te corresponde.

La versión aplicable es la publicada al momento de la contratación. Guardamos registro de la versión aceptada, la fecha y la hora.`,
  },
  {
    id: "terminos.plataforma-3.descripcion",
    cites: [],
    when: plataforma,
    // Termina en "\n" + aviso fintech (o nada): así queda la línea en blanco extra del texto original.
    text: ({ profile }) => `## 3. Descripción del servicio y planes

El servicio es una plataforma digital (${profile.title.toLowerCase()}). Funciones disponibles, límites de uso y precio dependen del plan contratado y de las condiciones publicadas en la página de precios. [Describe aquí, en dos líneas, qué hace tu servicio.]
${
  profile.family === "fintech"
    ? `
**El servicio no es un servicio financiero.** No somos banco, entidad de crédito, corredor, asesor de inversiones ni estudio contable. Los resúmenes, categorías y proyecciones son informativos: las decisiones sobre tu dinero son tuyas.
`
    : ""
}`,
  },
  {
    id: "terminos.plataforma-4.cuenta",
    cites: [],
    when: plataforma,
    text: (ctx) => `## 4. Tu cuenta

1. Eres responsable de la confidencialidad de tus credenciales y de la actividad de tu cuenta.
2. No puedes compartir el acceso con terceros ni revender el servicio sin autorización escrita.
3. Debes informarnos de inmediato cualquier acceso no autorizado a ${v(ctx).contact}.`,
  },
  {
    id: "terminos.plataforma-5.encabezado",
    cites: [],
    nonLegal: "Encabezado de sección",
    when: plataforma,
    text: () => `## 5. Precios, impuestos y suscripciones`,
  },
  {
    id: "terminos.plataforma-5-precio.extranjera",
    cites: [],
    when: (ctx) => plataforma(ctx) && isForeign(ctx.company),
    text: () =>
      `Los precios se muestran en dólares estadounidenses (USD) salvo que la página de pago indique soles peruanos (PEN). Cuando la venta se realice a un consumidor final en el Perú, el precio incluye el Impuesto General a las Ventas (IGV, 18%): actuamos como proveedor de servicios digitales no domiciliado e inscribimos nuestro RUC para recaudar el impuesto en cada cobro (Decreto Legislativo N.° 1623). El comprobante que recibes es la constancia de pago de la pasarela; no emitimos comprobantes de pago electrónicos peruanos.`,
  },
  {
    id: "terminos.plataforma-5-precio.peruana",
    cites: [],
    when: (ctx) => plataforma(ctx) && !isForeign(ctx.company),
    text: () =>
      `Los precios se muestran en soles peruanos (PEN) e incluyen el Impuesto General a las Ventas (IGV, 18%). Emitimos comprobante de pago electrónico por cada cobro y lo enviamos al correo de la cuenta.`,
  },
  {
    id: "terminos.plataforma-5.renovacion",
    cites: [],
    when: plataforma,
    text: () => {
      return `**Renovación automática.** Los planes de pago se renuevan automáticamente al final de cada ciclo (mensual o anual) por el mismo medio de pago, salvo que canceles antes de la fecha de renovación. El precio de la renovación es el vigente a esa fecha y te lo mostramos antes de cobrarlo.

**Pagos rechazados.** Si un cobro es rechazado, intentamos el cobro nuevamente durante un periodo de gracia y te avisamos por correo. Si el pago no se regulariza, la cuenta pasa al plan gratuito y sus funciones de pago se desactivan.`;
    },
  },
  {
    id: "terminos.plataforma-6.cancelacion-reembolsos",
    cites: [],
    when: plataforma,
    text: () => `## 6. Cancelación, reembolsos y derecho de retracto

1. Puedes cancelar la renovación en cualquier momento desde tu perfil, sin llamadas ni formularios.
2. Mantienes las funciones de pago hasta el último día del periodo ya pagado.
3. No reembolsamos periodos ya iniciados, salvo: cobro duplicado, cobro posterior a una cancelación oportuna, cobro no autorizado o falla nuestra que te impidió usar el servicio.
4. La política de reembolsos completa se publica en la misma web y forma parte de estos Términos.
5. En el Perú no existe un derecho de retracto general para servicios digitales ya iniciados; los derechos que la **Ley N.° 29571** te reconoce como consumidor se mantienen íntegros.`,
  },
  {
    id: "terminos.plataforma-7.uso-aceptable",
    cites: [],
    when: plataforma,
    text: () => `## 7. Uso aceptable

No puedes: usar el servicio para actividades ilícitas o fraudulentas; subir datos de terceros sin su consentimiento; intentar acceder a cuentas ajenas o vulnerar la seguridad; extraer datos de forma masiva; ni usar el servicio para elaborar perfiles de personas sin base legal.`,
  },
  {
    id: "terminos.plataforma-8.datos-privacidad",
    cites: [],
    when: plataforma,
    text: (ctx) => {
      const { contact, policyUrl, arcoUrl } = v(ctx);
      return `## 8. Tus datos y privacidad

Los datos que registras son tuyos. El tratamiento se describe en la **Política de Privacidad** (${policyUrl}), que forma parte de estos Términos. Puedes exportar tus datos y eliminar tu cuenta desde tu perfil, y ejercer tus derechos ARCO en ${arcoUrl} o escribiendo a ${contact}.`;
    },
  },
  {
    id: "terminos.plataforma-9.propiedad-intelectual",
    cites: [],
    when: plataforma,
    text: ({ company }) => `## 9. Contenido del usuario y propiedad intelectual

Conservas la titularidad de los datos y archivos que subes y nos otorgas solo la licencia necesaria para prestar el servicio. El software, las marcas, los textos y las plantillas de ${company.name} son de su titularidad y no pueden copiarse sin autorización.`,
  },
  {
    id: "terminos.plataforma-10.disponibilidad",
    cites: [],
    when: plataforma,
    text: () => `## 10. Disponibilidad y cambios en el servicio

Prestamos el servicio con esfuerzos comercialmente razonables, sin garantizar disponibilidad ininterrumpida. Podemos suspenderlo por mantenimiento, actualizaciones o causas de fuerza mayor. Si cambiamos funciones esenciales o el precio, lo avisamos con **30 días** de anticipación y puedes cancelar antes de que el cambio te afecte.`,
  },
  {
    id: "terminos.plataforma-11.responsabilidad",
    cites: [],
    when: plataforma,
    text: ({ company }) => `## 11. Limitación de responsabilidad

En la máxima medida permitida por ley, ${company.name} no responde por daños indirectos, lucro cesante ni pérdida de datos derivada de un uso distinto al previsto. Nuestra responsabilidad total se limita al monto que hayas pagado en los **doce (12) meses** anteriores al hecho.

Esta limitación **no se aplica** a dolo, culpa inexcusable, daño a la persona, ni a los derechos que la ley reconoce al consumidor con carácter indisponible.`,
  },
  {
    id: "terminos.plataforma-12.terminacion",
    cites: [],
    when: plataforma,
    text: () => `## 12. Terminación

Puedes dejar de usar el servicio y eliminar tu cuenta cuando quieras. Podemos suspender o cerrar una cuenta por incumplimiento grave de estos Términos, previo aviso salvo riesgo inminente de seguridad o exigencia legal. Al terminar, conservamos únicamente los datos que la ley nos obliga a mantener por plazos tributarios o de defensa de reclamaciones.`,
  },
  {
    id: "terminos.plataforma-13.libro-reclamaciones",
    cites: [],
    when: plataforma,
    text: (ctx) => `## 13. Libro de Reclamaciones y atención al consumidor

Contamos con **Libro de Reclamaciones virtual** gratuito, conforme a la Ley N.° 29571: ${v(ctx).complaintsUrl}. Puedes registrar un reclamo (disconformidad con el servicio o un cobro) o una queja (malestar por la atención). Respondemos en un plazo máximo de **30 días calendario**. Registrar un reclamo no impide acudir al **INDECOPI** ni a otras vías legales.`,
  },
  {
    id: "terminos.plataforma-14.ley-jurisdiccion",
    cites: [],
    when: plataforma,
    text: ({ company }) => `## 14. Ley aplicable y jurisdicción

Si eres **consumidor y resides en el Perú**, estos Términos se rigen por las leyes del **Perú** y puedes acudir al INDECOPI o a los tribunales de tu domicilio. Nada en esta cláusula reduce la protección que la Ley N.° 29571 te reconoce.

Para los demás usuarios, estos Términos se rigen por las leyes de **${company.country || "el Perú"}**${isForeign(company) ? "" : " y las controversias se someten a los tribunales de Lima"}.`,
  },
  {
    id: "terminos.plataforma-15.contacto-vigencia",
    cites: [],
    when: plataforma,
    text: (ctx) => {
      const { company, banks, date } = ctx;
      const paidBanks = banks.filter((bank) => /pago|factur|suscrip|cobro/i.test(`${bank.name} ${bank.purpose}`));
      return `## 15. Contacto y vigencia

Consultas, reclamos o ejercicio de derechos: **${v(ctx).contact}**. Domicilio: ${company.address || "[completar domicilio]"}${isForeign(company) ? ` · Representante en el Perú: ${company.representative_name || "[por designar]"}${company.representative_address ? `, ${company.representative_address}` : ""}` : ""}.

Vigencia: desde el **${date}**.${paidBanks.length ? `\n\n*Bancos de datos involucrados en la facturación:* ${paidBanks.map((bank) => `«${bank.name}»`).join(", ")}.` : ""}`;
    },
  },
  {
    id: "terminos.plataforma-nota.borrador",
    cites: [],
    nonLegal: "Nota de borrador",
    when: plataforma,
    text: ({ company }) => `---

*Borrador generado con DatosPrivados a partir de la información declarada por ${company.name}. Revísalo con un abogado antes de publicar.*`,
  },
];

const VENTA: Clause[] = [
  {
    id: "terminos.venta-1.quien-vende",
    cites: [],
    when: venta,
    text: ({ company }) => `## 1. Quién vende o presta el servicio

${controllerParagraph(company)}.`,
  },
  {
    id: "terminos.venta-2.aceptacion",
    cites: [],
    when: venta,
    text: (ctx) => `## 2. Aceptación

Al comprar, reservar o contratar por nuestros canales (web, redes, WhatsApp o local), declaras que tienes al menos **18 años** (o actúas con autorización de tus padres o tutores), que la información que nos das es veraz y que conoces estos Términos y la **Política de Privacidad** (${v(ctx).policyUrl}).`,
  },
  {
    id: "terminos.venta-3.productos-servicios",
    cites: [],
    when: venta,
    text: ({ profile }) => `## 3. Productos y servicios (${profile.title})

La descripción, las características y el precio de cada producto o servicio se muestran antes de que confirmes tu compra. [Indica aquí condiciones propias de tu rubro: horarios, citas, reservas, plazos de entrega, requisitos de edad o de salud.]`,
  },
  {
    id: "terminos.venta-4.precios-pagos",
    cites: [],
    when: venta,
    text: ({ company }) => `## 4. Precios, impuestos y medios de pago

Los precios están en soles peruanos (PEN), **incluyen el Impuesto General a las Ventas (IGV, 18%)** y los demás tributos, y se muestran antes de pagar (Ley N.° 29571). Emitimos comprobante de pago electrónico por cada venta. Los cobros con tarjeta se procesan en una pasarela de pagos; ${company.name} no guarda el número completo de tu tarjeta.`,
  },
  {
    id: "terminos.venta-5.entrega-garantia",
    cites: [],
    when: venta,
    text: () => `## 5. Entrega, cambios, devoluciones y garantía

1. Las **entregas** se hacen en la dirección y plazo informados. Si no estás, coordinamos una segunda entrega.
2. Los productos tienen la **garantía** legal y comercial que corresponde conforme a la Ley N.° 29571 (idoneidad del producto o servicio). Si el producto no es el que ofrecimos o tiene defectos, puedes pedir su reparación, reposición o la devolución del dinero.
3. Para **cambios y devoluciones** por otras razones, aplican las condiciones que informamos en la compra. [Detalla plazo, estado del producto y exclusiones.]
4. Las promociones y la publicidad nos obligan en lo que informan (Ley N.° 29571).`,
  },
  {
    id: "terminos.venta-6.datos-personales",
    cites: [],
    when: venta,
    text: (ctx) => {
      const { contact, policyUrl, arcoUrl } = v(ctx);
      return `## 6. Tus datos personales

El tratamiento de tus datos se describe en la **Política de Privacidad** (${policyUrl}). Usamos tus datos para atender tu compra o servicio, emitir comprobantes y cumplir obligaciones legales. **Solo te enviaremos publicidad si lo autorizas por separado** y puedes darte de baja gratis. Ejerce tus derechos ARCO en ${arcoUrl} o escribiendo a ${contact}.`;
    },
  },
  {
    id: "terminos.venta-7.uso-aceptable",
    cites: [],
    when: venta,
    text: () => `## 7. Uso aceptable de nuestros canales

No uses nuestros canales para actividades ilícitas, ni envíes datos de terceros sin su consentimiento, ni intentes vulnerar la seguridad de nuestra web o cuentas.`,
  },
  {
    id: "terminos.venta-8.libro-reclamaciones",
    cites: [],
    when: venta,
    text: (ctx) => `## 8. Libro de Reclamaciones y atención al consumidor

Contamos con **Libro de Reclamaciones** conforme a la Ley N.° 29571 y su Reglamento (DS N.° 011-2011-PCM): físico en el local y virtual en ${v(ctx).complaintsUrl}. Respondemos en un plazo máximo de **30 días calendario**. Registrar un reclamo no impide acudir al **INDECOPI** ni a otras vías legales.`,
  },
  {
    id: "terminos.venta-9.responsabilidad",
    cites: [],
    when: venta,
    text: () => `## 9. Responsabilidad

Respondemos por la idoneidad de lo que vendemos y por los daños que causemos con dolo o culpa. Esta cláusula no limita los derechos que la Ley N.° 29571 te reconoce como consumidor con carácter indisponible.`,
  },
  {
    id: "terminos.venta-10.ley-jurisdiccion",
    cites: [],
    when: venta,
    text: () => `## 10. Ley aplicable y jurisdicción

Estos Términos se rigen por las leyes del **Perú**. Si eres consumidor, puedes acudir al INDECOPI o a los tribunales de tu domicilio.`,
  },
  {
    id: "terminos.venta-11.contacto-vigencia",
    cites: [],
    when: venta,
    text: (ctx) => {
      const { company, date } = ctx;
      return `## 11. Contacto y vigencia

Consultas, reclamos o ejercicio de derechos: **${v(ctx).contact}**. Domicilio: ${company.address || "[completar domicilio]"}${isForeign(company) ? ` · Representante en el Perú: ${company.representative_name || "[por designar]"}` : ""}.

Vigencia: desde el **${date}**.`;
    },
  },
  {
    id: "terminos.venta-nota.borrador",
    cites: [],
    nonLegal: "Nota de borrador",
    when: venta,
    text: ({ profile }) => `---

*Borrador generado con DatosPrivados para un negocio de ${profile.title.toLowerCase()}. Completa los textos entre corchetes y revísalo con un abogado antes de publicar.*`,
  },
];

export const terminosSpec: DocumentSpec = {
  kind: "terminos",
  join: "\n\n",
  clauses: [...PLATAFORMA, ...VENTA],
};
