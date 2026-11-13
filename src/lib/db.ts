import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {
  buildArcoProcedure,
  buildComplaintBook,
  buildConsentTexts,
  buildCookiePolicy,
  buildImpactAssessment,
  buildInternalClauses,
  buildSectorProtocol,
  buildPrivacyPolicy,
  buildProcessingAgreement,
  buildRetentionPolicy,
  buildSecurityDocument,
  buildShortNotices,
  buildTermsOfService,
  buildWorkerNotice,
} from "./documents";
import { TEMPLATE_VERSIONS, fingerprint, serializeBuiltFrom } from "./document-freshness";

/**
 * Capa de datos del MVP.
 *
 * Usamos `node:sqlite` (incluido en Node 22+) para que el proyecto arranque sin
 * servicios externos. La interfaz está aislada aquí: para producción se cambia
 * esta capa por Postgres + Drizzle sin tocar las pantallas.
 */

export type Company = {
  id: string;
  name: string;
  ruc: string;
  sector: string;
  slug: string;
  email: string;
  phone: string;
  address: string;
  plan: "basico" | "pro";
  /** monthly | yearly; se fija al crear la suscripción. */
  billing_term: "monthly" | "yearly";
  /** active: plan pagado; pending: falta la suscripción; demo: cuenta de ejemplo. */
  billing_status: "active" | "pending" | "expired" | "demo" | "deleted";
  /** Fin del período pagado (ISO). null en cuentas legacy o de demo. */
  paid_until: string | null;
  /** Último pago de MercadoPago aplicado a la cuenta. */
  last_payment_id: string | null;
  /** ID de la suscripción (preapproval) de MercadoPago. */
  subscription_id: string | null;
  /** pending | authorized | paused | cancelled | demo */
  subscription_status: string | null;
  /**
   * Cambio de plan en curso: la suscripción nueva aún no está autorizada en
   * MercadoPago. El plan y el término solo se aplican cuando se autoriza.
   */
  pending_subscription_id: string | null;
  pending_plan: string | null;
  pending_term: string | null;
  /** Monto acordado al crear la suscripción pendiente; la validación usa este monto, no la lista de precios. */
  pending_amount: number | null;
  /** Monto acordado de la suscripción vigente. null en cuentas anteriores (se usa el precio del plan). */
  subscription_amount: number | null;
  /** 1 = suscripción de primer año: se cierra tras su primer cobro y la renovación se paga aparte. */
  pending_intro: number;
  subscription_intro: number;
  /** Cuándo se verificó el RUC con la SUNAT; null si nunca se verificó (cuentas anteriores). */
  ruc_verified_at: string | null;
  /** Estado del RUC según la SUNAT al verificarlo (ACTIVO, …). */
  ruc_status: string | null;
  /** Condición del contribuyente según la SUNAT (HABIDO, NO HABIDO, …). */
  ruc_condition: string | null;
  dpo_name: string;
  dpo_email: string;
  /**
   * Legacy fields kept for database compatibility. The product is Peru-only:
   * SIPDP requires a Peruvian company with RUC, so no foreign-company path is
   * exposed to users.
   */
  entity_type: "peruana" | "extranjera";
  country: string;
  representative_name: string;
  representative_address: string;
  /** Fecha en que terminó el onboarding; null mientras no lo complete. */
  onboarded_at: string | null;
  /** Sitio web o tienda online (vacío si no tiene). */
  website: string;
  /** Enlace al Libro de Reclamaciones virtual (por ejemplo, librodigital.pe). */
  complaints_url: string;
  /** Ventas anuales: micro (hasta 150 UIT), pequena, mediana, grande; vacío si no lo indicó. */
  sales_band: "" | "micro" | "pequena" | "mediana" | "grande";
  /** Cuándo declaró sus herramientas; null si aún no lo hizo. */
  tools_declared_at: string | null;
  /** Cuándo aceptó que sus consultas (anonimizadas) se envíen a un proveedor de IA; null = sin consentimiento. */
  ai_consent_at: string | null;
  /** 1 = no quiere correos no esenciales (resúmenes, avisos de documentos). */
  mail_optout: number;
  /** Cuándo se eliminó la cuenta; la fila queda solo como registro tributario (sin datos personales). */
  deleted_at: string | null;
  /** Último aviso de borrado por cuenta vencida enviado (0 = ninguno, 1/2/3 = etapa). */
  lapsed_notice: number;
  created_at: string;
};

/** Herramienta o proveedor que recibe o aloja datos personales. */
export type Provider = {
  id: string;
  company_id: string;
  category: string;
  name: string;
  /** País donde se guardan o tratan los datos ("Perú", "Estados Unidos", …, "No sé"). */
  country: string;
  is_custom: number;
  purpose: string;
  data: string;
  cookies: string;
  /** Contrato de encargo / DPA: pendiente, firmado o no_aplica. */
  dpa_status: "pendiente" | "firmado" | "no_aplica";
  /** Flujo transfronterizo comunicado a la ANPD: no_aplica, pendiente o comunicado. */
  transfer_status: "no_aplica" | "pendiente" | "comunicado";
  created_at: string;
  updated_at: string;
};

export type EvidenceType = "consentimiento" | "capacitacion" | "revision_accesos" | "prueba_respaldo" | "purga";

/** Registro de evidencia para demostrar cumplimiento ante una fiscalización. */
export type EvidenceRow = {
  id: string;
  company_id: string;
  type: EvidenceType;
  occurred_on: string;
  detail: string;
  reference: string;
  created_at: string;
};

export type User = {
  id: string;
  company_id: string;
  name: string;
  email: string;
  password_hash: string;
  role: string;
  email_verified_at: string | null;
  created_at: string;
};

export type DataBank = {
  id: string;
  company_id: string;
  name: string;
  purpose: string;
  data_categories: string;
  legal_basis: string;
  retention: string;
  recipients: string;
  transfers: string;
  channel: string;
  /** cancelado: la inscripción se canceló ante la ANPD; queda en el expediente pero ya no se trata. */
  status: "borrador" | "registrado" | "cancelado";
  sipdp_code: string | null;
  registered_at: string | null;
  /** Fecha (AAAA-MM-DD) en que la ANPD canceló la inscripción. */
  cancelled_at: string | null;
  /** Número de resolución o trámite de la cancelación. */
  cancel_reference: string | null;
  created_at: string;
  updated_at: string;
};

export type ArcoRequest = {
  id: string;
  company_id: string;
  ticket: string;
  type: "informacion" | "acceso" | "rectificacion" | "cancelacion" | "oposicion";
  channel: string;
  requester_name: string;
  doc_number: string;
  email: string;
  phone: string;
  description: string;
  status: "nuevo" | "en_proceso" | "respondido" | "vencido" | "rechazado";
  received_at: string;
  due_at: string;
  responded_at: string | null;
  response: string | null;
  created_at: string;
};

