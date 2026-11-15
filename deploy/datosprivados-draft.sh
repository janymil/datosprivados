#!/usr/bin/env bash
# Redacción automática de correcciones del motor legal (plan 7; docs/RUNBOOK.md, «Redacción
# automática»). Se instala en /usr/local/bin/datosprivados-draft y lo corre root cada 30 minutos
# (/etc/cron.d/datosprivados).
#
# Pide a la app la siguiente solicitud de la cola (GET /api/legal/drafts/next). Si hay una, la
# redacta en una copia limpia de master en $DRAFT_STATE_DIR/repo (nunca en /var/www/datosprivados)
# con `npx vitest run --config vitest.draft.config.ts`, que registra el cambio para la aprobación
# del fundador, y devuelve el resultado (POST /api/legal/drafts/<id>/result).
#
# Variables (para pruebas): DRAFT_STATE_DIR (/var/lib/datosprivados/drafts), DRAFT_ENV_DIR
# (/var/www/datosprivados), DATOSPRIVADOS_ENV (/etc/datosprivados.env, como el wrapper de cron),
# DRAFT_REPO_URL, DRAFT_API_URL (http://127.0.0.1:3000), DRAFT_MAX (2 por corrida), DRAFT_RETRIES (5)
# y DRAFT_CMD (reemplaza clonar + redactar; corre dentro de la copia y escribe $DRAFT_RESULT_FILE).
set -uo pipefail

STATE="${DRAFT_STATE_DIR:-/var/lib/datosprivados/drafts}"
ENV_DIR="${DRAFT_ENV_DIR:-/var/www/datosprivados}"
ENV_FILES=("${DATOSPRIVADOS_ENV:-/etc/datosprivados.env}" "$ENV_DIR/.env")
REPO_URL="${DRAFT_REPO_URL:-https://github.com/janymil/datosprivados.git}"
API="${DRAFT_API_URL:-http://127.0.0.1:3000}"
MAX="${DRAFT_MAX:-2}"
RETRIES="${DRAFT_RETRIES:-5}"
REPO="$STATE/repo"
LOG="$STATE/draft.log"

mkdir -p "$STATE"
exec 9>"$STATE/draft.lock"
flock -n 9 || exit 0

say() {
  local level="$1"; shift
  logger -t datosprivados-draft -p "user.$level" -- "$*" 2>/dev/null || true
  echo "[draft] $*" >>"$LOG"
}

# Mismo origen y limpieza del secreto que /usr/local/bin/datosprivados-cron.
SECRET=""
for file in "${ENV_FILES[@]}"; do
  [[ -r "$file" ]] || continue
  SECRET="$(sed -n 's/^CRON_SECRET=//p' "$file" | head -1 | tr -d '"'"'"'\r')"
  [[ -n "$SECRET" ]] && break
done

for ((n = 0; n < MAX; n++)); do
  REQUEST="$STATE/request.json"
  RESULT="$STATE/result.json"
  rm -f "$REQUEST" "$RESULT"
  code="$(curl -sS -m 30 -o "$REQUEST" -w '%{http_code}' -H "authorization: Bearer $SECRET" "$API/api/legal/drafts/next" 2>>"$LOG")"
  case "$code" in
    200) ;;
    204 | 409) exit 0 ;; # nada que hacer, o la IA apagada / sin presupuesto (la cola espera)
    *) say err "GET /api/legal/drafts/next -> HTTP $code"; exit 1 ;;
  esac
  ID="$(node -e 'process.stdout.write(String(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).id))' "$REQUEST")"
  echo "[draft] $(date -Is) solicitud $ID" >>"$LOG"

  {
    # Una copia a medias (clon interrumpido) se descarta.
    [[ -d "$REPO" && ! -d "$REPO/.git" && -z "${DRAFT_CMD:-}" ]] && rm -rf "$REPO"
    mkdir -p "$REPO"
    if [[ -n "${DRAFT_CMD:-}" ]]; then
      (cd "$REPO" && DRAFT_REQUEST_FILE="$REQUEST" DRAFT_RESULT_FILE="$RESULT" bash -c "$DRAFT_CMD")
    else
      { [[ -d "$REPO/.git" ]] || git clone -q "$REPO_URL" "$REPO"; } &&
        git -C "$REPO" fetch -q origin master &&
        git -C "$REPO" checkout -q -f origin/master &&
        git -C "$REPO" clean -q -fdx -e node_modules -e .cache &&
        (cd "$REPO" && pnpm install --frozen-lockfile &&
          DRAFT_REQUEST_FILE="$REQUEST" DRAFT_RESULT_FILE="$RESULT" DRAFT_ENV_DIR="$ENV_DIR" CRON_SECRET="$SECRET" LEGAL_API_URL="$API" \
            timeout 3600 npx vitest run --config vitest.draft.config.ts)
    fi
  } >>"$LOG" 2>&1

  if [[ ! -s "$RESULT" ]]; then
    node -e 'process.stdout.write(JSON.stringify({ status: "reintentar", reasons: ["el redactor no terminó (ver /var/lib/datosprivados/drafts/draft.log)"] }))' >"$RESULT"
  fi
  if ! curl -fsS -m 30 --retry "$RETRIES" --retry-delay 10 --retry-all-errors -o /dev/null -X POST \
    -H "authorization: Bearer $SECRET" -H "content-type: application/json" --data @"$RESULT" "$API/api/legal/drafts/$ID/result" 2>>"$LOG"; then
    say err "no se pudo entregar el resultado de la solicitud $ID"
    exit 2
  fi
  say info "solicitud $ID: $(node -e 'process.stdout.write(String(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).status))' "$RESULT")"
done
