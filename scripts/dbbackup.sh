#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backup/db}"
REMOTE_HOST="${REMOTE_HOST:-us1rn.funai.vip}"
REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_DIR="${REMOTE_DIR:-/crs-backup}"

REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

TS="$(date +%Y%m%d-%H%M%S)"
SNAPSHOT_FILE="$BACKUP_DIR/redis-snapshot-$TS.rdb"

SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=15)

log() {
  printf '[dbbackup] %s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log "Required command not found: $1"
    exit 1
  fi
}

build_redis_cli() {
  REDIS_CLI=(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT")
  if [[ -n "$REDIS_PASSWORD" ]]; then
    REDIS_CLI+=(-a "$REDIS_PASSWORD")
  fi
}

make_snapshot() {
  require_cmd redis-cli
  mkdir -p "$BACKUP_DIR"
  build_redis_cli

  log "Creating online Redis snapshot: $SNAPSHOT_FILE"
  if ! "${REDIS_CLI[@]}" --rdb "$SNAPSHOT_FILE" >/dev/null 2>&1; then
    rm -f -- "$SNAPSHOT_FILE"
    log "Redis snapshot failed"
    exit 1
  fi
  log "Snapshot created: $SNAPSHOT_FILE"
}

upload_snapshot() {
  require_cmd ssh

  local ssh_target="${REMOTE_USER}@${REMOTE_HOST}"
  local remote_target="${ssh_target}:${REMOTE_DIR}/"

  log "Ensuring remote backup directory exists: $remote_target"
  ssh "${SSH_OPTS[@]}" "$ssh_target" "mkdir -p '$REMOTE_DIR'"

  if command -v rsync >/dev/null 2>&1; then
    log "Uploading snapshot with rsync"
    rsync -az -e "ssh ${SSH_OPTS[*]}" "$SNAPSHOT_FILE" "$remote_target"
  else
    require_cmd scp
    log "Uploading snapshot with scp"
    scp "${SSH_OPTS[@]}" "$SNAPSHOT_FILE" "$remote_target"
  fi

  log "Upload completed: $remote_target"
}

usage() {
  cat <<'EOF'
Usage:
  dbbackup.sh          # create Redis snapshot and upload to remote server

Environment variables (optional):
  ROOT_DIR, BACKUP_DIR
  REMOTE_HOST, REMOTE_USER, REMOTE_DIR
  REDIS_HOST, REDIS_PORT, REDIS_PASSWORD
EOF
}

if (( $# > 0 )); then
  usage
  exit 1
fi

make_snapshot
upload_snapshot
