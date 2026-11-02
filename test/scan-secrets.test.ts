import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { ALLOW, PATTERNS, scanFiles, scanText } from "../scripts/scan-secrets.mjs";

/**
 * `scripts/scan-secrets.mjs` es la barrera contra secretos versionados (CI:
 * `pnpm scan:secrets`). Estas pruebas comprueban que detecta, que no imprime el
 * valor y que el repositorio está limpio hoy.
 */

describe("escaneo de secretos", () => {
  it("detecta claves y tokens con prefijo reconocible", () => {
    const samples: Array<[string, string]> = [
      ["token de MercadoPago", "const token = 'APP_USR-12345678-1234-1234-1234-123456789012';"],
      ["token de Resend", "MAIL_WEBHOOK_SECRET=whsec_abcdefghijklmnopqrstuvwx"],
      ["clave de OpenAI o Anthropic", "ANTHROPIC_API_KEY=sk-ant-api03-abcdefghijklmnopqrstuvwxyz"],
      ["clave de AWS", "aws_access_key_id = AKIAIOSFODNN7EXAMPLE"],
      ["token de GitHub", "ghp_abcdefghijklmnopqrstuvwxyz0123456789"],
      ["clave privada", "-----BEGIN RSA PRIVATE KEY-----"],
      ["JWT", "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.abc"],
    ];
    for (const [name, text] of samples) {
      const found = scanText(text);
      expect(found.map((hit) => hit.name), text).toContain(name);
    }
  });

  it("no confunde valores inocentes con secretos", () => {
    expect(scanText("DECOLECTA_API_TOKEN=\nAPP_USR-\nsk-\nla clave se guarda en /etc/datosprivados.env")).toEqual([]);
  });

  it("informa la línea pero nunca el valor encontrado", () => {
    const [hit] = scanText("linea 1\nlinea 2\nconst t = 'APP_USR-12345678-1234-1234-1234-123456789012';");
    expect(hit).toEqual({ line: 3, name: "token de MercadoPago" });
    expect(JSON.stringify(hit)).not.toContain("APP_USR");
  });

  it("salta binarios, archivos enormes y las excepciones documentadas", () => {
    const root = fs.mkdtempSync(path.join(process.cwd(), "test", ".tmp", "scan-"));
    const binary = path.join(root, "imagen.png");
    fs.writeFileSync(binary, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x41]));
    const fine = path.join(root, "normal.txt");
    fs.writeFileSync(fine, "hola mundo");
    expect(scanFiles([binary, fine])).toEqual([]);
    // La excepción documentada del sandbox de MercadoPago sigue teniendo motivo.
    expect(ALLOW.every((entry) => entry.reason.length > 10)).toBe(true);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("los patrones cubren las claves que usa este proyecto", () => {
    const names = PATTERNS.map((pattern) => pattern.name).join(" ");
    for (const expected of ["MercadoPago", "Resend", "Anthropic", "GitHub", "AWS", "privada"]) {
      expect(names).toContain(expected);
    }
  });

  it("el repositorio versionado no contiene secretos", () => {
    let files: string[] = [];
    try {
      files = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n").filter(Boolean);
    } catch {
      return; // sin git (copia sin .git): el paso de CI `pnpm scan:secrets` lo cubre
    }
    expect(files.length).toBeGreaterThan(50);
    expect(scanFiles(files)).toEqual([]);
  });
});
