#!/usr/bin/env bash
# Re-auditoría trimestral del motor legal (plan 6, diseño §9; docs/RUNBOOK.md).
# Se instala en /usr/local/bin/datosprivados-reaudit y lo corre root el primer lunes de
# enero, abril, julio y octubre (/etc/cron.d/datosprivados). El cron combina día del mes
# y día de la semana con O, así que el propio script comprueba que sea el primer lunes.
#
# Corre `pnpm legal:audit` en una copia limpia de master en $REAUDIT_STATE_DIR/repo (nunca
# en /var/www/datosprivados ni escribe en git) y envía el resumen a la aplicación, que avisa
# por correo a OPERATOR_EMAILS. Si algo falla, avisa igual con el motivo.
#
# Variables (para pruebas): REAUDIT_STATE_DIR (/var/lib/datosprivados/reaudit),
# REAUDIT_ENV_DIR (/var/www/datosprivados), REAUDIT_REPO_URL, REAUDIT_API_URL,
# REAUDIT_TODAY (AAAA-MM-DD, hora de Lima), REAUDIT_CMD (reemplaza clonar + auditar).
set -uo pipefail

STATE="${REAUDIT_STATE_DIR:-/var/lib/datosprivados/reaudit}"
ENV_DIR="${REAUDIT_ENV_DIR:-/var/www/datosprivados}"
REPO_URL="${REAUDIT_REPO_URL:-https://github.com/janymil/datosprivados.git}"
API="${REAUDIT_API_URL:-http://127.0.0.1:3000/api/legal/reaudit}"
TODAY="${REAUDIT_TODAY:-$(TZ=America/Lima date +%F)}"
REPO="$STATE/repo"
LOG="$STATE/reaudit.log"

# Primer lunes del mes (días 1 a 7 y lunes) de un mes de inicio de trimestre.
DAY=$((10#$(date -d "$TODAY" +%d)))
MONTH=$((10#$(date -d "$TODAY" +%m)))
DOW=$(date -d "$TODAY" +%u)
if (( DAY > 7 || DOW != 1 )) || [[ ! " 1 4 7 10 " =~ " $MONTH " ]]; then
  exit 0
fi

mkdir -p "$STATE"
exec 9>"$STATE/reaudit.lock"
flock -n 9 || exit 0

say() { logger -t datosprivados-reaudit -- "$*" 2>/dev/null || true; echo "$*"; }
SECRET="$(grep -E '^CRON_SECRET=' "$ENV_DIR/.env" 2>/dev/null | tail -n 1 | cut -d= -f2-)"
post() {
  curl -s -m 30 -X POST -H "authorization: Bearer $SECRET" -H "content-type: application/json" --data "$1" "$API" >/dev/null
}

: >"$LOG"
{
  echo "[reaudit] $(date -Is) auditoría del $TODAY"
  mkdir -p "$REPO"
  if [[ -n "${REAUDIT_CMD:-}" ]]; then
    (cd "$REPO" && bash -c "$REAUDIT_CMD")
  else
    { [[ -d "$REPO/.git" ]] || git clone -q "$REPO_URL" "$REPO"; } &&
      git -C "$REPO" fetch -q origin master &&
      git -C "$REPO" checkout -q -f origin/master &&
      git -C "$REPO" clean -q -fdx -e .cache &&
      (cd "$REPO" && pnpm install --frozen-lockfile &&
        LEGAL_AUDIT_ENV_DIR="$ENV_DIR" timeout 7200 pnpm legal:audit)
  fi
} >>"$LOG" 2>&1
STATUS=$?

REPORT="$REPO/legal/audit/$TODAY.json"
if [[ $STATUS -ne 0 || ! -f "$REPORT" ]]; then
  REASON="$(tail -n 5 "$LOG" | tr -d '\000-\010\013-\037' | tr '\n' ' ' | cut -c1-400)"
  post "$(node -e 'process.stdout.write(JSON.stringify({ ok: false, date: process.argv[1], error: process.argv[2] || "la auditoría no terminó" }))' "$TODAY" "$REASON")"
  say "re-auditoría del $TODAY falló (ver $LOG)"
  exit 1
fi

post "$(node -e '
  const r = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  const errors = r.findings.filter((f) => f.severity === "error").length;
  process.stdout.write(JSON.stringify({ ok: true, date: process.argv[2], errors, review: r.findings.length - errors, aiFailures: r.meta.aiFailures ?? 0 }));
' "$REPORT" "$TODAY")"
say "re-auditoría del $TODAY enviada"
