import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * La plantilla de nginx es la única barrera de red del despliegue: límites por IP
 * en las rutas caras, IP real detrás de Cloudflare y origen cerrado a todo lo que
 * no venga del borde. Estas pruebas evitan que una edición future borre una línea
 * sin que nadie lo note.
 */

const template = fs.readFileSync(path.join(process.cwd(), "deploy", "nginx-production.conf"), "utf8");

describe("plantilla nginx de producción", () => {
  it("define zonas de límite y responde 429", () => {
    expect(template).toMatch(/limit_req_zone\s+\$binary_remote_addr\s+zone=auth:/);
    expect(template).toMatch(/limit_req_zone\s+\$binary_remote_addr\s+zone=forms:/);
    expect(template).toMatch(/limit_req_zone\s+\$binary_remote_addr\s+zone=api:/);
    expect(template).toContain("limit_req_status 429");
  });

  it("aplica el límite a las rutas que cuestan o guardan datos", () => {
    expect(template).toMatch(/location ~ \^\/\(login\|registro\|restablecer\|olvide\)[\s\S]{0,120}limit_req zone=auth/);
    expect(template).toMatch(/location \/solicitud\/[\s\S]{0,120}limit_req zone=forms/);
    expect(template).toMatch(/location \/api\/[\s\S]{0,160}limit_req zone=api/);
  });

  it("restaura la IP real de Cloudflare y no confía en otro par", () => {
    const cloudflareRanges = template.match(/set_real_ip_from\s+\S+;/g) ?? [];
    expect(cloudflareRanges.length).toBeGreaterThanOrEqual(20); // IPv4 + IPv6
    expect(cloudflareRanges.join(" ")).toContain("173.245.48.0/20");
    expect(cloudflareRanges.join(" ")).toContain("2606:4700::/32");
    expect(template).toContain("real_ip_header CF-Connecting-IP");
  });

  it("cierra el origen a quien no venga del borde", () => {
    // `$realip_remote_addr` es el par antes de la reescritura: con $remote_addr
    // el control sería inútil porque ya contendría la IP del cliente.
    expect(template).toContain("geo $realip_remote_addr $from_cloudflare");
    expect(template).toMatch(/if \(\$from_cloudflare = 0\) \{ return 403; \}/);
    expect(template).toMatch(/geo \$realip_remote_addr \$from_cloudflare \{[\s\S]*127\.0\.0\.1\/32 1;/);
  });

  it("mantiene los ajustes básicos de exposición", () => {
    expect(template).toContain("server_tokens off");
    expect(template).toContain("client_max_body_size 1m");
    expect(template).toContain("proxy_set_header X-Real-IP $remote_addr");
    expect(template).toContain("proxy_set_header X-Forwarded-Proto $forwarded_proto");
  });
});