export type Incident = {
  id: string;
  company_id: string;
  title: string;
  description: string;
  severity: "leve" | "moderado" | "grave";
  detected_at: string;
  due_at: string;
  status: "abierto" | "en_analisis" | "notificado" | "cerrado";
  affected_people: number;
  /**
   * A quiénes alcanzó el incidente, en texto libre (correos, teléfonos o
   * «500 clientes de la campaña de julio»). Sirve como evidencia del art. 34.
   */
  affected_sample: string;
  /** Criterios del art. 34.1 marcados, separados por coma. */
  criteria: string;
  data_categories: string;
  measures: string;
  notified_at: string | null;
  created_at: string;
};

export type DocumentKind =
  | "politica"
  | "consentimiento"
  | "seguridad"
  | "clausulas"
  | "terminos"
  | "cookies"
  | "aviso"
  | "reclamaciones"
  | "encargo"
  | "retencion"
  | "eipd"
  | "trabajadores"
  | "arco"
  | "sectorial";

export type DocumentRow = {
  id: string;
  company_id: string;
  kind: DocumentKind;
  title: string;
  content: string;
  version: number;
  published: number;
  updated_at: string;
  /** Versión de plantilla con la que se generó (null en documentos anteriores al versionado). */
  template_version: number | null;
  /** Huella de empresa, rubro y bancos usados al generar (JSON). */
  built_from: string | null;
  /** Versión que se sirve en la página pública (distinta de `version` si se editó después de publicar). */
  published_version: number | null;
  published_at: string | null;
};

export type DocumentVersionRow = {
  id: string;
  company_id: string;
  document_id: string;
  kind: string;
  version: number;
  title: string;
  content: string;
  template_version: number | null;
  built_from: string | null;
  created_at: string;
  published_at: string | null;
  unpublished_at: string | null;
};

export type Activity = {
  id: string;
  company_id: string;
  kind: string;
  message: string;
  created_at: string;
};

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = process.env.DATOSPRIVADOS_DB ?? path.join(DATA_DIR, "datosprivados.db");

