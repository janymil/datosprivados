import type { LegalChange } from "./db";

/**
 * Envía a GitHub un cambio legal aprobado (repository_dispatch). El flujo
 * .github/workflows/legal-change.yml comprueba que la rama siga en el commit
 * aprobado, valida, prueba y fusiona. El token (GITHUB_DISPATCH_TOKEN) es de
 * grano fino, solo para este repositorio; lo crea el fundador.
 */
export async function dispatchLegalChange(
  change: Pick<LegalChange, "id" | "branch" | "head_sha">,
  fetchImpl: typeof fetch = fetch
): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) return { ok: false, error: "falta GITHUB_DISPATCH_TOKEN" };
  const repo = process.env.GITHUB_REPOSITORY || "janymil/datosprivados";
  try {
    const response = await fetchImpl(`https://api.github.com/repos/${repo}/dispatches`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        accept: "application/vnd.github+json",
        "content-type": "application/json",
        "x-github-api-version": "2022-11-28",
      },
      body: JSON.stringify({
        event_type: "legal-change-approved",
        client_payload: { id: change.id, branch: change.branch, head_sha: change.head_sha },
      }),
    });
    if (response.status === 204) return { ok: true };
    const text = (await response.text().catch(() => "")).slice(0, 200);
    return { ok: false, error: `GitHub ${response.status}: ${text}` };
  } catch (error) {
    return { ok: false, error: `GitHub no responde: ${error instanceof Error ? error.message : String(error)}` };
  }
}
