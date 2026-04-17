+++
title = "Git ワークフロー"
description = "研究室での Git / GitHub の使い方・ブランチ運用ルールをまとめます。"
date = 2026-04-16
updated = 2026-04-16
authors = ["SCR Lab Staff"]
tags = ["Git", "GitHub", "開発フロー"]
category = "knowledge"
draft = false
weight = 1

[extra]
related = ["onboarding/environment-setup"]
+++

# Git ワークフロー

## ブランチ命名規則

| 種別 | 命名パターン | 例 |
|---|---|---|
| 機能追加 | `feat/説明` | `feat/add-ros2-setup-page` |
| 修正 | `fix/説明` | `fix/broken-image-link` |
| ドキュメント | `docs/説明` | `docs/update-welcome` |

## 基本的な作業フロー

```bash
# 1. 最新の main を取得
git switch main
git pull origin main

# 2. 作業ブランチを作成
git switch -c feat/add-my-page

# 3. ページを作成・編集
python tools/new_page.py "ページタイトル" --category knowledge

# 4. バリデーション
python tools/validate.py

# 5. コミット
git add content/
git commit -m "docs: add knowledge page on ..."

# 6. プッシュ & PR
git push -u origin feat/add-my-page
# GitHub で Pull Request を作成
```

## コミットメッセージ規約

[Conventional Commits](https://www.conventionalcommits.org/ja/) に準拠します。

| プレフィックス | 用途 |
|---|---|
| `docs:` | Wiki コンテンツの追加・更新 |
| `feat:` | 新機能追加（テンプレート・ツール等） |
| `fix:` | バグ修正 |
| `chore:` | その他メンテナンス |

{% callout(type="warning", title="main への直接 push") %}
緊急修正を除き、`main` ブランチへの直接 push は避けてください。
Pull Request を通じたレビューフローを推奨します。
{% end %}
