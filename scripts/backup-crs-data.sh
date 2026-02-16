#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backup}"
TS="$(date +%Y%m%d-%H%M%S)"

# 旧的在线备份redis数据，已没啥用，用新的脚本dbbackup.sh备份并上传到rn小鸡
# 本机直连 Redis 的默认参数（可按需在执行前覆盖环境变量）
REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
REDIS_PORT="${REDIS_PORT:-6379}"
REDIS_PASSWORD="${REDIS_PASSWORD:-}"

log() {
  echo "[crs-backup] $*"
}

mkdir -p "$BACKUP_DIR"

log "备份目录: $BACKUP_DIR"

# 1) 备份 Redis RDB（在线，不停服务）
if command -v redis-cli >/dev/null 2>&1; then
  if [[ -n "$REDIS_PASSWORD" ]]; then
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" BGSAVE >/dev/null 2>&1 || true
  else
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" BGSAVE >/dev/null 2>&1 || true
  fi

  sleep 2

  # 优先复制系统 Redis 的默认 dump 路径
  if [[ -f /var/lib/redis/dump.rdb ]]; then
    cp -f /var/lib/redis/dump.rdb "$BACKUP_DIR/redis-$TS.rdb"
    log "Redis 备份完成: $BACKUP_DIR/redis-$TS.rdb"
  else
    # 兜底：直接从 redis 导出
    if [[ -n "$REDIS_PASSWORD" ]]; then
      redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" -a "$REDIS_PASSWORD" --rdb "$BACKUP_DIR/redis-$TS.rdb" >/dev/null 2>&1
    else
      redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" --rdb "$BACKUP_DIR/redis-$TS.rdb" >/dev/null 2>&1
    fi
    log "Redis 导出完成: $BACKUP_DIR/redis-$TS.rdb"
  fi
else
  log "未检测到 redis-cli，跳过 Redis 备份"
fi

# 2) 备份关键文件（配置 + 自定义补丁）
tar -czf "$BACKUP_DIR/crs-files-$TS.tar.gz" \
  "$ROOT_DIR/.env" \
  "$ROOT_DIR/config/config.js" \
  "$ROOT_DIR/data/init.json" \
  "$ROOT_DIR/scripts/custom-overrides" \
  "$ROOT_DIR/scripts/reapply-codex-tutorial.sh"

log "文件备份完成: $BACKUP_DIR/crs-files-$TS.tar.gz"
log "备份完成"

