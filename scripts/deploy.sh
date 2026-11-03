#!/usr/bin/env bash
# Despliegue del preview/staging: pruebas, respaldo, build en copia, cambio de .next, reinicio de PM2,
# prueba de humo y reversión automática a la compilación anterior si algo falla.
#
# Uso: scripts/deploy.sh            (variables: PM2_APP, PORT, SMOKE_PATHS, BACKUP_DIR)
#      scripts/deploy.sh --check    (solo comprueba requisitos: no cambia nada)
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
MIN_FREE_MB=2048

log() { printf '[deploy %s] %s\n' "$(date '+%H:%M:%S')" "$*"; }

CHECK_ONLY=false
for arg in "$@"; do
  case "$arg" in
    --check) CHECK_ONLY=true ;;
    *)
      printf 'Argumento desconocido: %s\n\nUso: %s [--check]\n' "$arg" "${BASH_SOURCE[0]}" >&2
      exit 2
      ;;
  esac
done

# Requisitos que, si faltan, hacen fracasar el despliegue a media noche. Se comprueban
# antes de tocar nada: instalar dependencias, respaldar, compilar e intercambiar .next
# deja el sitio a medio actualizar si el fallo aparece en el paso 3.
preflight() {
  local missing=0 free_kb free_mb
  for tool in node pnpm rsync curl pm2; do
    if command -v "$tool" >/dev/null 2>&1; then
      log "ok     $tool"
    else
      log "FALTA  $tool (no está en PATH)"
      missing=1
    fi
  done
  if [[ -f "$APP_DIR/package.json" ]]; then
    log "ok     package.json en $APP_DIR"
  else
    log "FALTA  package.json en $APP_DIR"
    missing=1
  fi
  if mkdir -p "$BACKUP_DIR" 2>/dev/null && [[ -w "$BACKUP_DIR" ]]; then
    log "ok     respaldos escribibles en $BACKUP_DIR"
  else
    log "FALTA  permiso de escritura en $BACKUP_DIR"
    missing=1
  fi
  free_kb="$(df -Pk "$APP_DIR" | awk 'NR==2 {print $4}')"
  free_mb=$(( ${free_kb:-0} / 1024 ))
  if [[ "$free_mb" -ge "$MIN_FREE_MB" ]]; then
    log "ok     espacio libre: ${free_mb} MB"
  else
    log "POCO   espacio libre: ${free_mb} MB (se piden ${MIN_FREE_MB} MB para la copia y el build)"
    missing=1
  fi
  if pm2 describe "$PM2_APP" >/dev/null 2>&1; then
    log "ok     la app $PM2_APP existe en pm2"
  else
    log "FALTA  la app $PM2_APP en pm2 (pm2 start ecosystem...) o PM2_APP equivocado"
    missing=1
  fi
  return "$missing"
}

if $CHECK_ONLY; then
  log "modo --check: solo se comprueban requisitos, no se cambia nada"
  if preflight; then
    log "todo listo para desplegar"
    exit 0
  fi
  log "faltan requisitos: NO se despliega"
  exit 1
fi

preflight || { log "faltan requisitos: NO se despliega"; exit 1; }

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
