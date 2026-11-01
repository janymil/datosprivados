import type { ArcoRequest, Company } from "./db";

export type AnonymizationVault = {
  /** Maps placeholder token (e.g., "{{EMPRESA_NOMBRE}}") -> real value */
  tokenToReal: Record<string, string>;
  /** Summary of redacted PII entities for transparency in the UI */
  redactedItems: Array<{ token: string; category: string; preview: string }>;
};

function maskPreview(val: string): string {
  const clean = val.trim();
  if (clean.length <= 4) return "****";
  return `${clean.slice(0, 2)}•••${clean.slice(-2)}`;
}

/**
 * Construye una bóveda de anonimización en el servidor.
 * Reemplaza todos los datos personales (DNI, RUC, nombres, correos, teléfonos, direcciones)
 * por tokens deterministas ({{TOKEN}}) ANTES de enviar cualquier texto al modelo de lenguaje configurado.
 */
export function createAnonymizationVault(input: {
  company: Company;
  request?: ArcoRequest | null;
}): AnonymizationVault {
  const tokenToReal: Record<string, string> = {};
  const redactedItems: Array<{ token: string; category: string; preview: string }> = [];

  const register = (token: string, realValue: string | undefined | null, category: string) => {
    const trimmed = (realValue ?? "").trim();
    if (!trimmed) return;
    tokenToReal[token] = trimmed;
    redactedItems.push({
      token,
      category,
      preview: maskPreview(trimmed),
    });
  };

  register("{{EMPRESA_NOMBRE}}", input.company.name, "Razón Social");
  register("{{EMPRESA_RUC}}", input.company.ruc, "RUC");
  register("{{EMPRESA_EMAIL}}", input.company.email, "Correo Empresa");
  register("{{EMPRESA_TELEFONO}}", input.company.phone, "Teléfono Empresa");
  register("{{EMPRESA_DIRECCION}}", input.company.address, "Dirección Empresa");
  register("{{ODP_NOMBRE}}", input.company.dpo_name || "Responsable de Privacidad", "Encargado ODP");
  register("{{ODP_EMAIL}}", input.company.dpo_email || input.company.email, "Correo Privacidad");

  if (input.request) {
    register("{{TITULAR_NOMBRE}}", input.request.requester_name, "Nombre del Titular");
    register("{{TITULAR_DNI}}", input.request.doc_number, "DNI / CE del Titular");
    register("{{TITULAR_EMAIL}}", input.request.email, "Correo del Titular");
    register("{{TITULAR_TELEFONO}}", input.request.phone, "Teléfono del Titular");
  }

  return { tokenToReal, redactedItems };
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Desinfecta texto libre en el servidor (reemplaza valores conocidos + patrones regex de
 * DNI peruano, RUC, correos electrónicos, celulares y direcciones físicas).
 */
export function anonymizeText(rawText: string, vault: AnonymizationVault): string {
  if (!rawText) return "";
  let sanitized = rawText;

  // 1. Replace known exact entities (longest first so partial matches don't break)
  const entries = Object.entries(vault.tokenToReal).sort((a, b) => b[1].length - a[1].length);
  for (const [token, realVal] of entries) {
    if (realVal.length >= 3) {
      const regex = new RegExp(escapeRegExp(realVal), "gi");
      sanitized = sanitized.replace(regex, token);
    }
  }

  // 2. Replace dynamic emails
  let emailIdx = 1;
  sanitized = sanitized.replace(
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g,
    (match) => {
      const token = `{{EMAIL_ANON_${emailIdx++}}}`;
      vault.tokenToReal[token] = match;
      vault.redactedItems.push({ token, category: "Correo detectado", preview: maskPreview(match) });
      return token;
    }
  );

  // 3. Replace Peruvian RUC (11 digits starting with 10, 15, 17, or 20)
  let rucIdx = 1;
  sanitized = sanitized.replace(/\b(10|15|17|20)\d{9}\b/g, (match) => {
    const token = `{{RUC_ANON_${rucIdx++}}}`;
    vault.tokenToReal[token] = match;
    vault.redactedItems.push({ token, category: "RUC detectado", preview: maskPreview(match) });
    return token;
  });

  // 4. Replace Peruvian Phone numbers (+51 9xx xxx xxx or 9xxxxxxxx)
  let phoneIdx = 1;
  sanitized = sanitized.replace(
    /(?:\+?51[\s-]?)?\b9\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/g,
    (match) => {
      const token = `{{CELULAR_ANON_${phoneIdx++}}}`;
      vault.tokenToReal[token] = match;
      vault.redactedItems.push({ token, category: "Celular detectado", preview: maskPreview(match) });
      return token;
    }
  );

  // 5. Replace Peruvian DNI: 8 digits, optionally grouped with spaces, dots or hyphens
  // (4567 8912, 45-678-912) and with the check digit (45678912-3). Runs after phones so a 9xx xxx xxx
  // number is not read as a DNI.
  let dniIdx = 1;
  sanitized = sanitized.replace(/\b(?:\d{8}(?:-\d)?|\d{4}[\s.-]\d{4}|\d{2}[\s.-]\d{3}[\s.-]\d{3})\b/g, (match) => {
    const token = `{{DNI_ANON_${dniIdx++}}}`;
    vault.tokenToReal[token] = match;
    vault.redactedItems.push({ token, category: "DNI detectado", preview: maskPreview(match) });
    return token;
  });

  // 6. Replace Peruvian street addresses (Av., Jr., Calle, Psj., Urb. followed by text/numbers)
  let addrIdx = 1;
  const redactAddress = (match: string) => {
    const token = `{{DIRECCION_ANON_${addrIdx++}}}`;
    vault.tokenToReal[token] = match.trim();
    vault.redactedItems.push({
      token,
      category: "Dirección física",
      preview: maskPreview(match.trim()),
    });
    return token;
  };
  sanitized = sanitized.replace(
    /\b(?:Av\.|Avenida|Jr\.|Jirón|Calle|Psj\.|Pasaje|Urb\.)\s+[A-Za-záéíóúÁÉÍÓÚñÑ0-9\s.,#-]{5,45}/g,
    redactAddress
  );
  // Variantes sin punto o en minúscula (av arequipa 1234, jiron lima 123, mz b lote 4): solo si llevan un número,
  // para no tapar frases comunes como «en la calle».
  sanitized = sanitized.replace(
    /\b(?:Av|Avenida|Jr|Jirón|Jiron|Calle|Psj|Pasaje|Urb|Urbanización|Mz|Manzana)\.?\s+(?=[^\n]{0,40}?\d)[A-Za-záéíóúÁÉÍÓÚñÑ0-9\s.,#-]{3,45}/gi,
    redactAddress
  );

  return sanitized;
}

/**
 * Re-hidrata en el servidor la respuesta del modelo de lenguaje reemplazando los
 * tokens {{TOKEN}} por los datos reales de la empresa o del titular.
 */
export function deAnonymizeText(aiOutput: string, vault: AnonymizationVault): string {
  if (!aiOutput) return "";
  let hydrated = aiOutput;
  for (const [token, realVal] of Object.entries(vault.tokenToReal)) {
    hydrated = hydrated.replaceAll(token, realVal);
  }
  return hydrated;
}
