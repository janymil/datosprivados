#!/usr/bin/env bash
# Dispara una tarea programada de DatosPrivados: POST /api/cron/<tarea> con el bearer de CRON_SECRET.
# Ver docs/RUNBOOK.md ("Tareas programadas"). Lo llama /etc/cron.d/datosprivados.
#
# Uso: datosprivados-cron <tarea>|health [--at HH:MM] [--dow 1-7]
#
#   --at HH:MM   solo se ejecuta si en Lima son exactamente esa hora y minuto (zona America/Lima).
#   --dow N      solo se ejecuta si en Lima es ese dia de la semana (1 = lunes ... 7 = domingo).
#
# Por que la comprobacion de hora y no CRON_TZ: el cron de Ubuntu (3.0pl1) NO soporta CRON_TZ,
# interpreta el horario en la zona del sistema (este servidor esta en Europe/Berlin, con horario
# de verano) y su manual recomienda justamente comprobar la fecha dentro del script. Asi el cron
# dispara cada hora y decide este wrapper, en hora de Lima (UTC-5, sin DST).
#
# Variables: DATOSPRIVADOS_URL (por defecto http://127.0.0.1:3000),
#            DATOSPRIVADOS_ENV (por defecto /etc/datosprivados.env; si no esta, usa el .env del repo),
#            DATOSPRIVADOS_TZ (por defecto America/Lima).
#
# El secreto se lee del archivo de entorno y nunca se escribe en la tabla de cron
# (/etc/cron.d es legible por todos; /etc/datosprivados.env y .env van en 600).
set -uo pipefail

JOB="${1:-}"
shift || true

BASE="${DATOSPRIVADOS_URL:-http://127.0.0.1:3000}"
TZ_LIMA="${DATOSPRIVADOS_TZ:-America/Lima}"
ENV_FILES=("${DATOSPRIVADOS_ENV:-/etc/datosprivados.env}" /var/www/datosprivados/.env)
AT=""
DOW=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --at)  AT="${2:-}"; shift 2 ;;
    --dow) DOW="${2:-}"; shift 2 ;;
    *) echo "opcion desconocida: $1" >&2; exit 2 ;;
  esac
done

log() {
  local prio="$1"; shift
  # Los errores van a syslog Y a stderr: syslog no lo lee quien ejecuta a mano, y
  # stderr sí (journalctl y el correo de cron).
  if [[ "$prio" == "err" ]]; then
    logger -t datosprivados-cron -p "user.$prio" -- "$*" 2>/dev/null || true
    printf '%s\n' "$*" >&2
  else
    logger -t datosprivados-cron -p "user.$prio" -- "$*" 2>/dev/null || printf '%s\n' "$*" >&2
  fi
}

if [[ -z "$JOB" ]]; then
  log err "uso: datosprivados-cron <tarea>|health [--at HH:MM] [--dow 1-7]"
  exit 2
fi

# El cron que llama a este wrapper dispara cada hora en punto (minuto 0), así que
# `--at` solo puede ser HH:00: cualquier otra cosa no se cumple NUNCA. Eso ya pasó
# (billing-sync a las 06:15 y otros tres no corrieron durante días, con la salud en
# rojo), así que ahora se rechaza en voz alta en vez de saltarse la tarea en silencio.
if [[ -n "$AT" && ! "$AT" =~ ^([01][0-9]|2[0-3]):00$ ]]; then
  log err "--at ${AT} no se puede cumplir: el cron dispara cada hora en punto. Usa ${AT%%:*}:00 (y ajusta el minuto en /etc/cron.d)."
  exit 4
fi

# Ventana de ejecucion en hora de Lima (el cron dispara cada hora; aqui se filtra).
if [[ -n "$AT" && "$(TZ="$TZ_LIMA" date +%H:%M)" != "$AT" ]]; then exit 0; fi
if [[ -n "$DOW" && "$(TZ="$TZ_LIMA" date +%u)" != "$DOW" ]]; then exit 0; fi

secret=""
for file in "${ENV_FILES[@]}"; do
  [[ -r "$file" ]] || continue
  secret="$(sed -n 's/^CRON_SECRET=//p' "$file" | head -1 | tr -d '"'"'"'\r')"
  [[ -n "$secret" ]] && break
done
if [[ ${#secret} -lt 16 ]]; then
  log err "CRON_SECRET ausente o menor de 16 caracteres (revisado: ${ENV_FILES[*]}); la peticion seria rechazada con 401."
  exit 3
fi

if [[ "$JOB" == "health" ]]; then
  resp="$(curl -sS --max-time 30 -w '\n%{http_code}' -H "Authorization: Bearer $secret" "$BASE/api/cron/health" 2>&1)" || true
  code="${resp##*$'\n'}"
  body="${resp%$'\n'*}"
  if [[ "$code" != "200" ]]; then
    log err "health -> HTTP ${code}: ${body}"
    exit 1
  fi
  exit 0
fi

resp="$(curl -sS --max-time 120 -X POST -w '\n%{http_code}' -H "Authorization: Bearer $secret" "$BASE/api/cron/$JOB" 2>&1)" || true
code="${resp##*$'\n'}"
body="${resp%$'\n'*}"
case "$code" in
  200) exit 0 ;;   # tarea ejecutada
  409) exit 0 ;;   # candado de job_runs: otra instancia la esta corriendo
  *)   log err "$JOB -> HTTP ${code}: ${body}"; exit 1 ;;
esac
