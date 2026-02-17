#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="${ROOT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backup/db}"
REMOTE_HOST="${REMOTE_HOST:-us1rn.funai.vip}"
REMOTE_USER="${REMOTE_USER:-root}"
REMOTE_DIR="${REMOTE_DIR:-/crs-backup}"
RETAIN_COUNT="${RETAIN_COUNT:-7}"

SSH_OPTS=(-o BatchMode=yes -o ConnectTimeout=15)

log() {
  printf '[dbcleanup] %s %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    log "Required command not found: $1"
    exit 1
  fi
}

cleanup_local() {
  mkdir -p "$BACKUP_DIR"

  mapfile -t local_files < <(
    find "$BACKUP_DIR" -maxdepth 1 -type f -name 'redis-snapshot-*.rdb' -printf '%T@ %p\n' \
      | sort -nr \
      | awk '{ $1=""; sub(/^ /,""); print }'
  )

  if (( ${#local_files[@]} <= RETAIN_COUNT )); then
    log "Local cleanup skipped, snapshot count=${#local_files[@]}, keep=$RETAIN_COUNT"
    return
  fi

  for ((i=RETAIN_COUNT; i<${#local_files[@]}; i++)); do
    rm -f -- "${local_files[$i]}"
    log "Deleted local snapshot: ${local_files[$i]}"
  done
}

cleanup_remote() {
  require_cmd ssh
  local ssh_target="${REMOTE_USER}@${REMOTE_HOST}"

  log "Cleaning remote snapshots, keeping latest $RETAIN_COUNT in $ssh_target:$REMOTE_DIR"
  ssh "${SSH_OPTS[@]}" "$ssh_target" "bash -s" -- "$REMOTE_DIR" "$RETAIN_COUNT" <<'EOF'
set -euo pipefail
remote_dir="$1"
retain_count="$2"

mkdir -p "$remote_dir"

mapfile -t remote_files < <(
  find "$remote_dir" -maxdepth 1 -type f -name 'redis-snapshot-*.rdb' -printf '%T@ %p\n' 2>/dev/null \
    | sort -nr \
    | awk '{ $1=""; sub(/^ /,""); print }'
)

if (( ${#remote_files[@]} <= retain_count )); then
  exit 0
fi

for ((i=retain_count; i<${#remote_files[@]}; i++)); do
  rm -f -- "${remote_files[$i]}"
  printf '[dbcleanup-remote] deleted %s\n' "${remote_files[$i]}"
done
EOF
}

usage() {
  cat <<'EOF'
Usage:
  dbcleanup.sh         # keep latest N snapshots locally and remotely

Environment variables (optional):
  ROOT_DIR, BACKUP_DIR
  REMOTE_HOST, REMOTE_USER, REMOTE_DIR, RETAIN_COUNT
EOF
}

if (( $# > 0 )); then
  usage
  exit 1
fi

cleanup_local
cleanup_remote
