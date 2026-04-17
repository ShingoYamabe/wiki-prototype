#!/usr/bin/env bash
# build.sh — ページビルド CLI (F-C02)
# Usage: bash tools/build.sh [--serve] [--drafts]
# 依存: zola

set -euo pipefail

# プロジェクトルートに移動
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}/.."

# --------------------------------------------------------------------------
# 引数パース
# --------------------------------------------------------------------------
SERVE=false
DRAFTS=false

for arg in "$@"; do
  case "${arg}" in
    --serve)  SERVE=true  ;;
    --drafts) DRAFTS=true ;;
    --help|-h)
      echo "Usage: bash tools/build.sh [--serve] [--drafts]"
      echo ""
      echo "Options:"
      echo "  --serve    ローカルプレビューサーバを起動 (zola serve)"
      echo "  --drafts   ドラフトページも含めてビルド"
      exit 0
      ;;
    *)
      echo "✗ 不明なオプション: ${arg}" >&2
      echo "  bash tools/build.sh --help を参照してください。" >&2
      exit 1
      ;;
  esac
done

# --------------------------------------------------------------------------
# zola コマンド確認
# --------------------------------------------------------------------------
if ! command -v zola &>/dev/null; then
  echo "✗ zola が見つかりません。"
  echo "  インストール: https://www.getzola.org/documentation/getting-started/installation/"
  exit 1
fi

echo "▶ Zola バージョン: $(zola --version)"
echo ""

# --------------------------------------------------------------------------
# ビルドまたはサーブ
# --------------------------------------------------------------------------
DRAFT_FLAG=""
if [ "${DRAFTS}" = "true" ]; then
  DRAFT_FLAG="--drafts"
  echo "  [INFO] ドラフトページを含めます"
fi

if [ "${SERVE}" = "true" ]; then
  echo "▶ zola serve を起動します... (Ctrl+C で停止)"
  echo "  ブラウザで http://127.0.0.1:1111 を開いてください"
  echo ""
  # shellcheck disable=SC2086
  exec zola serve ${DRAFT_FLAG}
else
  echo "▶ ビルド開始..."
  BUILD_START=$(date +%s)

  # shellcheck disable=SC2086
  OUTPUT=$(zola build ${DRAFT_FLAG} 2>&1)
  BUILD_EXIT=$?
  BUILD_END=$(date +%s)
  BUILD_TIME=$((BUILD_END - BUILD_START))

  echo "${OUTPUT}"

  if [ "${BUILD_EXIT}" -ne 0 ]; then
    echo ""
    echo "✗ ビルドに失敗しました (終了コード: ${BUILD_EXIT})"
    exit "${BUILD_EXIT}"
  fi

  # ページ数カウント（public/ 内の HTML ファイル数）
  PAGE_COUNT=$(find public/ -name "*.html" 2>/dev/null | wc -l | tr -d ' ')
  echo ""
  echo "✓ ビルド完了 (${BUILD_TIME}秒 / ${PAGE_COUNT} ページ)"
  echo "  出力先: ./public/"
fi