function initSchema(db: DatabaseSync) {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA busy_timeout = 5000;
    PRAGMA synchronous = NORMAL;

    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      ruc TEXT NOT NULL,
      sector TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      plan TEXT NOT NULL DEFAULT 'basico',
      billing_term TEXT NOT NULL DEFAULT 'monthly',
      billing_status TEXT NOT NULL DEFAULT 'active',
      paid_until TEXT,
      last_payment_id TEXT,
      subscription_id TEXT,
      subscription_status TEXT,
      dpo_name TEXT NOT NULL DEFAULT '',
      dpo_email TEXT NOT NULL DEFAULT '',
      entity_type TEXT NOT NULL DEFAULT 'peruana',
      country TEXT NOT NULL DEFAULT 'Perú',
      representative_name TEXT NOT NULL DEFAULT '',
      representative_address TEXT NOT NULL DEFAULT '',
      website TEXT NOT NULL DEFAULT '',
      complaints_url TEXT NOT NULL DEFAULT '',
      sales_band TEXT NOT NULL DEFAULT '',
      tools_declared_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      country TEXT NOT NULL DEFAULT 'No sé',
      is_custom INTEGER NOT NULL DEFAULT 0,
      purpose TEXT NOT NULL DEFAULT '',
      data TEXT NOT NULL DEFAULT '',
      cookies TEXT NOT NULL DEFAULT '',
      dpa_status TEXT NOT NULL DEFAULT 'pendiente',
      transfer_status TEXT NOT NULL DEFAULT 'pendiente',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_providers_company ON providers(company_id);

    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      occurred_on TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      reference TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_evidence_company ON evidence(company_id, type);

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS data_banks (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      purpose TEXT NOT NULL DEFAULT '',
      data_categories TEXT NOT NULL DEFAULT '',
      legal_basis TEXT NOT NULL DEFAULT 'consentimiento',
      retention TEXT NOT NULL DEFAULT '',
      recipients TEXT NOT NULL DEFAULT '',
      transfers TEXT NOT NULL DEFAULT 'no',
      channel TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'borrador',
      sipdp_code TEXT,
      registered_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS arco_requests (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      ticket TEXT NOT NULL,
      type TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'web',
      requester_name TEXT NOT NULL,
      doc_number TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      phone TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'nuevo',
      received_at TEXT NOT NULL,
      due_at TEXT NOT NULL,
      responded_at TEXT,
      response TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      severity TEXT NOT NULL DEFAULT 'moderado',
      detected_at TEXT NOT NULL,
      due_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'abierto',
      affected_people INTEGER NOT NULL DEFAULT 0,
      affected_sample TEXT NOT NULL DEFAULT '',
      criteria TEXT NOT NULL DEFAULT '',
      data_categories TEXT NOT NULL DEFAULT '',
      measures TEXT NOT NULL DEFAULT '',
      notified_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS security_checks (
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      item TEXT NOT NULL,
      done_at TEXT NOT NULL,
      PRIMARY KEY (company_id, item)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1,
      published INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      template_version INTEGER,
      built_from TEXT
    );

    CREATE TABLE IF NOT EXISTS activity (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      plan TEXT NOT NULL,
      term TEXT NOT NULL DEFAULT 'monthly',
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'PEN',
      status TEXT NOT NULL DEFAULT 'pending',
      provider TEXT NOT NULL DEFAULT 'mercadopago',
      preference_id TEXT,
      payment_id TEXT,
      external_reference TEXT,
      subscription_id TEXT,
      paid_at TEXT,
      raw TEXT,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_banks_company ON data_banks(company_id);
    CREATE INDEX IF NOT EXISTS idx_arco_company ON arco_requests(company_id);
    CREATE INDEX IF NOT EXISTS idx_incidents_company ON incidents(company_id);
    CREATE INDEX IF NOT EXISTS idx_documents_company ON documents(company_id);
    CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);
    CREATE INDEX IF NOT EXISTS idx_payments_external ON payments(external_reference);
  `);
}

/**
 * Migraciones incrementales. Se ejecutan también sobre una conexión ya
 * cacheada en `globalThis` (en `next dev` la conexión sobrevive a los recargos
 * en caliente y `initSchema` no vuelve a correr).
 */
const SCHEMA_VERSION = 16;

function migrate(db: DatabaseSync) {
  const companyColumns = db.prepare("PRAGMA table_info(companies)").all() as { name: string }[];
  if (!companyColumns.some((column) => column.name === "onboarded_at")) {
    db.exec("ALTER TABLE companies ADD COLUMN onboarded_at TEXT");
    // Las empresas que ya existían antes del onboarding no deben volver a pasarlo.
    db.exec("UPDATE companies SET onboarded_at = created_at");
  }

  // v3: legacy company columns; kept for database compatibility. The product
  // does not expose a foreign-company path because SIPDP requires a Peruvian RUC.
  const columns = db.prepare("PRAGMA table_info(companies)").all() as { name: string }[];
  const has = (name: string) => columns.some((column) => column.name === name);
  if (!has("entity_type")) {
    db.exec("ALTER TABLE companies ADD COLUMN entity_type TEXT NOT NULL DEFAULT 'peruana'");
  }
  if (!has("country")) {
    db.exec("ALTER TABLE companies ADD COLUMN country TEXT NOT NULL DEFAULT 'Perú'");
  }
  if (!has("representative_name")) {
    db.exec("ALTER TABLE companies ADD COLUMN representative_name TEXT NOT NULL DEFAULT ''");
  }
  if (!has("representative_address")) {
    db.exec("ALTER TABLE companies ADD COLUMN representative_address TEXT NOT NULL DEFAULT ''");
  }

  // v4: criterios del art. 34.1, personas afectadas identificadas y checklist
  // de implementación del Documento de Seguridad.
  const incidentColumns = db.prepare("PRAGMA table_info(incidents)").all() as { name: string }[];
  const hasIncidentColumn = (name: string) =>
    incidentColumns.some((column) => column.name === name);
  if (!hasIncidentColumn("affected_sample")) {
    db.exec("ALTER TABLE incidents ADD COLUMN affected_sample TEXT NOT NULL DEFAULT ''");
  }
  if (!hasIncidentColumn("criteria")) {
    db.exec("ALTER TABLE incidents ADD COLUMN criteria TEXT NOT NULL DEFAULT ''");
  }
  // Los incidentes anteriores ya notificados no tienen criterios declarados:
  // se marcan para que el panel no los muestre como «solo documentar».
  db.exec(
    "UPDATE incidents SET criteria = 'muchas_personas' WHERE criteria = '' AND notified_at IS NOT NULL"
  );
  db.exec(`
    CREATE TABLE IF NOT EXISTS security_checks (
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      item TEXT NOT NULL,
      done_at TEXT NOT NULL,
      PRIMARY KEY (company_id, item)
    );
  `);

  // v6: cambio de marca a DatosPrivados. Las bases creadas con la marca anterior
  // conservan el usuario demo con el correo viejo; se renombra sin tocar la clave.
  db.exec("UPDATE users SET email = 'demo@datosprivados.pe' WHERE email = 'demo@privadope.pe'");

  // v7: cobro del primer mes con MercadoPago. Las cuentas existentes quedan
  // activas; las nuevas se crean en 'pending' hasta que se confirme el pago.
  const billingColumns = db.prepare("PRAGMA table_info(companies)").all() as { name: string }[];
  const hasBilling = (name: string) => billingColumns.some((column) => column.name === name);
  if (!hasBilling("billing_status")) {
    db.exec("ALTER TABLE companies ADD COLUMN billing_status TEXT NOT NULL DEFAULT 'active'");
  }
  if (!hasBilling("paid_until")) {
    db.exec("ALTER TABLE companies ADD COLUMN paid_until TEXT");
  }
  if (!hasBilling("last_payment_id")) {
    db.exec("ALTER TABLE companies ADD COLUMN last_payment_id TEXT");
  }
  // v8: suscripción recurrente (preapproval) de MercadoPago.
  if (!hasBilling("subscription_id")) {
    db.exec("ALTER TABLE companies ADD COLUMN subscription_id TEXT");
  }
  if (!hasBilling("subscription_status")) {
    db.exec("ALTER TABLE companies ADD COLUMN subscription_status TEXT");
  }
  // v9: facturación mensual o anual.
  if (!hasBilling("billing_term")) {
    db.exec("ALTER TABLE companies ADD COLUMN billing_term TEXT NOT NULL DEFAULT 'monthly'");
  }
  const companyExtra = db.prepare("PRAGMA table_info(companies)").all() as { name: string }[];
  const hasCompanyColumn = (name: string) => companyExtra.some((column) => column.name === name);
  if (!hasCompanyColumn("website")) db.exec("ALTER TABLE companies ADD COLUMN website TEXT NOT NULL DEFAULT ''");
  if (!hasCompanyColumn("complaints_url")) db.exec("ALTER TABLE companies ADD COLUMN complaints_url TEXT NOT NULL DEFAULT ''");
  if (!hasCompanyColumn("sales_band")) db.exec("ALTER TABLE companies ADD COLUMN sales_band TEXT NOT NULL DEFAULT ''");
  if (!hasCompanyColumn("tools_declared_at")) db.exec("ALTER TABLE companies ADD COLUMN tools_declared_at TEXT");
  db.exec(`
    CREATE TABLE IF NOT EXISTS providers (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      category TEXT NOT NULL,
      name TEXT NOT NULL,
      country TEXT NOT NULL DEFAULT 'No sé',
      is_custom INTEGER NOT NULL DEFAULT 0,
      purpose TEXT NOT NULL DEFAULT '',
      data TEXT NOT NULL DEFAULT '',
      cookies TEXT NOT NULL DEFAULT '',
      dpa_status TEXT NOT NULL DEFAULT 'pendiente',
      transfer_status TEXT NOT NULL DEFAULT 'pendiente',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_providers_company ON providers(company_id);
    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      occurred_on TEXT NOT NULL,
      detail TEXT NOT NULL DEFAULT '',
      reference TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_evidence_company ON evidence(company_id, type);
  `);
  const documentColumns = db.prepare("PRAGMA table_info(documents)").all() as { name: string }[];
  if (!documentColumns.some((column) => column.name === "template_version")) {
    db.exec("ALTER TABLE documents ADD COLUMN template_version INTEGER");
  }
  if (!documentColumns.some((column) => column.name === "built_from")) {
    db.exec("ALTER TABLE documents ADD COLUMN built_from TEXT");
  }
  const paymentColumns = db.prepare("PRAGMA table_info(payments)").all() as { name: string }[];
  if (!paymentColumns.some((column) => column.name === "subscription_id")) {
    db.exec("ALTER TABLE payments ADD COLUMN subscription_id TEXT");
  }
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_companies_subscription ON companies(subscription_id);
    CREATE INDEX IF NOT EXISTS idx_payments_subscription ON payments(subscription_id);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      plan TEXT NOT NULL,
      term TEXT NOT NULL DEFAULT 'monthly',
      amount REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'PEN',
      status TEXT NOT NULL DEFAULT 'pending',
      provider TEXT NOT NULL DEFAULT 'mercadopago',
      preference_id TEXT,
      payment_id TEXT,
      external_reference TEXT,
      subscription_id TEXT,
      paid_at TEXT,
      raw TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_payments_company ON payments(company_id);
    CREATE INDEX IF NOT EXISTS idx_payments_external ON payments(external_reference);
  `);

  // v10: cambio de plan pendiente de autorización, límites de intentos y
  // índices para las búsquedas por empresa.
  const billingColumnsV10 = db.prepare("PRAGMA table_info(companies)").all() as { name: string }[];
  const hasV10 = (name: string) => billingColumnsV10.some((column) => column.name === name);
  if (!hasV10("pending_subscription_id")) {
    db.exec("ALTER TABLE companies ADD COLUMN pending_subscription_id TEXT");
  }
  if (!hasV10("pending_plan")) {
    db.exec("ALTER TABLE companies ADD COLUMN pending_plan TEXT");
  }
  if (!hasV10("pending_term")) {
    db.exec("ALTER TABLE companies ADD COLUMN pending_term TEXT");
  }
  // v11: monto acordado por suscripción (primer año ≠ renovación) y marca de suscripción de primer año.
  if (!hasV10("pending_amount")) db.exec("ALTER TABLE companies ADD COLUMN pending_amount REAL");
  if (!hasV10("subscription_amount")) db.exec("ALTER TABLE companies ADD COLUMN subscription_amount REAL");
  if (!hasV10("pending_intro")) db.exec("ALTER TABLE companies ADD COLUMN pending_intro INTEGER NOT NULL DEFAULT 0");
  if (!hasV10("subscription_intro")) db.exec("ALTER TABLE companies ADD COLUMN subscription_intro INTEGER NOT NULL DEFAULT 0");
  db.exec(`
    CREATE TABLE IF NOT EXISTS rate_limits (
      key TEXT PRIMARY KEY,
      window_start INTEGER NOT NULL,
      count INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS legal_consents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      company_id TEXT NOT NULL,
      document TEXT NOT NULL,
      version TEXT NOT NULL,
      context TEXT NOT NULL,
      ip TEXT NOT NULL,
      user_agent TEXT NOT NULL DEFAULT '',
      accepted_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_legal_consents_company ON legal_consents(company_id, accepted_at);
    CREATE INDEX IF NOT EXISTS idx_arco_company_status ON arco_requests(company_id, status, due_at);
    CREATE INDEX IF NOT EXISTS idx_arco_company_ticket ON arco_requests(company_id, ticket);
    CREATE INDEX IF NOT EXISTS idx_incidents_company_status ON incidents(company_id, status);
    CREATE INDEX IF NOT EXISTS idx_documents_company_kind ON documents(company_id, kind);
    CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);
    CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(lower(email));
    CREATE INDEX IF NOT EXISTS idx_companies_ruc ON companies(ruc);
  `);

  // v11: verificación del RUC con la SUNAT.
  const rucColumns = db.prepare("PRAGMA table_info(companies)").all() as { name: string }[];
  const hasRucColumn = (name: string) => rucColumns.some((column) => column.name === name);
  if (!hasRucColumn("ruc_verified_at")) db.exec("ALTER TABLE companies ADD COLUMN ruc_verified_at TEXT");
  if (!hasRucColumn("ruc_status")) db.exec("ALTER TABLE companies ADD COLUMN ruc_status TEXT");
  if (!hasRucColumn("ruc_condition")) db.exec("ALTER TABLE companies ADD COLUMN ruc_condition TEXT");

  // v12: Fase 3 — correo transaccional, tareas programadas, uso de IA, historial
  // de documentos, feriados editables y ciclo de vida de la cuenta.
  const hasV12Company = (name: string) =>
    (db.prepare("PRAGMA table_info(companies)").all() as { name: string }[]).some((column) => column.name === name);
  if (!hasV12Company("ai_consent_at")) db.exec("ALTER TABLE companies ADD COLUMN ai_consent_at TEXT");
  if (!hasV12Company("mail_optout")) db.exec("ALTER TABLE companies ADD COLUMN mail_optout INTEGER NOT NULL DEFAULT 0");
  if (!hasV12Company("deleted_at")) db.exec("ALTER TABLE companies ADD COLUMN deleted_at TEXT");
  if (!hasV12Company("lapsed_notice")) db.exec("ALTER TABLE companies ADD COLUMN lapsed_notice INTEGER NOT NULL DEFAULT 0");

  const v12UserColumns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!v12UserColumns.some((column) => column.name === "email_verified_at")) {
    db.exec("ALTER TABLE users ADD COLUMN email_verified_at TEXT");
  }

  const v12DocColumns = db.prepare("PRAGMA table_info(documents)").all() as { name: string }[];
  if (!v12DocColumns.some((column) => column.name === "published_version")) {
    db.exec("ALTER TABLE documents ADD COLUMN published_version INTEGER");
    db.exec("ALTER TABLE documents ADD COLUMN published_at TEXT");
    // Lo que ya estaba publicado queda como la versión publicada actual.
    db.exec("UPDATE documents SET published_version = version, published_at = updated_at WHERE published = 1");
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS email_outbox (
      id TEXT PRIMARY KEY,
      company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
      to_email TEXT NOT NULL,
      template TEXT NOT NULL,
      payload TEXT NOT NULL DEFAULT '{}',
      essential INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      next_attempt_at TEXT NOT NULL,
      error TEXT,
      dedupe_key TEXT UNIQUE,
      created_at TEXT NOT NULL,
      sent_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_outbox_due ON email_outbox(status, next_attempt_at);

    CREATE TABLE IF NOT EXISTS email_suppressions (
      email TEXT PRIMARY KEY,
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS job_runs (
      id TEXT PRIMARY KEY,
      job TEXT NOT NULL,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      ok INTEGER,
      error TEXT,
      detail TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_job_runs_job ON job_runs(job, started_at);

    CREATE TABLE IF NOT EXISTS ai_usage (
      id TEXT PRIMARY KEY,
      company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      feature TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER NOT NULL DEFAULT 0,
      output_tokens INTEGER NOT NULL DEFAULT 0,
      latency_ms INTEGER NOT NULL DEFAULT 0,
      ok INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_usage_company ON ai_usage(company_id, created_at);

    CREATE TABLE IF NOT EXISTS document_versions (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
      document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      version INTEGER NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      template_version INTEGER,
      built_from TEXT,
      created_at TEXT NOT NULL,
      published_at TEXT,
      unpublished_at TEXT,
      UNIQUE (document_id, version)
    );
    CREATE INDEX IF NOT EXISTS idx_doc_versions_company ON document_versions(company_id, kind);

    CREATE TABLE IF NOT EXISTS holidays (
      date TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'calculado'
    );

    CREATE TABLE IF NOT EXISTS auth_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      token_hash TEXT NOT NULL UNIQUE,
      payload TEXT,
      expires_at TEXT NOT NULL,
      used_at TEXT
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      company_id TEXT NOT NULL REFERENCES companies(id),
      payment_id TEXT NOT NULL UNIQUE REFERENCES payments(id),
      status TEXT NOT NULL DEFAULT 'pending',
      doc_type TEXT NOT NULL DEFAULT 'factura',
      buyer_ruc TEXT NOT NULL,
      buyer_name TEXT NOT NULL,
      buyer_address TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL,
      base_amount REAL NOT NULL,
      igv_amount REAL NOT NULL,
      total REAL NOT NULL,
      currency TEXT NOT NULL DEFAULT 'PEN',
      series TEXT,
      number TEXT,
      pdf_url TEXT,
      issued_at TEXT,
      emailed_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status, created_at);
    CREATE INDEX IF NOT EXISTS idx_invoices_company ON invoices(company_id);

    CREATE TABLE IF NOT EXISTS webhook_events (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      type TEXT NOT NULL,
      data_id TEXT NOT NULL,
      request_id TEXT,
      payload TEXT,
      received_at TEXT NOT NULL,
      processed_at TEXT,
      outcome TEXT,
      error TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_webhook_events_data ON webhook_events(provider, data_id);
  `);

  // Un cobro de MercadoPago se registra una sola vez: la base lo garantiza, no solo el código.
  try {
    db.exec("CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_payment_id ON payments(payment_id) WHERE payment_id IS NOT NULL");
  } catch (error) {
    console.error("[db] Hay cobros duplicados; no se pudo crear el índice único de payments.payment_id:", error);
  }

  // Serie y número de un comprobante no se repiten; dos operadores a la vez no pueden emitir el mismo.
  try {
    db.exec(
      "CREATE UNIQUE INDEX IF NOT EXISTS uq_invoices_number ON invoices(series, number) WHERE series IS NOT NULL AND number IS NOT NULL"
    );
  } catch (error) {
    console.error("[db] Hay comprobantes con la misma serie y número; revísalos antes de emitir:", error);
  }

  // Historial inicial: cada documento existente queda como su versión vigente.
  db.exec(`
    INSERT OR IGNORE INTO document_versions
      (id, company_id, document_id, kind, version, title, content, template_version, built_from, created_at, published_at)
    SELECT lower(hex(randomblob(16))), company_id, id, kind, version, title, content, template_version, built_from,
           updated_at, CASE WHEN published = 1 THEN updated_at END
    FROM documents
  `);
  // v14: índices de las consultas que se repiten en cada carga del panel.
  // `activity` se lee por empresa y fecha (portada del panel), `rate_limits` se
  // poda por ventana cada vez que se abre una nueva y `users` se recorre por
  // empresa al exportar y al eliminar la cuenta: sin índice, las tres recorrían
  // la tabla entera.
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_activity_company ON activity(company_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start);
    CREATE INDEX IF NOT EXISTS idx_users_company ON users(company_id);
  `);

  // v15: desafíos del formulario ARCO público (prueba de trabajo). Se guardan solo
  // las últimas 24 h: cada `salt` sirve una sola vez.
  db.exec(`
    CREATE TABLE IF NOT EXISTS pow_challenges (
      salt TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      used_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_pow_challenges_created ON pow_challenges(created_at);
  `);

  // v16: cancelación de la inscripción de un banco ante la ANPD. El banco no se
  // borra: queda como constancia de que existió y de cuándo dejó de tratarse.
  const bankColumns = db.prepare("PRAGMA table_info(data_banks)").all() as { name: string }[];
  const hasBankColumn = (name: string) => bankColumns.some((column) => column.name === name);
  if (!hasBankColumn("cancelled_at")) db.exec("ALTER TABLE data_banks ADD COLUMN cancelled_at TEXT");
  if (!hasBankColumn("cancel_reference")) db.exec("ALTER TABLE data_banks ADD COLUMN cancel_reference TEXT");

  seedHolidays(db);
}

declare global {
  var __datosprivadosDb: DatabaseSync | undefined;
  var __datosprivadosSchemaVersion: number | undefined;
}

export function getDb(): DatabaseSync {
  if (globalThis.__datosprivadosDb) {
    if (globalThis.__datosprivadosSchemaVersion !== SCHEMA_VERSION) {
      migrate(globalThis.__datosprivadosDb);
      seedIfEmpty(globalThis.__datosprivadosDb);
      globalThis.__datosprivadosSchemaVersion = SCHEMA_VERSION;
    }
    return globalThis.__datosprivadosDb;
  }

  fs.mkdirSync(DATA_DIR, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  initSchema(db);
  migrate(db);
  globalThis.__datosprivadosSchemaVersion = SCHEMA_VERSION;
  seedIfEmpty(db);
  globalThis.__datosprivadosDb = db;
  return db;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(): string {
  return crypto.randomUUID();
}

/* -------------------------------------------------------------------------- */
/*  Seed                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Crea o refresca la carpeta de documentos del negocio de demostración.
 * Se ejecuta en cada arranque para que el demo enseñe las plantillas vigentes.
 */
function ensureDemoProviders(db: DatabaseSync, company: Company) {
  if (company.tools_declared_at) return;
  const now = nowIso();
  const demo: Array<[string, string, string, string, string, string, string, string]> = [
    // categoría, nombre, país, propósito, cookies, contrato, transferencia, datos
    ["analitica", "Google Analytics", "Estados Unidos", "Medición agregada del uso de la web", "_ga, _ga_* (analítica, hasta 2 años)", "pendiente", "pendiente", "IP, dispositivo y páginas visitadas"],
    ["publicidad", "Facebook / Instagram Ads (Meta Pixel)", "Estados Unidos", "Publicidad dirigida y medición de campañas", "_fbp, _fbc (publicidad, hasta 90 días)", "pendiente", "pendiente", "Identificadores de cookies y eventos de navegación"],
    ["pagos", "Mercado Pago", "Argentina", "Cobro de ventas", "Cookies de la pasarela en la pantalla de pago", "firmado", "pendiente", "Nombre, correo e importes"],
    ["correo", "Gmail / Google Workspace", "Estados Unidos", "Correo y documentos", "", "firmado", "comunicado", "Nombre, correo y mensajes"],
    ["mensajeria", "WhatsApp / WhatsApp Business", "Estados Unidos", "Atención y pedidos", "", "pendiente", "pendiente", "Nombre, teléfono y mensajes"],
    ["servicios", "Estudio contable externo", "Perú", "Contabilidad y planilla", "", "firmado", "no_aplica", "Datos de clientes y trabajadores"],
    ["delivery", "Olva Courier", "Perú", "Entrega de pedidos", "", "pendiente", "no_aplica", "Nombre, teléfono y dirección de entrega"],
  ];
  const insert = db.prepare(
    `INSERT INTO providers (id, company_id, category, name, country, is_custom, purpose, data, cookies, dpa_status, transfer_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const [category, name, country, purpose, cookies, dpa, transfer, data] of demo) {
    insert.run(newId(), company.id, category, name, country, purpose, data, cookies, dpa, transfer, now, now);
  }
  db.prepare("UPDATE companies SET tools_declared_at = ?, website = ?, sales_band = ? WHERE id = ?").run(
    now,
    "https://casaverde.pe",
    "pequena",
    company.id
  );
}

function ensureDemoDocuments(db: DatabaseSync, initialCompany: Company, banks: DataBank[]) {
  ensureDemoProviders(db, initialCompany);
  const company = db.prepare("SELECT * FROM companies WHERE id = ?").get(initialCompany.id) as unknown as Company;
  const providers = db
    .prepare("SELECT * FROM providers WHERE company_id = ? ORDER BY category, name COLLATE NOCASE")
    .all(company.id) as unknown as Provider[];
  const catalogue: Array<{
    kind: DocumentKind;
    title: string;
    build: (c: Company, b: DataBank[], p: Provider[]) => string;
    published: number;
  }> = [
    { kind: "politica", title: "Política de Privacidad", build: buildPrivacyPolicy, published: 1 },
    { kind: "terminos", title: "Términos y Condiciones", build: buildTermsOfService, published: 0 },
    { kind: "cookies", title: "Política de Cookies", build: (c) => buildCookiePolicy(c), published: 0 },
    { kind: "aviso", title: "Avisos de privacidad cortos", build: (c) => buildShortNotices(c), published: 0 },
    { kind: "reclamaciones", title: "Libro de Reclamaciones", build: (c) => buildComplaintBook(c), published: 0 },
    { kind: "consentimiento", title: "Textos de consentimiento", build: (c) => buildConsentTexts(c), published: 0 },
    { kind: "seguridad", title: "Documento de Seguridad", build: buildSecurityDocument, published: 0 },
    { kind: "retencion", title: "Política de retención y eliminación", build: buildRetentionPolicy, published: 0 },
    { kind: "encargo", title: "Encargo de tratamiento y transferencias", build: buildProcessingAgreement, published: 0 },
    { kind: "clausulas", title: "Contratos, Confidencialidad y Cartel CCTV", build: (c) => buildInternalClauses(c), published: 0 },
    { kind: "eipd", title: "Evaluación de impacto (EIPD)", build: buildImpactAssessment, published: 0 },
    { kind: "trabajadores", title: "Aviso y consentimiento para trabajadores", build: (c) => buildWorkerNotice(c), published: 0 },
    { kind: "arco", title: "Procedimiento interno de derechos ARCO", build: (c) => buildArcoProcedure(c), published: 0 },
    { kind: "sectorial", title: "Protocolo de tu rubro", build: buildSectorProtocol, published: 0 },
  ];

  for (const doc of catalogue) {
    const content = doc.build(company, banks, providers);
    const builtFrom = serializeBuiltFrom(fingerprint(doc.kind, company, banks, providers));
    const templateVersion = TEMPLATE_VERSIONS[doc.kind];
    const existing = db
      .prepare("SELECT id FROM documents WHERE company_id = ? AND kind = ?")
      .get(company.id, doc.kind) as { id: string } | undefined;

    if (existing) {
      db.prepare(
        "UPDATE documents SET title = ?, content = ?, updated_at = ?, template_version = ?, built_from = ? WHERE id = ?"
      ).run(doc.title, content, nowIso(), templateVersion, builtFrom, existing.id);
    } else {
      db.prepare(
        `INSERT INTO documents (id, company_id, kind, title, content, version, published, updated_at, template_version, built_from)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?)`
      ).run(newId(), company.id, doc.kind, doc.title, content, doc.published, nowIso(), templateVersion, builtFrom);
    }
  }
}

function seedIfEmpty(db: DatabaseSync) {
  const row = db.prepare("SELECT COUNT(*) AS n FROM companies").get() as { n: number };
  if (row.n > 0) {
    // La cuenta de demostración no pasa por el cobro.
    db.exec(
      "UPDATE companies SET billing_status = 'demo', subscription_status = 'demo' WHERE id = 'casa-verde'"
    );
    const demoCompany = db
      .prepare("SELECT * FROM companies WHERE id = 'casa-verde'")
      .get() as unknown as Company | undefined;
    if (demoCompany) {
      const demoBanks = db
        .prepare("SELECT * FROM data_banks WHERE company_id = 'casa-verde'")
        .all() as unknown as DataBank[];
      ensureDemoDocuments(db, demoCompany, demoBanks);
    }
    return;
  }

  const companyId = "casa-verde";
  const createdAt = nowIso();

  db.prepare(
    `INSERT INTO companies (id, name, ruc, sector, slug, email, phone, address, plan, billing_status, subscription_status, dpo_name, dpo_email, onboarded_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'demo', 'demo', ?, ?, ?, ?)`
  ).run(
    companyId,
    "Casa Verde Perú S.A.C.",
    "20604567891",
    "Tienda online / e-commerce",
    "casa-verde",
    "hola@casaverde.pe",
    "+51 987 654 321",
    "Av. La Mar 1234, Miraflores, Lima",
    "pro",
    "Lucía Rojas",
    "privacidad@casaverde.pe",
    createdAt,
    createdAt
  );

  db.prepare(
    `INSERT INTO users (id, company_id, name, email, password_hash, role, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "demo-user",
    companyId,
    "Lucía Rojas",
    "demo@datosprivados.pe",
    hashPassword("demo1234"),
    "admin",
    createdAt
  );

  const banks: Array<[string, string, string, string, string, string, string, string, string, string | null, string | null]> = [
    [
      "banco-clientes",
      "Clientes de la tienda online",
      "Gestión de pedidos, entregas, facturación y atención posventa.",
      "Nombres y apellidos, DNI, dirección de entrega, correo, teléfono, historial de compras, datos de pago tokenizados.",
      "consentimiento",
      "5 años desde la última compra (obligaciones tributarias).",
      "Courier Olva, pasarela de pagos Culqi, estudio contable.",
      "no",
      "registrado",
      "SIPDP-2026-004512",
      "2026-03-12T15:20:00.000Z",
    ],
    [
      "banco-empleados",
      "Colaboradores y postulantes",
      "Gestión de planilla, beneficios, evaluaciones y procesos de selección.",
      "Nombres, DNI, fecha de nacimiento, domicilio, datos bancarios, datos de salud (descansos médicos), CV.",
      "obligacion_legal",
      "5 años después del cese (normativa laboral y tributaria).",
      "Estudio contable, entidad bancaria, aseguradora de salud.",
      "no",
      "registrado",
      "SIPDP-2026-004513",
      "2026-03-12T15:22:00.000Z",
    ],
    [
      "banco-marketing",
      "Suscriptores de newsletter y WhatsApp",
      "Envío de promociones, novedades y contenido sobre vida sostenible.",
      "Nombre, correo electrónico, número de WhatsApp, preferencias de compra.",
      "consentimiento",
      "Hasta que el titular revoque su consentimiento.",
      "Proveedor de correo (Mailchimp), WhatsApp Business API.",
      "si",
      "registrado",
      "SIPDP-2026-004514",
      "2026-03-12T15:25:00.000Z",
    ],
    [
      "banco-proveedores",
      "Proveedores y aliados",
      "Selección, contratación y pago de proveedores.",
      "Razón social, RUC, datos de contacto, datos bancarios, contratos.",
      "ejecucion_contrato",
      "5 años desde el fin de la relación comercial.",
      "Área contable, entidades financieras.",
      "no",
      "borrador",
      null,
      null,
    ],
  ];

  for (const b of banks) {
    db.prepare(
      `INSERT INTO data_banks (id, company_id, name, purpose, data_categories, legal_basis, retention, recipients, transfers, channel, status, sipdp_code, registered_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'web', ?, ?, ?, ?, ?)`
    ).run(b[0], companyId, b[1], b[2], b[3], b[4], b[5], b[6], b[7], b[8], b[9], b[10], createdAt, createdAt);
  }

  const arco: Array<[string, string, string, string, string, string, string, string, string]> = [
    [
      "arco-1",
      "ARCO-2026-0012",
      "acceso",
      "María Fernanda Quispe",
      "45871236",
      "mf.quispe@gmail.com",
      "Solicito copia de los datos personales que mantienen sobre mí, incluyendo historial de pedidos y comunicaciones.",
      "nuevo",
      "2026-10-26",
    ],
    [
      "arco-2",
      "ARCO-2026-0011",
      "cancelacion",
      "Jorge Luis Ramos",
      "09876543",
      "jramos@outlook.com",
      "Pido la cancelación de mi número de WhatsApp de sus bases de marketing. Ya no deseo recibir promociones.",
      "en_proceso",
      "2026-09-26",
    ],
    [
      "arco-3",
      "ARCO-2026-0010",
      "rectificacion",
      "Ana Paula Torres",
      "74125896",
      "aptorres@yahoo.com",
      "Mi dirección de entrega figura mal en su sistema. Solicito corregirla a Jr. Los Álamos 456, Surco.",
      "respondido",
      "2026-10-13",
    ],
  ];

  for (const a of arco) {
    const due = addBusinessDays(a[8], arcoLegalBusinessDays(a[2]));
    db.prepare(
      `INSERT INTO arco_requests (id, company_id, ticket, type, channel, requester_name, doc_number, email, description, status, received_at, due_at, responded_at, response, created_at)
       VALUES (?, ?, ?, ?, 'web', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      a[0],
      companyId,
      a[1],
      a[2],
      a[3],
      a[4],
      a[5],
      a[6],
      a[7],
      a[8],
      due,
      a[7] === "respondido" ? "2026-10-20T16:00:00.000Z" : null,
      a[7] === "respondido"
        ? "Estimada Ana Paula, hemos corregido su dirección de entrega en nuestro sistema y confirmamos la actualización por este medio."
        : null,
      createdAt
    );
  }

  db.prepare(
    `INSERT INTO incidents (id, company_id, title, description, severity, detected_at, due_at, status, affected_people, affected_sample, criteria, data_categories, measures, notified_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    "inc-1",
    companyId,
    "Envío masivo con copia oculta mal configurada",
    "Un correo de campaña salió con las direcciones de 38 suscriptores visibles en el campo Para.",
    "moderado",
    "2026-09-18T14:10:00.000Z",
    "2026-09-20T14:10:00.000Z",
    "cerrado",
    38,
    "38 suscriptores de la campaña de julio (correos visibles en el campo «Para»).",
    "muchas_personas",
    "Correo electrónico, nombre",
    "Se envió corrección a los suscriptores, se configuró el envío con copia oculta obligatoria y se capacitó al equipo.",
    "2026-09-19T10:30:00.000Z",
    createdAt
  );

  db.prepare(
    `INSERT INTO activity (id, company_id, kind, message, created_at) VALUES (?, ?, ?, ?, ?)`
  ).run(
    "act-1",
    companyId,
    "banco",
    "Registraste el banco de datos «Clientes de la tienda online» en el SIPDP.",
    "2026-10-24T11:00:00.000Z"
  );

  db.prepare(
    `INSERT INTO activity (id, company_id, kind, message, created_at) VALUES (?, ?, ?, ?, ?)`
  ).run(
    "act-2",
    companyId,
    "arco",
    "Nueva solicitud ARCO recibida: ARCO-2026-0012 (Acceso).",
    "2026-10-26T09:12:00.000Z"
  );

  const seedCompany = db
    .prepare("SELECT * FROM companies WHERE id = ?")
    .get(companyId) as unknown as Company;
  const seedBanks = db
    .prepare("SELECT * FROM data_banks WHERE company_id = ?")
    .all(companyId) as unknown as DataBank[];

  ensureDemoDocuments(db, seedCompany, seedBanks);

  db.prepare(
    `INSERT INTO activity (id, company_id, kind, message, created_at) VALUES (?, ?, ?, ?, ?)`
  ).run(
    "act-3",
    companyId,
    "documento",
    "Publicaste tu Política de Privacidad (v1).",
    "2026-10-22T10:05:00.000Z"
  );
}

/* -------------------------------------------------------------------------- */
/*  Utilidades compartidas por el seed                                        */
/* -------------------------------------------------------------------------- */

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  if (candidate.length !== expected.length) return false;
  return crypto.timingSafeEqual(candidate, expected);
}

/**
 * Plazos legales en días hábiles según el Reglamento de la Ley 29733 (DS 016-2024-JUS):
 * - Derecho de Acceso: 20 días hábiles
 * - Derechos de Rectificación, Cancelación y Oposición: 10 días hábiles
 */
/**
 * Plazos legales en días hábiles (DS 016-2024-JUS): información 8, acceso 20,
 * rectificación, cancelación y oposición 10.
 */
export function arcoLegalBusinessDays(type: string): number {
  if (type === "informacion") return 8;
  return type === "acceso" ? 20 : 10;
}

/**
 * Suma días hábiles (lunes a viernes) omitiendo feriados nacionales del Perú.
 * No considera feriados regionales ni suspensiones decretadas a última hora:
 * el estudio jurídico debe mantener la lista actualizada.
 */
export function addBusinessDays(startDate: string, days: number): string {
  const cursor = new Date(`${startDate}T12:00:00-05:00`);
  let added = 0;
  while (added < days) {
    cursor.setDate(cursor.getDate() + 1);
    if (isBusinessDay(cursor)) added += 1;
  }
  return toIsoDate(cursor);
}

const limaDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Lima",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function toIsoDate(d: Date): string {
  return limaDate.format(d);
}

function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const FIXED_HOLIDAYS: Array<[string, string]> = [
  ["01-01", "Año Nuevo"],
  ["05-01", "Día del Trabajo"],
  ["06-07", "Batalla de Arica y Día de la Bandera"],
  ["06-29", "San Pedro y San Pablo"],
  ["07-23", "Día de la Fuerza Aérea del Perú"],
  ["07-28", "Fiestas Patrias"],
  ["07-29", "Fiestas Patrias"],
  ["08-06", "Batalla de Junín"],
  ["08-30", "Santa Rosa de Lima"],
  ["10-08", "Combate de Angamos"],
  ["11-01", "Todos los Santos"],
  ["12-08", "Inmaculada Concepción"],
  ["12-09", "Batalla de Ayacucho"],
  ["12-25", "Navidad"],
];

/** Feriados nacionales calculados por regla (fijos + Semana Santa). Es la fuente de las filas sembradas. */
export function calculatedHolidays(year: number): Array<{ date: string; name: string }> {
  const easter = easterSunday(year);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const shift = (d: Date, n: number) => {
    const copy = new Date(d);
    copy.setUTCDate(copy.getUTCDate() + n);
    return copy;
  };
  return [
    ...FIXED_HOLIDAYS.map(([md, name]) => ({ date: `${year}-${md}`, name })),
    { date: fmt(shift(easter, -3)), name: "Jueves Santo" },
    { date: fmt(shift(easter, -2)), name: "Viernes Santo" },
  ].sort((a, b) => a.date.localeCompare(b.date));
}

const SEEDED_YEARS_FROM = 2025;
const SEEDED_YEARS_TO = 2032;

/** Siembra los años que aún no tienen filas; no pisa lo que un administrador haya editado. */
export function seedHolidays(db: DatabaseSync) {
  const has = db.prepare("SELECT 1 FROM holidays WHERE date LIKE ? LIMIT 1");
  const insert = db.prepare("INSERT OR IGNORE INTO holidays (date, name, source) VALUES (?, ?, 'calculado')");
  for (let year = SEEDED_YEARS_FROM; year <= SEEDED_YEARS_TO; year += 1) {
    if (has.get(`${year}-%`)) continue;
    for (const holiday of calculatedHolidays(year)) insert.run(holiday.date, holiday.name);
  }
}

/**
 * Reafirma la cuenta de demostración (tarea `demo-reset`).
 *
 * La demo es pública (`/demo` entra sin contraseña), comparte la base con los
 * clientes reales y no debe generar correos, cobros ni uso de IA. Si un fallo
 * dejara residuos, esto los borra y devuelve el contenido de ejemplo a su sitio.
 * No toca pagos: si apareciera uno, se informa para que lo revise una persona
 * (borrarlo podría romper la contabilidad y los comprobantes).
 */
/**
 * La demo se sembró con fechas fijas (septiembre y octubre de 2026), así que envejecía:
 * cada semana más solicitudes vencidas y alertas que no tocaban. Esto corre sus fechas
 * para que la solicitud más reciente siempre tenga 4 días (como el día en que se sembró)
 * y recalcula los plazos con los feriados. Si ya está al día no hace nada.
 */
export function refreshDemoDates(now = new Date()): number {
  const db = getDb();
  const latest = db
    .prepare("SELECT MAX(received_at) AS d FROM arco_requests WHERE company_id = 'casa-verde'")
    .get() as { d: string | null };
  if (!latest.d) return 0;
  const today = new Date(now.toLocaleString("en-US", { timeZone: "America/Lima" }));
  const target = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() - 4));
  const delta = Math.round((target.getTime() - new Date(`${latest.d.slice(0, 10)}T00:00:00Z`).getTime()) / 86_400_000);
  if (delta <= 0) return 0;

  const shift = (column: string) => `${column} = CASE WHEN ${column} IS NULL THEN NULL WHEN length(${column}) = 10 THEN date(${column}, '+${delta} days') ELSE strftime('%Y-%m-%dT%H:%M:%fZ', ${column}, '+${delta} days') END`;
  db.exec("BEGIN");
  try {
    db.exec(`UPDATE arco_requests SET ${shift("received_at")}, ${shift("responded_at")}, ${shift("created_at")} WHERE company_id = 'casa-verde'`);
    const rows = db.prepare("SELECT id, type, received_at FROM arco_requests WHERE company_id = 'casa-verde'").all() as { id: string; type: string; received_at: string }[];
    for (const row of rows) {
      db.prepare("UPDATE arco_requests SET due_at = ? WHERE id = ?").run(addBusinessDays(row.received_at.slice(0, 10), arcoLegalBusinessDays(row.type)), row.id);
    }
    db.exec(`UPDATE incidents SET ${shift("detected_at")}, ${shift("due_at")}, ${shift("notified_at")}, ${shift("created_at")} WHERE company_id = 'casa-verde'`);
    db.exec(`UPDATE activity SET ${shift("created_at")} WHERE company_id = 'casa-verde'`);
    db.exec(`UPDATE documents SET ${shift("published_at")} WHERE company_id = 'casa-verde'`);
    // Nada se cambió después de inscribir: así no aparece la alerta de «actualiza la ficha».
    db.exec("UPDATE data_banks SET updated_at = COALESCE(registered_at, updated_at) WHERE company_id = 'casa-verde'");
    db.exec(
      "UPDATE providers SET updated_at = (SELECT MIN(registered_at) FROM data_banks WHERE company_id = 'casa-verde' AND registered_at IS NOT NULL) WHERE company_id = 'casa-verde' AND EXISTS (SELECT 1 FROM data_banks WHERE company_id = 'casa-verde' AND registered_at IS NOT NULL)"
    );
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
  return delta;
}

export function resetDemoCompany(): { found: boolean; outbox: number; aiUsage: number; payments: number; documents: number } {
  const db = getDb();
  const demo = db.prepare("SELECT id FROM companies WHERE id = 'casa-verde'").get() as { id: string } | undefined;
  if (!demo) return { found: false, outbox: 0, aiUsage: 0, payments: 0, documents: 0 };

  db.prepare(
    `UPDATE companies SET billing_status = 'demo', subscription_status = 'demo', plan = 'pro',
       paid_until = NULL, mail_optout = 1, ai_consent_at = NULL, deleted_at = NULL,
       pending_subscription_id = NULL, pending_plan = NULL, pending_term = NULL,
       pending_amount = NULL, subscription_amount = NULL, pending_intro = 0, subscription_intro = 0
     WHERE id = 'casa-verde'`
  ).run();

  const outbox = Number(db.prepare("DELETE FROM email_outbox WHERE company_id = 'casa-verde'").run().changes);
  const aiUsage = Number(db.prepare("DELETE FROM ai_usage WHERE company_id = 'casa-verde'").run().changes);
  const payments = (db.prepare("SELECT COUNT(*) AS n FROM payments WHERE company_id = 'casa-verde'").get() as { n: number }).n;

  refreshDemoDates();
  const company = db.prepare("SELECT * FROM companies WHERE id = 'casa-verde'").get() as unknown as Company;
  const banks = db.prepare("SELECT * FROM data_banks WHERE company_id = 'casa-verde'").all() as unknown as DataBank[];
  ensureDemoDocuments(db, company, banks);
  const documents = (db.prepare("SELECT COUNT(*) AS n FROM documents WHERE company_id = 'casa-verde'").get() as { n: number }).n;

  return { found: true, outbox, aiUsage, payments, documents };
}

/** Feriados del año: de la tabla `holidays`; si el año no está cargado, calculados por regla. */
function peruHolidays(year: number): Set<string> {
  const rows = getDb().prepare("SELECT date FROM holidays WHERE date LIKE ?").all(`${year}-%`) as { date: string }[];
  if (rows.length) return new Set(rows.map((row) => row.date));
  return new Set(calculatedHolidays(year).map((holiday) => holiday.date));
}

export type Holiday = { date: string; name: string; source: string };

/**
 * Feriados cargados, por fecha. Sin año, todos (para la pantalla del operador);
 * con año, los de ese año (los plazos solo miran el año en curso).
 */
export function listHolidays(year?: number): Holiday[] {
  const db = getDb();
  const rows = year
    ? db.prepare("SELECT date, name, source FROM holidays WHERE date LIKE ? ORDER BY date").all(`${year}-%`)
    : db.prepare("SELECT date, name, source FROM holidays ORDER BY date").all();
  return rows as unknown as Holiday[];
}

/** Alta o corrección de un feriado (decreto supremo que declara un día no laborable). */
export function setHoliday(date: string, name: string, source = "decreto") {
  getDb()
    .prepare(
      "INSERT INTO holidays (date, name, source) VALUES (?, ?, ?) ON CONFLICT(date) DO UPDATE SET name = excluded.name, source = excluded.source"
    )
    .run(date, name, source);
}

export function removeHoliday(date: string) {
  getDb().prepare("DELETE FROM holidays WHERE date = ?").run(date);
}

function isBusinessDay(d: Date): boolean {
  const day = d.getDay();
  if (day === 0 || day === 6) return false;
  const iso = toIsoDate(d);
  return !peruHolidays(Number(iso.slice(0, 4))).has(iso);
}

export function businessDaysBetween(fromIso: string, toIso: string): number {
  const start = new Date(`${fromIso}T12:00:00-05:00`);
  const end = new Date(`${toIso}T12:00:00-05:00`);
  let count = 0;
  const cursor = new Date(start);
  while (cursor < end) {
    cursor.setDate(cursor.getDate() + 1);
    if (isBusinessDay(cursor)) count += 1;
  }
  return count;
}
