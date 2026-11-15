#!/usr/bin/env bash
# Re-auditoría trimestral del motor legal (plan 6, diseño §9; docs/RUNBOOK.md).
# Se instala en /usr/local/bin/datosprivados-reaudit y lo corre root el primer lunes (hora de
# Lima) de enero, abril, julio y octubre (/etc/cron.d/datosprivados). El servidor está en
# Europe/Berlin y cron no admite CRON_TZ, así que el cron dispara los días 1 a 7 a una hora
# que en Lima es el mismo día y el script comprueba aquí, en hora de Lima, que sea lunes.
#
# Corre `pnpm legal:audit` en una copia limpia de master en $REAUDIT_STATE_DIR/repo (nunca
# en /var/www/datosprivados ni escribe en git) y envía el resumen a la aplicación, que avisa
# por correo a OPERATOR_EMAILS. Si algo falla, avisa igual con el motivo.
#
# Variables: REAUDIT_FORCE=1 (correr fuera del primer lunes, para relanzar a mano),
# REAUDIT_STATE_DIR (/var/lib/datosprivados/reaudit), REAUDIT_ENV_DIR (/var/www/datosprivados),
# DATOSPRIVADOS_ENV (/etc/datosprivados.env, como el wrapper de cron), REAUDIT_REPO_URL,
# REAUDIT_API_URL, REAUDIT_RETRIES (5), y para pruebas REAUDIT_TODAY (AAAA-MM-DD de Lima)
# y REAUDIT_CMD (reemplaza clonar + auditar; corre dentro de la copia).
set -uo pipefail

STATE="${REAUDIT_STATE_DIR:-/var/lib/datosprivados/reaudit}"
ENV_DIR="${REAUDIT_ENV_DIR:-/var/www/datosprivados}"
ENV_FILES=("${DATOSPRIVADOS_ENV:-/etc/datosprivados.env}" "$ENV_DIR/.env")
REPO_URL="${REAUDIT_REPO_URL:-https://github.com/janymil/datosprivados.git}"
API="${REAUDIT_API_URL:-http://127.0.0.1:3000/api/legal/reaudit}"
RETRIES="${REAUDIT_RETRIES:-5}"
TODAY="${REAUDIT_TODAY:-$(TZ=America/Lima date +%F)}"
REPO="$STATE/repo"
LOG="$STATE/reaudit.log"

# Primer lunes del mes (días 1 a 7 y lunes) de un mes de inicio de trimestre.
if [[ "${REAUDIT_FORCE:-}" != "1" ]]; then
  DAY=$((10#$(date -d "$TODAY" +%d)))
  MONTH=$((10#$(date -d "$TODAY" +%m)))
  DOW=$(date -d "$TODAY" +%u)
  if (( DAY > 7 || DOW != 1 )) || [[ ! " 1 4 7 10 " =~ " $MONTH " ]]; then
    exit 0
  fi
fi

mkdir -p "$STATE"
exec 9>"$STATE/reaudit.lock"
flock -n 9 || exit 0

say() {
  local level="$1"; shift
  logger -t datosprivados-reaudit -p "user.$level" -- "$*" 2>/dev/null || true
  echo "[reaudit] $*" >>"$LOG"
}

# Mismo origen y limpieza del secreto que /usr/local/bin/datosprivados-cron.
SECRET=""
for file in "${ENV_FILES[@]}"; do
  [[ -r "$file" ]] || continue
  SECRET="$(sed -n 's/^CRON_SECRET=//p' "$file" | head -1 | tr -d '"'"'"'\r')"
  [[ -n "$SECRET" ]] && break
done

post() {
  if ! curl -fsS -m 30 --retry "$RETRIES" --retry-delay 10 --retry-all-errors -o /dev/null \
    -X POST -H "authorization: Bearer $SECRET" -H "content-type: application/json" --data "$1" "$API" 2>>"$LOG"; then
    say err "no se pudo entregar el resultado del $TODAY a $API (ver $LOG)"
    return 1
  fi
}

echo "[reaudit] $(date -Is) auditoría del $TODAY" >>"$LOG"
STAMP="$STATE/started"
{
  # Una copia a medias (clon interrumpido) se descarta en vez de bloquear cada trimestre.
  [[ -d "$REPO" && ! -d "$REPO/.git" && -z "${REAUDIT_CMD:-}" ]] && rm -rf "$REPO"
  mkdir -p "$REPO"
  if [[ -n "${REAUDIT_CMD:-}" ]]; then
    touch "$STAMP" && (cd "$REPO" && bash -c "$REAUDIT_CMD")
  else
    { [[ -d "$REPO/.git" ]] || git clone -q "$REPO_URL" "$REPO"; } &&
      git -C "$REPO" fetch -q origin master &&
      git -C "$REPO" checkout -q -f origin/master &&
      git -C "$REPO" clean -q -fdx -e .cache &&
      (cd "$REPO" && pnpm install --frozen-lockfile) &&
      touch "$STAMP" &&
      (cd "$REPO" && LEGAL_AUDIT_ENV_DIR="$ENV_DIR" timeout 7200 pnpm legal:audit)
  fi
} >>"$LOG" 2>&1
STATUS=$?

# El informe es el que escribió esta corrida (posterior a STAMP), no uno versionado en master:
# la auditoría lo nombra con la fecha de Lima en que termina.
REPORT=""
if [[ $STATUS -eq 0 && -d "$REPO/legal/audit" ]]; then
  REPORT="$(find "$REPO/legal/audit" -maxdepth 1 -name '*.json' -newer "$STAMP" -printf '%T@ %p\n' 2>/dev/null | sort -n | tail -n 1 | cut -d' ' -f2-)"
fi

if [[ -z "$REPORT" ]]; then
  REASON="$(tail -n 5 "$LOG" | tr -d '\000-\010\013-\037' | tr '\n' ' ' | cut -c1-400)"
  post "$(node -e 'process.stdout.write(JSON.stringify({ ok: false, date: process.argv[1], error: process.argv[2] || "la auditoría no terminó" }))' "$TODAY" "$REASON")"
  say err "re-auditoría del $TODAY falló (ver $LOG)"
  exit 1
fi

post "$(node -e '
  const r = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  const errors = r.findings.filter((f) => f.severity === "error").length;
  process.stdout.write(JSON.stringify({ ok: true, date: process.argv[2], errors, review: r.findings.length - errors, aiFailures: r.meta.aiFailures ?? 0 }));
' "$REPORT" "$TODAY")" || exit 2
say info "re-auditoría del $TODAY enviada ($REPORT)"
