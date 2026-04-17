#!/usr/bin/env python3
"""
new_page.py — ページ作成 CLI (F-C01)
依存: 標準ライブラリのみ (NF-M03)

Usage:
  python tools/new_page.py TITLE --category onboarding [--tags tag1,tag2] [--author "Yamada Taro"] [--draft]
  python tools/new_page.py          # 対話形式
"""

import argparse
import os
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

# プロジェクトルート（このスクリプトの親ディレクトリ）
PROJECT_ROOT = Path(__file__).parent.parent
CONTENT_DIR  = PROJECT_ROOT / "content"

# 定義済みカテゴリ (config.toml と同期)
VALID_CATEGORIES = ["onboarding", "research", "knowledge", "projects", "meeting"]


# --------------------------------------------------------------------------
# スラッグ生成
# --------------------------------------------------------------------------

def slugify(text: str) -> str:
    """タイトルをURLスラッグに変換する（ASCII化・小文字・スペース→ハイフン）"""
    # 日本語等をそのまま残す簡易スラッグ（ASCII のみ変換）
    slug = text.lower()
    slug = re.sub(r"[^\w\s\-]", "", slug, flags=re.UNICODE)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = slug.strip("-")
    # ASCII 以外の文字が含まれる場合はユーザに確認
    return slug


def sanitize_slug(slug: str) -> str:
    """スラッグに使用できない文字を除去する"""
    slug = re.sub(r"[^\w\-]", "-", slug, flags=re.ASCII)
    slug = re.sub(r"-{2,}", "-", slug)
    return slug.strip("-").lower()


# --------------------------------------------------------------------------
# Frontmatter テンプレート生成
# --------------------------------------------------------------------------

def build_frontmatter(title: str, category: str, tags: list[str],
                      author: str, draft: bool) -> str:
    today = date.today().isoformat()
    tags_toml = ", ".join(f'"{t}"' for t in tags) if tags else ""
    authors_toml = f'["{author}"]' if author else '[]'
    draft_str = "true" if draft else "false"

    return f"""\
+++
title = "{title}"
description = ""
date = {today}
updated = {today}
authors = {authors_toml}
tags = [{tags_toml}]
category = "{category}"
draft = {draft_str}
weight = 0

[extra]
related = []
+++

<!-- ここに本文を記述 -->
"""


# --------------------------------------------------------------------------
# インタラクティブ入力
# --------------------------------------------------------------------------

def prompt(message: str, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    try:
        value = input(f"{message}{suffix}: ").strip()
    except (EOFError, KeyboardInterrupt):
        print("\n中断しました。")
        sys.exit(1)
    return value if value else default


def prompt_category() -> str:
    print(f"カテゴリ一覧: {', '.join(VALID_CATEGORIES)}")
    while True:
        cat = prompt("カテゴリ", "knowledge")
        if cat in VALID_CATEGORIES:
            return cat
        print(f"  ✗ 無効なカテゴリです。{VALID_CATEGORIES} から選んでください。")


# --------------------------------------------------------------------------
# メイン処理
# --------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="SCR Lab Wiki — ページ作成 CLI (F-C01)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("title", nargs="?", default=None, help="ページタイトル")
    parser.add_argument("--category", "-c", default=None, help=f"カテゴリ: {VALID_CATEGORIES}")
    parser.add_argument("--tags",     "-t", default=None, help="タグ（カンマ区切り）")
    parser.add_argument("--author",   "-a", default=None, help="著者名")
    parser.add_argument("--draft",    "-d", action="store_true", help="ドラフトとして作成")
    args = parser.parse_args()

    # ----- タイトル -----
    title = args.title
    if not title:
        title = prompt("ページタイトル")
        if not title:
            print("✗ タイトルは必須です。")
            sys.exit(1)

    # ----- カテゴリ -----
    category = args.category
    if not category:
        category = prompt_category()
    elif category not in VALID_CATEGORIES:
        print(f"✗ 無効なカテゴリ: {category}  ({VALID_CATEGORIES})")
        sys.exit(1)

    # ----- タグ -----
    tags_raw = args.tags
    if tags_raw is None:
        tags_raw = prompt("タグ（カンマ区切り、なしは空欄）", "")
    tags = [t.strip() for t in tags_raw.split(",") if t.strip()] if tags_raw else []

    # ----- 著者 -----
    author = args.author
    if author is None:
        author = prompt("著者名（なしは空欄）", "")

    # ----- ドラフト -----
    draft = args.draft

    # ----- スラッグ / ファイルパス -----
    proposed_slug = slugify(title)
    print(f"\n提案ファイル名: {proposed_slug}.md")
    slug_input = prompt("ファイル名（変更する場合は入力、そのままなら Enter）", proposed_slug)
    slug = sanitize_slug(slug_input or proposed_slug)

    target_dir  = CONTENT_DIR / category
    target_file = target_dir / f"{slug}.md"

    if target_file.exists():
        print(f"✗ ファイルがすでに存在します: {target_file}")
        overwrite = prompt("上書きしますか？ (y/N)", "N")
        if overwrite.lower() != "y":
            print("中断しました。")
            sys.exit(1)

    # ----- ファイル作成 -----
    target_dir.mkdir(parents=True, exist_ok=True)
    frontmatter = build_frontmatter(title, category, tags, author, draft)
    target_file.write_text(frontmatter, encoding="utf-8")

    print(f"\n✓ ページを作成しました: {target_file.relative_to(PROJECT_ROOT)}")

    # ----- エディタ起動 -----
    editor = os.environ.get("EDITOR") or os.environ.get("VISUAL")
    if editor:
        try:
            subprocess.run([editor, str(target_file)], check=False)
        except FileNotFoundError:
            print(f"  ⚠ エディタ '{editor}' が見つかりませんでした。手動で開いてください。")
    else:
        print(f"  ヒント: $EDITOR 環境変数を設定すると自動でエディタが起動します。")
        print(f"  ファイルパス: {target_file}")


if __name__ == "__main__":
    main()
