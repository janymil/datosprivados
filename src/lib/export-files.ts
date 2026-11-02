import { exportCompanyData } from "./account";
import { buildZip, type ZipEntry } from "./zip";

/**
 * Expediente descargable: el mismo JSON de `exportCompanyData` (fuente completa)
 * más copias legibles —documentos en texto y tablas en CSV— para entregar a un
 * abogado, a la ANPD o a un contador sin que tengan que abrir el JSON.
 *
 * Se genera en memoria: el expediente de una MYPE son unos cientos de KB.
 */

type Row = Record<string, unknown>;

/** Nombre de archivo seguro (sin acentos, espacios ni barras). */
function fileSlug(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60) || "sin-nombre";
}

/** Celda CSV: entrecomillada siempre, con las comillas internas duplicadas. */
function cell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  return `"${String(value).replace(/"/g, '""')}"`;
}

function toCsv(rows: Row[], columns: string[]): string {
  const header = columns.map(cell).join(",");
  const body = rows.map((row) => columns.map((column) => cell(row[column])).join(","));
  // BOM: Excel en Windows abre los acentos bien solo con él.
  return `\ufeff${[header, ...body].join("\r\n")}\r\n`;
}

const ENTRIES: Array<{ file: string; columns: string[] }> = [
  { file: "bancos-de-datos.csv", columns: ["name", "purpose", "data_categories", "legal_basis", "retention", "recipients", "transfers", "channel", "status", "sipdp_code", "registered_at", "updated_at"] },
  { file: "proveedores.csv", columns: ["category", "name", "country", "purpose", "data", "cookies", "dpa_status", "transfer_status", "updated_at"] },
  { file: "solicitudes-arco.csv", columns: ["ticket", "type", "channel", "requester_name", "doc_number", "email", "phone", "description", "status", "received_at", "due_at", "responded_at", "response"] },
  { file: "incidentes.csv", columns: ["title", "severity", "detected_at", "due_at", "status", "affected_people", "affected_sample", "criteria", "data_categories", "measures", "notified_at"] },
  { file: "evidencias.csv", columns: ["type", "occurred_on", "detail", "reference"] },
  { file: "actividad.csv", columns: ["kind", "message", "created_at"] },
  { file: "pagos.csv", columns: ["id", "plan", "term", "amount", "currency", "status", "provider", "payment_id", "subscription_id", "paid_at", "created_at"] },
  { file: "comprobantes.csv", columns: ["id", "payment_id", "status", "doc_type", "buyer_ruc", "buyer_name", "description", "base_amount", "igv_amount", "total", "currency", "series", "number", "issued_at", "created_at"] },
  { file: "usuarios.csv", columns: ["name", "email", "role", "email_verified_at", "created_at"] },
  { file: "consentimientos.csv", columns: ["document", "version", "context", "ip", "accepted_at"] },
];

const README = (companyName: string, exportedAt: string, documents: number) => `EXPEDIENTE DE CUMPLIMIENTO — ${companyName}
Generado por DatosPrivados (Ley 29733) el ${exportedAt}.

Qué contiene este ZIP
  expediente.json        Todo, en formato máquina: es la copia completa.
  empresa.txt            Datos de la empresa y del responsable de datos.
  documentos/*.txt       Cada documento legal generado (una carpeta por versión).
  *.csv                  Bancos de datos, ARCO, incidentes, evidencias, pagos… en tablas.
  LEEME.txt              Este archivo.

Este paquete contiene datos personales (de tus clientes y de quienes ejercieron
sus derechos ARCO). Guárdalo cifrado y bórralo cuando ya no lo necesites.
Si la empresa se elimina, los respaldos que hayas hecho de este ZIP no se borran
solos: esa copia queda bajo tu responsabilidad.

${documents} documento(s) legal(es) en la carpeta documentos/.
`;

/** Archivo del expediente completo, listo para descargar. `null` si la empresa no existe. */
export function buildExportZip(companyId: string, now = new Date()): { filename: string; body: Uint8Array } | null {
  const data = exportCompanyData(companyId);
  if (!data) return null;

  const company = data.company as Row;
  const documents = data.documents as Row[];
  const versions = data.document_versions as Row[];
  const exportedAt = String(data.exported_at);
  const entries: ZipEntry[] = [];

  entries.push({ name: "LEEME.txt", data: README(String(company.name ?? ""), exportedAt, documents.length) });
  entries.push({ name: "expediente.json", data: JSON.stringify(data, null, 2) });
  entries.push({
    name: "empresa.txt",
    data: [
      `Razón social: ${company.name}`,
      `RUC: ${company.ruc}`,
      `Rubro: ${company.sector}`,
      `Domicilio: ${company.address}`,
      `Correo: ${company.email}`,
      `Teléfono: ${company.phone}`,
      `Responsable de datos personales: ${company.dpo_name} <${company.dpo_email}>`,
      `Sitio web: ${company.website}`,
      `Libro de Reclamaciones: ${company.complaints_url}`,
      `Plan: ${company.plan} (${company.billing_term})`,
      `Estado de facturación: ${company.billing_status}`,
      `Página pública: /p/${company.slug}`,
      `Cliente desde: ${company.created_at}`,
      "",
    ].join("\n"),
  });

  // Documentos: la versión vigente de cada uno, y aparte el historial completo.
  for (const document of documents) {
    const kind = fileSlug(document.kind);
    entries.push({ name: `documentos/${kind}-v${String(document.version)}.txt`, data: String(document.content ?? "") });
  }
  for (const version of versions) {
    const kind = fileSlug(version.kind);
    if (documents.some((document) => document.kind === version.kind && document.version === version.version)) continue;
    entries.push({ name: `documentos/historial/${kind}-v${String(version.version)}.txt`, data: String(version.content ?? "") });
  }

  const tableData: Record<string, Row[]> = {
    "bancos-de-datos.csv": data.data_banks as Row[],
    "proveedores.csv": data.providers as Row[],
    "solicitudes-arco.csv": data.arco_requests as Row[],
    "incidentes.csv": data.incidents as Row[],
    "evidencias.csv": data.evidence as Row[],
    "actividad.csv": data.activity as Row[],
    "pagos.csv": data.payments as Row[],
    "comprobantes.csv": data.invoices as Row[],
    "usuarios.csv": data.users as Row[],
    "consentimientos.csv": data.legal_consents as Row[],
  };
  for (const { file, columns } of ENTRIES) entries.push({ name: file, data: toCsv(tableData[file] ?? [], columns) });

  const day = exportedAt.slice(0, 10);
  return { filename: `expediente-${fileSlug(company.slug)}-${day}.zip`, body: buildZip(entries, now) };
}

