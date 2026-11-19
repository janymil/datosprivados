/**
 * Quién opera DatosPrivados. Datos tomados de la ficha pública de la empresa (la misma que opera
 * LibroDigital.pe). Módulo sin dependencias: lo usan también componentes de cliente.
 */
export const PLATFORM_ENTITY = {
  legalName: "SEMANTIKA TECH E.I.R.L.",
  /** Nombre corto, como aparece en el JSON-LD de la empresa en montaweb.pe/empresa. */
  shortName: "SEMANTIKA TECH",
  ruc: "20616806981",
  streetAddress: "Av. Javier Prado Este 560 Int. 1302",
  locality: "San Isidro",
  region: "Lima",
  postalCode: "15040",
  address: "Av. Javier Prado Este 560 Int. 1302, San Isidro, Lima 15040",
  phone: "+51 965 403 196",
  phoneHref: "tel:+51965403196",
} as const;

/**
 * Página de la empresa: montaweb.pe/empresa reúne todas sus aplicaciones. Su `@id` es el que
 * usa el JSON-LD de la empresa; las apps lo citan como `parentOrganization`.
 */
export const COMPANY_HUB_URL = "https://montaweb.pe/empresa";
export const COMPANY_HUB_ORG_ID = "https://montaweb.pe/empresa#organization";

/**
 * Correo de contacto, soporte y derechos ARCO.
 * PENDIENTE: el dominio datosprivados.pe no resuelve (sin registros A ni MX al 2026-11-13), así
 * que hoy este buzón no recibe correo. Cambiarlo aquí cambia todo el sitio.
 */
export const PLATFORM_CONTACT_EMAIL = "hola@datosprivados.pe";

/** Libro de Reclamaciones oficial de la plataforma (LibroDigital.pe). */
export const PLATFORM_COMPLAINTS_URL = "https://librodigital.pe/libro/semantikatech";
