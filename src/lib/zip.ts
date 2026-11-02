/**
 * Escritor de ZIP mínimo: método «almacenar» (sin compresión) y nombres en
 * UTF-8. El proyecto no tiene dependencias de terceros y un ZIP con este
 * subconjunto se abre en Windows, macOS, Linux y Google Drive; comprimir no
 * aporta nada a un expediente de texto que ya viaja una sola vez.
 *
 * Referencia del formato: PKWARE APPNOTE, secciones 4.3.6 (archivo local),
 * 4.3.12 (directorio central) y 4.3.16 (fin del directorio central).
 */

export type ZipEntry = { name: string; data: string | Uint8Array };

const encoder = new TextEncoder();

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    table[index] = value >>> 0;
  }
  return table;
})();

export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** Hora local en el formato de MS-DOS que usa el ZIP (resolución de 2 segundos). */
function dosDateTime(date: Date): { time: number; date: number } {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

const LOCAL_HEADER = 30;
const CENTRAL_HEADER = 46;
const END_OF_CENTRAL = 22;

export function buildZip(entries: ZipEntry[], now = new Date()): Uint8Array {
  const { time, date } = dosDateTime(now);
  const prepared = entries.map((entry) => {
    const data = typeof entry.data === "string" ? encoder.encode(entry.data) : entry.data;
    return { name: encoder.encode(entry.name), data, crc: crc32(data) };
  });

  const localSize = prepared.reduce((total, file) => total + LOCAL_HEADER + file.name.length + file.data.length, 0);
  const centralSize = prepared.reduce((total, file) => total + CENTRAL_HEADER + file.name.length, 0);
  const out = new Uint8Array(localSize + centralSize + END_OF_CENTRAL);
  const view = new DataView(out.buffer);
  let offset = 0;
  const written: number[] = [];

  for (const file of prepared) {
    written.push(offset);
    view.setUint32(offset, 0x04034b50, true); // firma del archivo local
    view.setUint16(offset + 4, 20, true); // versión necesaria
    view.setUint16(offset + 6, 0x0800, true); // nombres en UTF-8
    view.setUint16(offset + 8, 0, true); // método: almacenar
    view.setUint16(offset + 10, time, true);
    view.setUint16(offset + 12, date, true);
    view.setUint32(offset + 14, file.crc, true);
    view.setUint32(offset + 18, file.data.length, true);
    view.setUint32(offset + 22, file.data.length, true);
    view.setUint16(offset + 26, file.name.length, true);
    view.setUint16(offset + 28, 0, true); // sin campo extra
    offset += LOCAL_HEADER;
    out.set(file.name, offset);
    offset += file.name.length;
    out.set(file.data, offset);
    offset += file.data.length;
  }

  const centralStart = offset;
  prepared.forEach((file, index) => {
    view.setUint32(offset, 0x02014b50, true); // firma del directorio central
    view.setUint16(offset + 4, 20, true); // versión que lo creó
    view.setUint16(offset + 6, 20, true); // versión necesaria
    view.setUint16(offset + 8, 0x0800, true);
    view.setUint16(offset + 10, 0, true);
    view.setUint16(offset + 12, time, true);
    view.setUint16(offset + 14, date, true);
    view.setUint32(offset + 16, file.crc, true);
    view.setUint32(offset + 20, file.data.length, true);
    view.setUint32(offset + 24, file.data.length, true);
    view.setUint16(offset + 28, file.name.length, true);
    view.setUint16(offset + 30, 0, true); // extra
    view.setUint16(offset + 32, 0, true); // comentario
    view.setUint16(offset + 34, 0, true); // disco
    view.setUint16(offset + 36, 0, true); // atributos internos
    view.setUint32(offset + 38, 0, true); // atributos externos
    view.setUint32(offset + 42, written[index], true); // desplazamiento del archivo local
    offset += CENTRAL_HEADER;
    out.set(file.name, offset);
    offset += file.name.length;
  });

  view.setUint32(offset, 0x06054b50, true); // fin del directorio central
  view.setUint16(offset + 4, 0, true); // disco
  view.setUint16(offset + 6, 0, true); // disco del directorio
  view.setUint16(offset + 8, prepared.length, true);
  view.setUint16(offset + 10, prepared.length, true);
  view.setUint32(offset + 12, offset - centralStart, true);
  view.setUint32(offset + 16, centralStart, true);
  view.setUint16(offset + 20, 0, true); // sin comentario

  return out;
}
