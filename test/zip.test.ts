import { describe, expect, it } from "vitest";
import { buildZip, crc32 } from "@/lib/zip";
import { buildExportZip } from "@/lib/export-files";
import { generateAndSaveDocument, listBanks } from "@/lib/data";
import { getCompany, makeActiveCompany, makeArcoRequest, makeBank } from "./helpers/db";

/**
 * Un ZIP mal armado no falla hasta que alguien intenta abrirlo, así que la prueba
 * lo lee de vuelta: recorre el directorio central y comprueba que cada archivo
 * está donde dice, con su tamaño y su CRC. Es también la garantía de que el
 * expediente descargable abre en Windows, macOS y Linux sin dependencias.
 */

type ReadEntry = { name: string; data: Uint8Array; crc: number };

function readZip(bytes: Uint8Array): ReadEntry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  // El fin del directorio central es el último bloque de 22 bytes (sin comentario).
  const end = bytes.length - 22;
  expect(view.getUint32(end, true)).toBe(0x06054b50);
  const count = view.getUint16(end + 10, true);
  expect(view.getUint16(end + 8, true)).toBe(count);
  const start = view.getUint32(end + 16, true);
  expect(view.getUint32(end + 12, true)).toBe(end - start);

  const entries: ReadEntry[] = [];
  let offset = start;
  for (let index = 0; index < count; index += 1) {
    expect(view.getUint32(offset, true)).toBe(0x02014b50);
    const crc = view.getUint32(offset + 16, true);
    const size = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const local = view.getUint32(offset + 42, true);
    const name = new TextDecoder().decode(bytes.slice(offset + 46, offset + 46 + nameLength));

    expect(view.getUint32(local, true)).toBe(0x04034b50);
    const localName = view.getUint16(local + 26, true);
    const localExtra = view.getUint16(local + 28, true);
    const dataStart = local + 30 + localName + localExtra;
    const data = bytes.slice(dataStart, dataStart + size);
    expect(crc32(data)).toBe(crc);

    entries.push({ name, data, crc });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

const text = (entry: ReadEntry) => new TextDecoder().decode(entry.data);

describe("zip", () => {
  it("arma un archivo válido con nombres en UTF-8 y CRC correcto", () => {
    const zip = buildZip([
      { name: "hola.txt", data: "Hola, política de privacidad" },
      { name: "datos/lista.csv", data: "\ufeffa,b\r\n1,2\r\n" },
      { name: "vacio.txt", data: "" },
    ]);
    const entries = readZip(zip);
    expect(entries.map((entry) => entry.name)).toEqual(["hola.txt", "datos/lista.csv", "vacio.txt"]);
    expect(text(entries[0])).toBe("Hola, política de privacidad");
    expect(entries[2].data.length).toBe(0);
  });

  it("usa el CRC32 del estándar", () => {
    // Valor conocido: "123456789" → 0xCBF43926.
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });
});

describe("expediente descargable", () => {
  it("incluye documentos, tablas en CSV y el JSON completo de la empresa", () => {
    const { companyId } = makeActiveCompany({ name: "Bodega Ñandú S.A.C." });
    makeBank(companyId, { name: "Clientes" });
    makeArcoRequest(companyId, { ticket: "ARCO-ZIP-1" });
    generateAndSaveDocument(getCompany(companyId), listBanks(companyId), "politica");

    const bundle = buildExportZip(companyId);
    expect(bundle).not.toBeNull();
    expect(bundle!.filename).toMatch(/^expediente-empresa-[a-z0-9]+-\d{4}-\d{2}-\d{2}\.zip$/);

    const entries = readZip(bundle!.body);
    const names = entries.map((entry) => entry.name);
    expect(names).toContain("LEEME.txt");
    expect(names).toContain("expediente.json");
    expect(names).toContain("empresa.txt");
    expect(names.some((name) => /^documentos\/politica-v\d+\.txt$/.test(name))).toBe(true);
    expect(names).toEqual(expect.arrayContaining(["bancos-de-datos.csv", "solicitudes-arco.csv", "usuarios.csv"]));

    const json = JSON.parse(text(entries.find((entry) => entry.name === "expediente.json")!)) as Record<string, unknown>;
    expect((json.company as Record<string, unknown>).id).toBe(companyId);
    expect(Array.isArray(json.documents)).toBe(true);

    const arcoEntry = entries.find((entry) => entry.name === "solicitudes-arco.csv")!;
    expect(text(arcoEntry)).toContain("ARCO-ZIP-1");
    // BOM (EF BB BF) para que Excel en Windows no rompa los acentos; el TextDecoder lo descarta al leer.
    expect([...arcoEntry.data.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const document = text(entries.find((entry) => entry.name.startsWith("documentos/politica-"))!);
    expect(document).toContain("Política");
  });

  it("no entrega nada de una empresa que no existe", () => {
    expect(buildExportZip("no-existe")).toBeNull();
  });
});
