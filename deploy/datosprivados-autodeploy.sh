#!/usr/bin/env bash
# Despliega un cambio legal ya fusionado en master (motor legal, plan 4; docs/RUNBOOK.md).
# Se instala en /usr/local/bin/datosprivados-autodeploy y lo corre root cada 5 minutos
# (/etc/cron.d/datosprivados).
#
# La aplicación NO despliega: la tarea legal-change-sync solo escribe en
# $AUTODEPLOY_STATE_DIR/deploy-request el commit de master que hay que publicar. Este
# script, con un candado (flock), trae master con --ff-only, comprueba que ese commit esté
# incluido y corre scripts/deploy.sh (pruebas, respaldo, build, prueba de humo y
# reversión automática). Deja el resultado para la aplicación:
#   deployed-sha    el commit desplegado (HEAD), si todo salió bien;
#   deploy-failed   el commit pedido y las últimas 40 líneas del registro, si no.
#
# Variables (para pruebas): AUTODEPLOY_STATE_DIR (/var/lib/datosprivados),
# AUTODEPLOY_APP_DIR (/var/www/datosprivados), AUTODEPLOY_CMD (scripts/deploy.sh).
set -uo pipefail

STATE="${AUTODEPLOY_STATE_DIR:-/var/lib/datosprivados}"
APP="${AUTODEPLOY_APP_DIR:-/var/www/datosprivados}"
DEPLOY="${AUTODEPLOY_CMD:-scripts/deploy.sh}"
REQUEST="$STATE/deploy-request"
LOG="$STATE/autodeploy.log"

[[ -f "$REQUEST" ]] || exit 0

exec 9>"$STATE/autodeploy.lock"
flock -n 9 || exit 0

say() { logger -t datosprivados-autodeploy -- "$*" 2>/dev/null || true; echo "$*"; }

SHA="$(head -n 1 "$REQUEST" | tr -d '[:space:]')"
if [[ ! "$SHA" =~ ^[0-9a-f]{40}$ ]]; then
  say "solicitud de despliegue mal formada; se descarta"
  rm -f "$REQUEST"
  exit 1
fi

# Solo se quita la solicitud si sigue siendo la misma (pudo llegar otra mientras tanto).
clear_request() { [[ "$(head -n 1 "$REQUEST" 2>/dev/null | tr -d '[:space:]')" == "$SHA" ]] && rm -f "$REQUEST"; }

: >"$LOG"
{
  echo "[autodeploy] $(date -Is) commit pedido $SHA"
  git -C "$APP" pull --ff-only origin master &&
    git -C "$APP" merge-base --is-ancestor "$SHA" HEAD &&
    (cd "$APP" && bash -c "$DEPLOY")
} >>"$LOG" 2>&1
STATUS=$?

if [[ $STATUS -ne 0 ]]; then
  { echo "$SHA"; tail -n 40 "$LOG"; } >"$STATE/deploy-failed.tmp" && mv "$STATE/deploy-failed.tmp" "$STATE/deploy-failed"
  clear_request
  say "falló el despliegue de $SHA (ver $LOG)"
  exit 1
fi

git -C "$APP" rev-parse HEAD >"$STATE/deployed-sha.tmp" && mv "$STATE/deployed-sha.tmp" "$STATE/deployed-sha"
rm -f "$STATE/deploy-failed"
clear_request
say "desplegado $(cat "$STATE/deployed-sha")"
