#!/usr/bin/env bash
set -euo pipefail

# # 自动清理服务器上每次更新备份的yaml文件。放服务器/opt目录，team两个相关服务在/opt/xijjapp 和/opt/gpt-multi目录。 不在此项目
# 防止并发执行（例如 cron 重叠）
LOCK_FILE="/var/lock/cleanup_config_baks.lock"
mkdir -p "$(dirname "$LOCK_FILE")"
exec 200>"$LOCK_FILE"
flock -n 200 || exit 0

DIRS=(/opt/xijjapp /opt/gpt-multi)
KEEP_COUNT=2

# 严格匹配：config.yaml.bak.YYYYMMDD_HHMMSS
REGEX='.*/config\.yaml\.bak\.[0-9]{8}_[0-9]{6}$'

# DRY_RUN=1 时只打印不删除
DRY_RUN="${DRY_RUN:-0}"

for dir in "${DIRS[@]}"; do
  if [[ ! -d "$dir" ]]; then
    echo "[$(date '+%F %T')] skip: dir not found: $dir" >&2
    continue
  fi

  # 由于 YYYYMMDD_HHMMSS 的字典序=时间序，用 sort 后最后两个就是最新两份
  mapfile -t backups < <(
    find "$dir" -maxdepth 1 -type f -regextype posix-extended -regex "$REGEX" -print | sort
  )

  n="${#backups[@]}"
  if (( n <= KEEP_COUNT )); then
    echo "[$(date '+%F %T')] [$dir] backups=$n, keep=$KEEP_COUNT, nothing to delete"
    continue
  fi

  echo "[$(date '+%F %T')] [$dir] total=$n, keep latest $KEEP_COUNT"
  for ((i=n-KEEP_COUNT; i<n; i++)); do
    echo "[$(date '+%F %T')] keep: ${backups[$i]}"
  done

  # 删除除最新 KEEP_COUNT 外的所有文件
  for ((i=0; i<n-KEEP_COUNT; i++)); do
    f="${backups[$i]}"
    if (( DRY_RUN == 1 )); then
      echo "[$(date '+%F %T')] DRY_RUN delete: $f"
    else
      rm -f -- "$f"
      echo "[$(date '+%F %T')] deleted: $f"
    fi
  done
done
