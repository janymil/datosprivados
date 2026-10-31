import { describe, expect, it } from "vitest";
import {
  INCIDENT_CRITERIA,
  criteriaLabels,
  normalizeCriteria,
  parseCriteria,
  requiresAnpdNotification,
  serializeCriteria,
} from "@/lib/incident-criteria";
import { cleanUrl, parseToolsInput } from "@/lib/provider-input";
import { anonymizeText, createAnonymizationVault, deAnonymizeText } from "@/lib/anonymizer";
import type { Company } from "@/lib/db";

describe("criterios del art. 34.1", () => {
  it("cada criterio por separado obliga a notificar a la ANPD", () => {
    for (const criterion of INCIDENT_CRITERIA) {
      expect(requiresAnpdNotification(criterion.id), criterion.id).toBe(true);
    }
    expect(INCIDENT_CRITERIA.map((c) => c.id).sort()).toEqual(
      ["dano_evidente", "datos_sensibles", "gran_volumen", "muchas_personas"]
    );
  });

  it("sin criterios solo se documenta", () => {
    for (const value of ["", null, undefined, "  ", "otro,cualquiera"]) {
      expect(requiresAnpdNotification(value as string)).toBe(false);
    }
  });

  it("descarta valores desconocidos, duplicados y respeta el orden canónico", () => {
    expect(normalizeCriteria(["dano_evidente", "x", "muchas_personas", "dano_evidente"])).toEqual([
      "muchas_personas",
      "dano_evidente",
    ]);
    expect(serializeCriteria(["gran_volumen", "datos_sensibles"])).toBe("datos_sensibles,gran_volumen");
    expect(parseCriteria(" gran_volumen , nada ")).toEqual(["gran_volumen"]);
    expect(criteriaLabels("datos_sensibles")).toEqual(["Datos sensibles"]);
  });
});

describe("provider-input", () => {
  it("cleanUrl rechaza esquemas peligrosos", () => {
    for (const bad of ["javascript:alert(1)", "data:text/html,<script>1</script>", "vbscript:x", "   "]) {
      expect(cleanUrl(bad), bad).toBe("");
    }
    // Esquemas de archivo o ftp nunca sobreviven como tales: se vacían o quedan como host https inofensivo.
    for (const odd of ["file:///etc/passwd", "ftp://x.com"]) {
      expect(cleanUrl(odd), odd).toMatch(/^(|https:\/\/.*)$/);
    }
  });

  it("cleanUrl acepta http(s) y agrega https cuando falta", () => {
    expect(cleanUrl("https://tienda.pe/")).toBe("https://tienda.pe");
    expect(cleanUrl("tienda.pe")).toBe("https://tienda.pe");
    expect(cleanUrl("http://tienda.pe/libro")).toBe("http://tienda.pe/libro");
  });

  it("cleanUrl limita la longitud", () => {
    expect(cleanUrl(`https://a.pe/${"x".repeat(1000)}`).length).toBeLessThanOrEqual(300);
  });

  it("parseToolsInput descarta categorías desconocidas, nombres vacíos y países fuera de lista", () => {
    const raw = JSON.stringify([
      { category: "correo", name: "  Gmail  ", country: "Estados Unidos" },
      { category: "inexistente", name: "X", country: "Perú" },
      { category: "correo", name: "   ", country: "Perú" },
      { category: "correo", name: "Zoho", country: "Narnia" },
      "basura",
      null,
    ]);
    const tools = parseToolsInput(raw);
    expect(tools).toEqual([
      { category: "correo", name: "Gmail", country: "Estados Unidos", custom: false },
      { category: "correo", name: "Zoho", country: "No sé", custom: false },
    ]);
  });

  it("parseToolsInput tolera JSON inválido o de otro tipo y limita nombre y cantidad", () => {
    expect(parseToolsInput("{no json")).toEqual([]);
    expect(parseToolsInput('{"a":1}')).toEqual([]);
    expect(parseToolsInput("")).toEqual([]);
    const long = parseToolsInput(JSON.stringify([{ category: "correo", name: "n".repeat(500), country: "Perú" }]));
    expect(long[0].name.length).toBe(80);
    const many = parseToolsInput(JSON.stringify(Array.from({ length: 300 }, (_, i) => ({ category: "correo", name: `T${i}`, country: "Perú" }))));
    expect(many.length).toBe(120);
  });
});

const company = {
  name: "Casa Verde S.A.C.",
  ruc: "20123456786",
  email: "contacto@casaverde.pe",
  phone: "987 654 321",
  address: "Av. Los Olivos 123, Lima",
  dpo_name: "María Quispe",
  dpo_email: "privacidad@casaverde.pe",
} as Company;

describe("anonymizer", () => {
  const raw =
    "Hola María Quispe, el cliente Juan Pérez (DNI 45678912, juan@mail.com, cel +51 987 654 321) vive en Av. Los Olivos 123, Lima. RUC 20123456786 y otro 10456789123.";

  it("reemplaza DNI, RUC, correos, celulares y direcciones", () => {
    const vault = createAnonymizationVault({ company });
    const clean = anonymizeText(raw, vault);
    for (const secret of ["45678912", "juan@mail.com", "987 654 321", "20123456786", "10456789123", "Av. Los Olivos 123", "María Quispe", "casaverde.pe"]) {
      expect(clean, secret).not.toContain(secret);
    }
  });

  it("anonymize → deAnonymize devuelve el texto original", () => {
    const vault = createAnonymizationVault({ company });
    const clean = anonymizeText(raw, vault);
    expect(deAnonymizeText(clean, vault)).toBe(raw);
  });

  it("maneja nombres con tildes, ñ y mayúsculas distintas", () => {
    const vault = createAnonymizationVault({ company: { ...company, dpo_name: "Ñusta Álvarez" } as Company });
    expect(anonymizeText("escribe a ÑUSTA ÁLVAREZ hoy", vault)).not.toMatch(/usta/i);
  });

  it("las entradas más largas se reemplazan primero (sin solaparse)", () => {
    const vault = createAnonymizationVault({ company });
    const clean = anonymizeText("correo: privacidad@casaverde.pe y contacto@casaverde.pe", vault);
    expect(clean).not.toContain("casaverde");
    expect(deAnonymizeText(clean, vault)).toBe("correo: privacidad@casaverde.pe y contacto@casaverde.pe");
  });

  it("incluye los datos del titular de la solicitud", () => {
    const vault = createAnonymizationVault({
      company,
      request: { requester_name: "Rosa Díaz", doc_number: "12345678", email: "rosa@x.pe", phone: "912345678" } as never,
    });
    const clean = anonymizeText("Rosa Díaz con DNI 12345678 pide sus datos", vault);
    expect(clean).not.toContain("Rosa");
    expect(clean).not.toContain("12345678");
  });

  it("texto vacío o sin datos personales", () => {
    const vault = createAnonymizationVault({ company });
    expect(anonymizeText("", vault)).toBe("");
    expect(anonymizeText("Texto sin datos", vault)).toBe("Texto sin datos");
    expect(deAnonymizeText("", vault)).toBe("");
  });
});
