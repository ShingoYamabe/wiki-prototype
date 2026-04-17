+++
title = "GitHub Actions / デプロイ設定"
description = "Wiki の CI/CD パイプライン・デプロイ設定・Teams 通知の管理方法。"
date = 2026-04-16
updated = 2026-04-16
authors = ["SCR Lab Staff"]
tags = ["GitHub Actions", "デプロイ", "CI/CD", "Teams"]
category = "knowledge"
draft = false
weight = 10

[extra]
related = ["onboarding/environment-setup", "knowledge/git-workflow"]
+++

# GitHub Actions / デプロイ設定

## ワークフロー一覧

| ファイル | トリガー | 用途 |
|---|---|---|
| `deploy.yml` | `main` への push | ビルド → GitHub Pages デプロイ → Teams 通知 |
| `validate.yml` | PR 作成・更新 | バリデーション → ビルド確認 → PR コメント |

## GitHub Pages の有効化

1. リポジトリの **Settings** → **Pages** を開く
2. **Source** を `GitHub Actions` に設定する
3. 次回 `main` ブランチへ push すると自動デプロイされる

{% callout(type="info", title="公開範囲") %}
**TBD-01（未決事項）**: Public にするか GitHub Organization 内限定にするかは別途決定してください。
Organization 内限定には GitHub Enterprise が必要です。
{% end %}

## Secrets の設定

### TEAMS_WEBHOOK_URL（MS Teams 通知用）

1. MS Teams の任意チャンネルで **コネクタ** → **Incoming Webhook** を追加
2. Webhook URL をコピー
3. GitHub リポジトリの **Settings** → **Secrets and variables** → **Actions** → **New repository secret**
4. Name: `TEAMS_WEBHOOK_URL`、Value: コピーした URL を貼り付けて保存

### 通知の有効/無効切替

**Settings** → **Secrets and variables** → **Actions** → **Variables** タブで：

| 変数名 | 値 | 効果 |
|---|---|---|
| `TEAMS_NOTIFY_ENABLED` | `true`（または未設定） | 通知を送信する |
| `TEAMS_NOTIFY_ENABLED` | `false` | 通知を無効化する |

## ワークフローの実行時間目安

| ステップ | 所要時間（目安） |
|---|---|
| Zola インストール（初回） | 〜20 秒 |
| Zola インストール（キャッシュ） | 〜5 秒 |
| バリデーション | 〜5 秒 |
| Zola ビルド | 〜15 秒 |
| GitHub Pages デプロイ | 〜20 秒 |
| **合計** | **〜60〜70 秒** |

{% callout(type="tip", title="無料枠の試算") %}
GitHub Actions 無料枠: 月 2,000 分。
1回 2 分 × 30 回/月 = 60 分 → **無料枠の 3% 以内** で十分余裕があります。
{% end %}
