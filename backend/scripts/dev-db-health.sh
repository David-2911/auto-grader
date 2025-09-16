#!/usr/bin/env bash
set -euo pipefail

# Dev MySQL health & schema verification script
# Usage:
#   ./scripts/dev-db-health.sh                # basic checks
#   ./scripts/dev-db-health.sh --apply-schema # reapply comprehensive schema (non-destructive if objects exist)
#   ./scripts/dev-db-health.sh --force-reset  # DANGEROUS: drops and recreates DB before applying schema
# Env (defaults match docker-compose.override.yml):
#   DB_HOST (default: 127.0.0.1)
#   DB_PORT (default: 3307)
#   DB_NAME (default: auto_grade)
#   DB_USER (default: devuser)
#   DB_PASSWORD (default: devpass)
#   ROOT_PASSWORD (optional, for --force-reset): devpass123 assumed if unset

DB_HOST=${DB_HOST:-127.0.0.1}
DB_PORT=${DB_PORT:-3307}
DB_NAME=${DB_NAME:-auto_grade}
DB_USER=${DB_USER:-devuser}
DB_PASSWORD=${DB_PASSWORD:-devpass}
ROOT_PASSWORD=${ROOT_PASSWORD:-devpass123}
SCHEMA_FILE="$(cd "$(dirname "$0")"/../src/config && pwd)/comprehensive_schema.sql"

APPLY_SCHEMA=false
FORCE_RESET=false

for arg in "$@"; do
  case "$arg" in
    --apply-schema) APPLY_SCHEMA=true ;;
    --force-reset) FORCE_RESET=true ; APPLY_SCHEMA=true ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^# //'
      exit 0
      ;;
  esac
done

info() { printf '\033[1;34m[INFO]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[WARN]\033[0m %s\n' "$*"; }
err()  { printf '\033[1;31m[ERR ]\033[0m %s\n' "$*"; }

mysql_user() {
  mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" "$@"
}

mysql_root() {
  mysql -h"$DB_HOST" -P"$DB_PORT" -uroot -p"$ROOT_PASSWORD" "$@"
}

info "Checking connectivity (SELECT 1) as $DB_USER@$DB_HOST:$DB_PORT ..."
if ! mysql_user -e 'SELECT 1;' >/dev/null 2>&1; then
  err "User connection failed. Trying root to diagnose..."
  if mysql_root -e 'SELECT 1;' >/dev/null 2>&1; then
    warn "Root works; user creds may be wrong or user missing."
  fi
  exit 1
fi
info "Basic connectivity OK."

if $FORCE_RESET; then
  warn "FORCE RESET: Dropping and recreating database $DB_NAME"
  mysql_root -e "DROP DATABASE IF EXISTS \`$DB_NAME\`; CREATE DATABASE \`$DB_NAME\`; GRANT ALL ON \`$DB_NAME\`.* TO '$DB_USER'@'%'; FLUSH PRIVILEGES;" || { err "Force reset failed"; exit 1; }
fi

if $APPLY_SCHEMA; then
  if [ ! -f "$SCHEMA_FILE" ]; then
    err "Schema file not found: $SCHEMA_FILE"; exit 1; fi
  info "Applying schema file: $(basename "$SCHEMA_FILE")"
  # Use root if force reset; else user
  if $FORCE_RESET; then
    mysql_root "$DB_NAME" < "$SCHEMA_FILE" || { err "Schema apply failed"; exit 1; }
  else
    mysql_user "$DB_NAME" < "$SCHEMA_FILE" || { err "Schema apply failed"; exit 1; }
  fi
  info "Schema application complete."
fi

info "Listing first 15 tables in $DB_NAME ..."
TABLES_OUTPUT=$(mysql_user -N -e "SELECT table_name FROM information_schema.tables WHERE table_schema='${DB_NAME}' ORDER BY table_name LIMIT 15;") || { err "Unable to list tables"; exit 1; }
if [ -z "$TABLES_OUTPUT" ]; then
  warn "No tables found. Consider --apply-schema or --force-reset."; else
  echo "$TABLES_OUTPUT" | sed 's/^/  - /'
fi

KEY_TABLES=(users student_profiles teacher_profiles courses assignments enrollments)
MISSING=0
for t in "${KEY_TABLES[@]}"; do
  if ! mysql_user -D "$DB_NAME" -N -e "SHOW TABLES LIKE '$t';" | grep -q "$t"; then
    warn "Missing expected table: $t"; MISSING=$((MISSING+1)); fi
done
if [ "$MISSING" -eq 0 ]; then
  info "All key tables present."
else
  warn "$MISSING key tables missing. If this is unexpected, options:" 
  echo "    1) Run: $0 --force-reset   (DROPS and recreates DB)" 
  echo "    2) Inspect schema file: $SCHEMA_FILE for those CREATE TABLE statements" 
  echo "    3) Confirm you are pointing at correct database name: $DB_NAME" 
fi

info "Row counts (first 5 key tables that exist):"
for t in "${KEY_TABLES[@]:0:5}"; do
  if mysql_user -D "$DB_NAME" -N -e "SHOW TABLES LIKE '$t';" | grep -q "$t"; then
    c=$(mysql_user -D "$DB_NAME" -N -e "SELECT COUNT(*) FROM $t;"); printf "  %-20s %s\n" "$t" "$c"; fi
done

info "Done."