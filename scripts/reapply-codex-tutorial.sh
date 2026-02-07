#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OVERRIDES_DIR="$ROOT_DIR/scripts/custom-overrides"

# 扁平模板文件路径（易维护）
TEMPLATE_TUTORIAL_VIEW="$OVERRIDES_DIR/TutorialView.vue"
TEMPLATE_CODEX_TUTORIAL="$OVERRIDES_DIR/CodexTutorial.vue"

# 实际修改的项目文件路径
TARGET_TUTORIAL_VIEW="$ROOT_DIR/web/admin-spa/src/views/TutorialView.vue"
TARGET_CODEX_TUTORIAL="$ROOT_DIR/web/admin-spa/src/components/tutorial/CodexTutorial.vue"

BACKUP_DIR="/tmp/crs-codex-tutorial-backup-$(date +%Y%m%d-%H%M%S)"

log() {
  echo "[codex-tutorial] $*"
}

backup_and_copy() {
  local src="$1"
  local dst="$2"

  if [[ ! -f "$src" ]]; then
    log "缺少模板文件: $src"
    exit 1
  fi

  if [[ -f "$dst" ]]; then
    mkdir -p "$BACKUP_DIR"
    cp -f "$dst" "$BACKUP_DIR/$(basename "$dst").bak"
    log "已备份: $BACKUP_DIR/$(basename "$dst").bak"
  fi

  mkdir -p "$(dirname "$dst")"
  cp -f "$src" "$dst"
  log "已恢复: $dst"
}

restart_service() {
  cd "$ROOT_DIR"

  if command -v crs >/dev/null 2>&1; then
    log "执行服务重启: crs restart"
    crs restart
    return
  fi

  log "未找到 crs 命令，尝试 npm 脚本重启"
  if npm run service:restart:d; then
    return
  fi

  if npm run service:restart; then
    return
  fi

  log "npm 脚本重启失败，尝试 node scripts/manage.js restart -d"
  node scripts/manage.js restart -d
}

main() {
  log "开始恢复 Codex 教程定制文件"

  backup_and_copy "$TEMPLATE_TUTORIAL_VIEW" "$TARGET_TUTORIAL_VIEW"
  backup_and_copy "$TEMPLATE_CODEX_TUTORIAL" "$TARGET_CODEX_TUTORIAL"

  cd "$ROOT_DIR"
  log "安装前端依赖"
  npm run install:web

  log "构建前端"
  npm run build:web

  restart_service
  log "完成：文件已恢复、前端已构建、服务已重启"
}

main "$@"
