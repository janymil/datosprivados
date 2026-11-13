/**
 * Quién opera DatosPrivados. Datos tomados de la ficha pública de la empresa (la misma que opera
 * LibroDigital.pe). Módulo sin dependencias: lo usan también componentes de cliente.
 */
export const PLATFORM_ENTITY = {
  legalName: "SEMANTIKA TECH E.I.R.L.",
  ruc: "20616806981",
  address: "Av. Javier Prado Este 560, San Isidro, Lima 15040",
  phone: "+51 965 403 196",
  phoneHref: "tel:+51965403196",
} as const;

/**
 * Correo de contacto, soporte y derechos ARCO.
 * PENDIENTE: el dominio datosprivados.pe no resuelve (sin registros A ni MX al 2026-11-13), así
 * que hoy este buzón no recibe correo. Cambiarlo aquí cambia todo el sitio.
 */
export const PLATFORM_CONTACT_EMAIL = "hola@datosprivados.pe";

/** Libro de Reclamaciones oficial de la plataforma (LibroDigital.pe). */
export const PLATFORM_COMPLAINTS_URL = "https://librodigital.pe/libro/semantikatech";
