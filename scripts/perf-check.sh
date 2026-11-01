#!/usr/bin/env bash
# Carga ligera (50 conexiones simultáneas) sobre staging o un `next start` local. Uso:
#   BASE=http://127.0.0.1:3200 SLUG=<slug> SESSION=<cookie pdp_session> scripts/perf-check.sh
# SLUG y SESSION salen de scripts/perf-seed.mjs. Objetivo del roadmap: p95 < 300 ms por página.
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:3200}"
DURATION="${DURATION:-10}"
CONNECTIONS="${CONNECTIONS:-50}"
run() { # nombre, url, opciones de loadtest...
  local name="$1"; shift
  printf '\n== %s\n' "$name"
  node "$(dirname "$0")/loadtest.mjs" "$1" -c "$CONNECTIONS" -d "$DURATION" "${@:2}"
}
run "landing" "$BASE/"
run "login" "$BASE/login"
run "formulario ARCO" "$BASE/solicitud/${SLUG:?define SLUG}"
run "panel (sesión)" "$BASE/app" -H "Cookie: pdp_session=${SESSION:?define SESSION}"
run "webhook (firma inválida, debe rechazar rápido)" "$BASE/api/mercadopago/webhook" -m POST -H "content-type: application/json" -b '{"type":"payment","data":{"id":"1"}}'
