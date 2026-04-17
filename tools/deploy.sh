#!/usr/bin/env bash
# deploy.sh — デプロイ補助 CLI (F-C04)
# Usage: bash tools/deploy.sh [--dry-run]
#
# 通常は GitHub Actions による自動デプロイを推奨します。
# このスクリプトはローカル確認用途です。

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}/.."

DRY_RUN=false

for arg in "$@"; do
  case "${arg}" in
    --dry-run) DRY_RUN=true ;;
    --help|-h)
      echo "Usage: bash tools/deploy.sh [--dry-run]"
      echo ""
      echo "Options:"
      echo "  --dry-run  ビルドのみ実行し push しない"
      exit 0
      ;;
    *)
      echo "✗ 不明なオプション: ${arg}" >&2
      exit 1
      ;;
  esac
done

# --------------------------------------------------------------------------
# 1. バリデーション (F-C03)
# --------------------------------------------------------------------------
echo "▶ [1/3] バリデーション実行..."
if ! python3 tools/validate.py; then
  echo ""
  echo "✗ バリデーション ERROR が検出されました。デプロイを中断します。"
  exit 1
fi
echo ""

# --------------------------------------------------------------------------
# 2. 未コミット変更チェック
# --------------------------------------------------------------------------
echo "▶ [2/3] Git ステータス確認..."
if git -C . status --porcelain | grep -q .; then
  echo "  ⚠  未コミットの変更があります:"
  git -C . status --short
  echo ""
  if [ "${DRY_RUN}" = "false" ]; then
    read -rp "  続行しますか？ (y/N): " confirm
    if [[ ! "${confirm}" =~ ^[Yy]$ ]]; then
      echo "  中断しました。"
      exit 1
    fi
  else
    echo "  [--dry-run] 確認をスキップします。"
  fi
fi
echo ""

# --------------------------------------------------------------------------
# 3. ビルド
# --------------------------------------------------------------------------
echo "▶ [3/3] ビルド..."
BUILD_START=$(date +%s)

if ! zola build; then
  echo "✗ ビルドに失敗しました。"
  exit 1
fi

BUILD_END=$(date +%s)
PAGE_COUNT=$(find public/ -name "*.html" 2>/dev/null | wc -l | tr -d ' ')
echo "  ✓ ビルド完了 ($((BUILD_END - BUILD_START))秒 / ${PAGE_COUNT} ページ)"
echo ""

# --------------------------------------------------------------------------
# dry-run の場合はここで終了
# --------------------------------------------------------------------------
if [ "${DRY_RUN}" = "true" ]; then
  echo "✓ [--dry-run] ビルドのみ完了。push は行いませんでした。"
  exit 0
fi

# --------------------------------------------------------------------------
# 4. push (通常運用では GitHub Actions を推奨)
# --------------------------------------------------------------------------
echo "  ⚠  通常のデプロイは GitHub Actions (main ブランチへの push) で行います。"
echo "  このスクリプトからの push を行う場合は、以下のコマンドを手動で実行してください:"
echo ""
echo "    git add -A && git commit -m 'update' && git push origin main"
echo ""
echo "✓ ローカルビルド確認完了。"
