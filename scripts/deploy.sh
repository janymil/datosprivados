#!/usr/bin/env bash
# Despliegue del preview/staging: pruebas, respaldo, build en copia, cambio de .next, reinicio de PM2,
# prueba de humo y reversión automática a la compilación anterior si algo falla.
#
# Uso: scripts/deploy.sh            (variables: PM2_APP, PORT, SMOKE_PATHS, BACKUP_DIR)
#
# La compilación se hace en .deploy/build (copia del código, node_modules enlazado), así el proceso
# en marcha sigue sirviendo .next hasta el cambio. El corte dura lo que tarda el intercambio de carpetas
# y el reinicio de PM2 (fork mode: no hay reload sin corte).
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PM2_APP="${PM2_APP:-datosprivados}"
PORT="${PORT:-3000}"
SMOKE_PATHS="${SMOKE_PATHS:-/ /demo}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/backups}"
BUILD_DIR="$APP_DIR/.deploy/build"

log() { printf '[deploy %s] %s\n' "$(date '+%H:%M:%S')" "$*"; }

smoke_test() {
  for path in $SMOKE_PATHS; do
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://127.0.0.1:${PORT}${path}" || true)"
    if [[ "$code" != "200" && "$code" != "307" && "$code" != "308" ]]; then
      log "prueba de humo falló: ${path} -> HTTP ${code}"
      return 1
    fi
    log "ok ${path} -> ${code}"
  done
}

rollback() {
  log "revirtiendo a la compilación anterior"
  if [[ -d "$APP_DIR/.next.prev" ]]; then
    rm -rf "$APP_DIR/.next.failed"
    [[ -d "$APP_DIR/.next" ]] && mv "$APP_DIR/.next" "$APP_DIR/.next.failed"
    mv "$APP_DIR/.next.prev" "$APP_DIR/.next"
  fi
  pm2 restart "$PM2_APP" >/dev/null
  smoke_test || log "ATENCIÓN: la reversión tampoco pasa la prueba de humo; revisar pm2 logs ${PM2_APP}"
}

cd "$APP_DIR"

log "pruebas y tipos"
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test

log "respaldo de la base antes de tocar nada"
node scripts/backup-db.mjs "$BACKUP_DIR"

log "compilando en copia (${BUILD_DIR})"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
rsync -a --delete \
  --exclude '/.next' --exclude '/node_modules' --exclude '/data' --exclude '/backups' \
  --exclude '/.deploy' --exclude '/test/.tmp' --exclude '/.git' \
  "$APP_DIR/" "$BUILD_DIR/"
ln -s "$APP_DIR/node_modules" "$BUILD_DIR/node_modules"
(cd "$BUILD_DIR" && pnpm build)

log "intercambiando .next (corte breve)"
rm -rf "$APP_DIR/.next.prev"
[[ -d "$APP_DIR/.next" ]] && mv "$APP_DIR/.next" "$APP_DIR/.next.prev"
mv "$BUILD_DIR/.next" "$APP_DIR/.next"

log "reiniciando ${PM2_APP}"
pm2 restart "$PM2_APP"
sleep 3

if smoke_test; then
  rm -rf "$APP_DIR/.next.prev" "$APP_DIR/.next.failed"
  log "despliegue completo"
else
  rollback
  exit 1
fi
