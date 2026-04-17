# SCR Lab Wiki — システム仕様書

**文書番号**: SCR-WIKI-SPEC-001  
**版**: 0.1 (Draft)  
**作成日**: 2026-04-16  
**対象リポジトリ**: `scr-lab/wiki`　(予定)

**最終編集者**: 山部

---

## 目次

1. [概要](#1-概要)
2. [技術スタック](#2-技術スタック)
3. [技術制約](#3-技術制約)
4. [リポジトリ構成](#4-リポジトリ構成)
5. [機能要件](#5-機能要件)
6. [非機能要件](#6-非機能要件)
7. [デザイン仕様](#7-デザイン仕様)
8. [GitHub Actions ワークフロー](#8-github-actions-ワークフロー)
9. [MS Teams 通知仕様](#9-ms-teams-通知仕様)
10. [用語定義](#10-用語定義)
11. [未決事項](#11-未決事項)

---

## 1. 概要

### 1.1 目的

システム制御・ロボティクス研究室（SCR Lab）の情報・活動記録を一元管理するWikiを構築する。新規運用のため、**加筆・編集のしやすさ**を最優先とし、メンバーが積極的に情報を更新できる環境を目指す。

### 1.2 運用方針

- コンテンツはMarkdownで記述し、GitHubでバージョン管理する。
- ビルドはZolaで行い、成果物をGitHub Pagesで公開する。
- CI/CDはGitHub Actionsで自動化するが、無料枠の制限内に収める。
- DBやサーバサイド処理は一切持たない（完全静的サイト）。

### 1.3 想定ユーザー

| ユーザー種別 | 主な操作 |
|---|---|
| 研究室メンバー（学生・研究員） | ページ閲覧・作成・編集 |
| 指導教員 | ページ閲覧・レビュー |
| 外部訪問者（公開範囲のみ） | ページ閲覧 |

---

## 2. 技術スタック

| 役割 | 技術 | バージョン |
|---|---|---|
| 静的サイトジェネレータ | [Zola](https://www.getzola.org/) | 最新安定版 |
| ホスティング | GitHub Pages | — |
| CI/CD | GitHub Actions | — |
| 通知 | MS Teams Incoming Webhook | — |
| コンテンツ記述 | Markdown (CommonMark + Zola拡張) | — |
| CLIツール | Python 3.11+ / Bash | — |

---

## 3. 技術制約

| 制約 | 内容 | 理由 |
|---|---|---|
| TC-01 | フロントエンドフレームワーク（React/Vue等）不使用 | ビルド複雑化・ページ重量化の回避 |
| TC-02 | DB不使用（全データをファイル管理） | サーバレス維持 |
| TC-03 | サーバサイド処理不使用 | 静的ホスティング制約 |
| TC-04 | GitHub Actions は無料枠（月2,000分）内に収める | コスト抑制 |
| TC-05 | 外部CDNは最小限（フォント・軽量JSのみ） | オフライン耐性・依存削減 |

---

## 4. リポジトリ構成

```
scr-lab-wiki/
├── .github/
│   └── workflows/
│       ├── deploy.yml          # ビルド & GitHub Pages デプロイ
│       └── notify.yml          # Teams 更新通知
├── config.toml                 # Zola 設定
├── templates/                  # Zola テンプレート (HTML/Tera)
│   ├── base.html
│   ├── index.html
│   ├── page.html
│   ├── section.html
│   └── partials/
│       ├── header.html
│       ├── sidebar.html
│       ├── footer.html
│       ├── search.html
│       └── related_pages.html
├── static/                     # 静的アセット
│   ├── css/
│   │   ├── main.css
│   │   └── syntax.css          # コードハイライト
│   ├── js/
│   │   ├── sidebar.js          # 折り畳みサイドバー
│   │   └── search.js           # クライアント側検索 (Elasticlunr)
│   └── fonts/                  # ローカルフォント（任意）
├── tools/                      # CLIツール群
│   ├── new_page.py             # F-C01: ページ作成 CLI
│   ├── build.sh                # F-C02: ビルド CLI
│   ├── validate.py             # F-C03: バリデーション CLI
│   └── deploy.sh               # F-C04: デプロイ補助 CLI
├── sandbox/                    # 実験・草稿用（公開対象外）
└── content/                    # Wiki コンテンツ（Zola標準）
    ├── _index.md               # トップページ
    ├── onboarding/
    │   ├── _index.md
    │   └── *.md
    ├── research/
    │   ├── _index.md
    │   └── *.md
    ├── knowledge/
    │   ├── _index.md
    │   └── *.md
    ├── projects/
    │   ├── _index.md
    │   └── *.md
    ├── meeting/
    │   ├── _index.md
    │   └── *.md
    └── assets/                 # 画像・添付ファイル
        └── (ページ別サブディレクトリ)
```

> **Note**: Zola の慣例に合わせ、`wiki/` ではなく `content/` をルートとする。`config.toml` でベースURLと検索インデックスを管理する。

### 4.1 コンテンツカテゴリ

| ディレクトリ | 用途 |
|---|---|
| `onboarding/` | 新メンバー向け案内・環境構築手順 |
| `research/` | 研究テーマ・手法・文献まとめ |
| `knowledge/` | 技術ノウハウ・ツール使用法 |
| `projects/` | プロジェクト別進捗・設計記録 |
| `meeting/` | 議事録・定例メモ |
| `assets/` | 画像・図・添付ファイル |

### 4.2 Frontmatter 標準形式

```toml
+++
title = "ページタイトル"
description = "ページの概要（検索・OGP用）"
date = 2026-04-16
updated = 2026-04-16
authors = ["Yamada Taro"]
tags = ["ros2", "navigation"]
category = "knowledge"   # onboarding / research / knowledge / projects / meeting
draft = false
weight = 0               # サイドバー表示順（小さい値が上）

[extra]
related = ["knowledge/ros2-setup", "projects/rover-2025"]
+++
```

---

## 5. 機能要件

### F-A: コンテンツ管理（コア）

#### F-A01 ページ作成

- Markdownファイルとして `content/` 配下の適切なカテゴリに配置する。
- Frontmatterの必須フィールド：`title`, `date`, `category`。
- `draft = true` を指定したページはビルド時に除外される。

#### F-A02 ページ編集

- GitHubのWebエディタ、またはローカルのエディタでMarkdownを直接編集する。
- `updated` フィールドを編集日付に更新することを推奨とする（F-C03で自動チェック）。
- Pull Requestを経由したレビューフローを任意で運用可能とする。

#### F-A03 ページ分類

- **タグ**（`tags`）：複数設定可。クロスカテゴリな横断分類に使用。
- **カテゴリ**（`category`）：1ページにつき1カテゴリ。ディレクトリ構造と対応。
- タグ一覧ページ（`/tags/`）はZolaのtaxonomy機能で自動生成する。

#### F-A04 ページ表示

- MarkdownをZolaがHTMLにレンダリングし、テンプレートに埋め込む。
- ページ内の見出し（H2〜H4）から目次（ToC）を自動生成し、右側または上部に表示する。
- 最終更新日（`updated`）・著者（`authors`）をページ上部に表示する。
- `assets/` 内の画像を相対パスで参照可能とする。

---

### F-B: ナビゲーション・探索

#### F-B01 ページ階層管理ナビゲーション（サイドバー）

- 左サイドバーにカテゴリ→ページの2階層ツリーを表示する。
- 各カテゴリは折り畳み/展開可能（デフォルト：現在のカテゴリのみ展開）。
- 現在表示中のページをハイライト表示する。
- `weight` フィールドによる表示順のカスタマイズに対応する。
- サイドバー状態（折り畳み）はsessionStorageに保持する。

#### F-B02 ページ検索

- Zolaの検索インデックス生成機能（`build_search_index = true`）を使用する。
- クライアントサイドでElasticlunr.jsによる全文検索を実装する。
- 検索対象：タイトル・本文・タグ。
- 検索結果にページタイトル・カテゴリ・スニペットを表示する。
- ヘッダの検索バーから即時検索（インクリメンタルサーチ）に対応する。

#### F-B03 関連ページ表示

- Frontmatterの `[extra].related` フィールドに関連ページのパスを手動指定する。
- ページ下部に「関連ページ」セクションとしてカード形式で表示する。
- 同一タグを持つページを最大3件まで自動的に補完表示する（タグベースの自動関連）。

---

### F-C: CLIツール

#### F-C01 ページ作成 CLI (`tools/new_page.py`)

```
Usage: python tools/new_page.py [OPTIONS] TITLE

Options:
  --category  TEXT   コンテンツカテゴリ [必須]
  --tags      TEXT   タグ（カンマ区切り）
  --author    TEXT   著者名
  --draft            ドラフトとして作成
```

- 対話形式でもパラメータ指定形式でも動作する。
- Frontmatterテンプレートを自動生成し、エディタを起動する（`$EDITOR`環境変数を参照）。
- ファイル名はタイトルをスラッグ化（ASCII化・小文字・スペース→ハイフン）したものを提案し、確認を求める。

#### F-C02 ページビルド CLI (`tools/build.sh`)

```
Usage: bash tools/build.sh [--serve] [--drafts]

Options:
  --serve    ローカルプレビューサーバを起動 (zola serve)
  --drafts   ドラフトページも含めてビルド
```

- `zola build` または `zola serve` のラッパー。
- ビルド成否とページ数をターミナルに出力する。

#### F-C03 ページバリデーション CLI (`tools/validate.py`)

以下の項目を検査し、警告/エラーを報告する。

| コード | 検査項目 | 深刻度 |
|---|---|---|
| V-01 | 必須Frontmatterフィールドの欠落（title, date, category） | ERROR |
| V-02 | `category` の値が定義済み一覧に含まれるか | ERROR |
| V-03 | `related` に指定されたパスが存在するか | WARNING |
| V-04 | `updated` フィールドが `date` より古くないか | WARNING |
| V-05 | 画像パスが存在するか（相対パス参照） | WARNING |
| V-06 | タイトルが60文字以内か（SEO推奨） | INFO |
| V-07 | ドラフトページが `content/` に残っていないか | INFO |

```
Usage: python tools/validate.py [PATH]
  PATH: ファイルまたはディレクトリ（省略時は content/ 全体）
```

#### F-C04 デプロイ補助 CLI (`tools/deploy.sh`)

```
Usage: bash tools/deploy.sh [--dry-run]
```

- バリデーション（F-C03）を実行し、ERRORがあれば中断する。
- `git status` で未コミットの変更を検出した場合は警告を表示する。
- `--dry-run` 時はビルドのみ実行しpushしない。
- 通常はGitHub Actionsによる自動デプロイを推奨とし、このCLIはローカル確認用とする。

---

### F-D: 更新通知

#### F-D01 更新概要収集

- GitHub Actionsのdeployワークフロー内で、直前のコミットとの差分から変更ページ一覧を取得する。
- 収集情報：変更ページのタイトル・パス・変更種別（追加/更新/削除）・コミットメッセージ。

#### F-D02 更新通知（MS Teams）

- `main` ブランチへのpush → デプロイ成功後にTeams通知を送信する。
- 通知形式：Adaptive Card（タイトル・変更ページリスト・GitHubリンク）。
- 通知の送受信先Webhookは GitHub Secrets (`TEAMS_WEBHOOK_URL`) で管理する。
- デプロイ失敗時にも別フォーマットで通知する（エラー内容・ログリンクを含む）。
- 通知の有効/無効はワークフロー変数で切り替え可能とする。

---

## 6. 非機能要件

### 6.1 パフォーマンス

| ID | 要件 |
|---|---|
| NF-P01 | Lighthouse Performance スコア 90以上（モバイル環境） |
| NF-P02 | ページ初回表示（LCP）3秒以内（標準的なキャンパス回線） |
| NF-P03 | 検索インデックスサイズ 5MB以内（大量ページ対策） |

### 6.2 メンテナビリティ

| ID | 要件 |
|---|---|
| NF-M01 | テンプレート・CSS・CLIツールにコメントを記述し、新メンバーが単独で運用変更可能とする |
| NF-M02 | Zolaのバージョンアップに追従するため、バージョンを `config.toml` に明記する |
| NF-M03 | `tools/` 配下のCLIは依存ライブラリを標準ライブラリのみに限定する（インストール不要） |

### 6.3 アクセシビリティ

| ID | 要件 |
|---|---|
| NF-A01 | WCAG 2.1 Level AA 準拠を目指す |
| NF-A02 | 画像に `alt` テキストを付与するよう、F-C03バリデーションで検査する（INFO） |
| NF-A03 | キーボードのみで主要操作（検索・ナビゲーション）が可能であること |

### 6.4 セキュリティ

| ID | 要件 |
|---|---|
| NF-S01 | Webhookトークン等の秘匿情報はすべてGitHub Secretsで管理し、リポジトリに直書きしない |
| NF-S02 | 静的サイトのため認証機能は持たない。公開範囲の制御はGitHub Pagesの設定（PublicまたはOrg内限定）で行う |

### 6.5 可用性

| ID | 要件 |
|---|---|
| NF-AV01 | GitHub Pages の SLAに依存する（追加SLA要件なし） |
| NF-AV02 | デプロイ失敗時も直前の公開版が引き続き表示される（GitHub Pagesの標準動作） |

---

## 7. デザイン仕様

### 7.1 デザイン方針

アカデミックな知的雰囲気を基調とし、長時間の閲覧でも疲れにくい配色・フォントを採用する。装飾を最小限にとどめ、コンテンツの読みやすさを最優先とする。

### 7.2 カラーパレット

#### ライトモード

| トークン | 値 | 用途 |
|---|---|---|
| `--bg` | `#FAFAFA` | ページ背景 |
| `--bg-sidebar` | `#F3F4F6` | サイドバー背景 |
| `--bg-card` | `#FFFFFF` | カード・コードブロック背景 |
| `--text-primary` | `#1A1A2E` | 本文・見出し |
| `--text-secondary` | `#4A4A6A` | キャプション・補足テキスト |
| `--text-muted` | `#8A8AA0` | プレースホルダ・メタ情報 |
| `--accent` | `#2D5BE3` | リンク・アクティブ要素（研究室イメージカラー：青） |
| `--accent-hover` | `#1A3FB0` | リンクホバー |
| `--border` | `#E2E4EA` | 区切り線・ボーダー |
| `--code-bg` | `#EEF0F5` | インラインコード背景 |
| `--warning-bg` | `#FFF8E1` | 注意ボックス背景 |
| `--warning-border`| `#F9A825` | 注意ボックスボーダー |
| `--info-bg` | `#E3F0FF` | 情報ボックス背景 |
| `--info-border` | `#2D5BE3` | 情報ボックスボーダー |

#### ダークモード

| トークン | 値 | 用途 |
|---|---|---|
| `--bg` | `#0F1117` | ページ背景 |
| `--bg-sidebar` | `#161B26` | サイドバー背景 |
| `--bg-card` | `#1C2233` | カード・コードブロック背景 |
| `--text-primary` | `#E8EAF0` | 本文・見出し |
| `--text-secondary` | `#A0A8C0` | キャプション・補足テキスト |
| `--text-muted` | `#606880` | プレースホルダ・メタ情報 |
| `--accent` | `#6B9BF8` | リンク・アクティブ要素 |
| `--accent-hover` | `#8FB3FF` | リンクホバー |
| `--border` | `#2A3048` | 区切り線・ボーダー |
| `--code-bg` | `#1C2233` | インラインコード背景 |
| `--warning-bg` | `#2A220A` | 注意ボックス背景 |
| `--warning-border`| `#C9891A` | 注意ボックスボーダー |
| `--info-bg` | `#0A1A30` | 情報ボックス背景 |
| `--info-border` | `#6B9BF8` | 情報ボックスボーダー |

> カラーモード切替は `prefers-color-scheme` メディアクエリを基本とし、手動切替ボタンもヘッダに配置する。設定はlocalStorageに保持する。

### 7.3 フォント・書式

#### フォント定義

| 役割 | フォント（優先順位） | サイズ | 字間・行間 |
|---|---|---|---|
| 見出し H1 | `'Noto Serif JP', Georgia, serif` | 1.8rem | `line-height: 1.4` |
| 見出し H2 | 同上 | 1.4rem | `line-height: 1.4` |
| 見出し H3 | `'Noto Sans JP', system-ui, sans-serif` | 1.15rem | — |
| 見出し H4 | 同上 / bold | 1rem | — |
| 本文 | `'Noto Sans JP', system-ui, sans-serif` | 1rem (16px) | `line-height: 1.8` / `letter-spacing: 0.02em` |
| ソースコード | `'JetBrains Mono', 'Fira Code', Consolas, monospace` | 0.875rem | `line-height: 1.6` |
| キャプション | 本文フォント | 0.875rem | — |

- 欧文見出し：`'Inter', system-ui, sans-serif` を追加候補とする。
- フォントはGoogle Fonts CDN経由で読み込む（`display=swap`指定でCLS回避）。

#### テキスト余白

- 本文の最大幅（コンテンツ列）：`780px`
- 段落間余白：`1rem`
- 見出し前余白：`H2: 2rem` / `H3: 1.5rem`

### 7.4 レイアウト

```
┌──────────────────────────────────────────────────┐
│                    HEADER                        │
├──────────┬───────────────────────┬───────────────┤
│          │                       │               │
│ SIDEBAR  │    MAIN CONTENT       │   TOC (任意)  │
│ (240px)  │    (max 780px)        │   (200px)     │
│          │                       │               │
├──────────┴───────────────────────┴───────────────┤
│                    FOOTER                        │
└──────────────────────────────────────────────────┘
```

- レスポンシブ対応：幅 `< 960px` でサイドバーをドロワー（ハンバーガーメニュー）に変更。
- 幅 `< 1200px` でToCを非表示（本文内の固定ToCに切替）。

#### ヘッダ

- 左側：「**SCR Lab Wiki**」ロゴ → クリックでトップページ（`/`）に遷移。
- 中央：検索バー（F-B02）。
- 右側：カラーモード切替ボタン / GitHubリポジトリリンク（アイコン）。
- 高さ：`60px` 固定。スクロールに追従（`position: sticky`）。

#### サイドバー

- 幅：`240px`。
- カテゴリ名（大文字）+ 配下ページのツリー表示。
- 各カテゴリ行はクリックで折り畳み/展開。初期状態は現在のカテゴリのみ展開。
- ページ数が多い場合はカテゴリ内をスクロール可能とする（`overflow-y: auto`）。
- アクティブページに左ボーダー（`--accent`色）を表示。

#### フッター

- 右下に「▲ ページ上部へ戻る」ボタン（スクロール位置に応じてフェードイン）。
- フッター本体：コピーライト表記 / 最終ビルド日時 / GitHubリンク。

### 7.5 コンポーネント

#### 見出し

- H2 以下に `¶`（パーマリンクアイコン）をホバーで表示し、クリックでアンカーURLをコピー。

#### コードブロック

- Zola組み込みのSyntax Highlighting（[Syntect](https://github.com/trishume/syntect)）を使用。
- テーマ：ライト `base16-ocean.light` / ダーク `base16-ocean.dark`（Zolaプリセット）。
- ファイル名（言語ラベル）を右上に表示。
- コピーボタンをホバーで表示。
- 行番号表示はオプション（Frontmatterの `[extra].line_numbers = true` で有効化）。

#### カラーボックス（Shortcode）

```
{{ callout(type="info", title="タイトル") }}
本文
{{ end() }}
```

| type | 用途 | 色 |
|---|---|---|
| `info` | 補足情報・参考 | 青 (`--info-*`) |
| `warning` | 注意・留意事項 | 黄 (`--warning-*`) |
| `danger` | 重要警告 | 赤 |
| `tip` | ベストプラクティス | 緑 |

#### リンク

- 内部リンク：下線なし / ホバーで下線 + `--accent`色。
- 外部リンク：末尾に外部リンクアイコン（`↗`）を自動付与。
- リンクカット防止：`word-break: break-all` は適用せず、適切な位置で折り返す。

---

## 8. GitHub Actions ワークフロー

### 8.1 デプロイワークフロー (`deploy.yml`)

```
トリガー: push to main

Steps:
  1. Checkout リポジトリ
  2. Zola インストール（バイナリ直接取得）
  3. zola build
  4. GitHub Pages へデプロイ (actions/deploy-pages)
  5. 更新情報を収集（変更ファイル一覧）
  6. Teams 通知送信（F-D02）
```

- Zola は GitHub Release からバイナリを直接取得し、npm/cargo によるインストールを避ける（実行時間短縮）。
- キャッシュ：Zolaバイナリをキャッシュして二重取得を防ぐ。
- 想定実行時間：**2分以内**（無料枠節約のための目標値）。

### 8.2 バリデーションワークフロー（PR時）

```
トリガー: pull_request to main

Steps:
  1. Checkout
  2. Zola インストール
  3. python tools/validate.py （ERRORがあればジョブ失敗）
  4. zola build --drafts （ビルド確認）
```

---

## 9. MS Teams 通知仕様

### 9.1 通知カード形式（成功時）

```json
{
  "type": "AdaptiveCard",
  "body": [
    { "type": "TextBlock", "text": "📝 SCR Lab Wiki が更新されました", "weight": "Bolder" },
    { "type": "TextBlock", "text": "更新ページ", "weight": "Bolder" },
    { "type": "TextBlock", "text": "- [ページ名](URL)\n- ..." },
    { "type": "TextBlock", "text": "by @author | YYYY-MM-DD HH:MM" }
  ],
  "actions": [
    { "type": "Action.OpenUrl", "title": "Wiki を開く", "url": "https://..." }
  ]
}
```

### 9.2 通知カード形式（失敗時）

```json
{
  "body": [
    { "type": "TextBlock", "text": "❌ SCR Lab Wiki のデプロイが失敗しました", "color": "Attention" },
    { "type": "TextBlock", "text": "コミット: <SHA>\nエラー概要: <message>" }
  ],
  "actions": [
    { "type": "Action.OpenUrl", "title": "Actions ログを確認", "url": "<run_url>" }
  ]
}
```

---

## 10. 用語定義

| 用語 | 定義 |
|---|---|
| ページ | `content/` 配下の1つの `.md` ファイルに対応するWikiの1記事 |
| セクション | `_index.md` を持つディレクトリ（Zolaの概念）。本仕様書ではカテゴリと同義 |
| Frontmatter | Markdownファイル先頭の `+++`〜`+++` で囲まれたTOML形式のメタデータ |
| スラッグ | URLの一部となるASCII文字列（例: `ros2-setup`） |
| ドラフト | `draft = true` を指定した未公開ページ |

---

## 11. 未決事項

| No. | 項目 | 検討内容 | 優先度 |
|---|---|---|---|
| TBD-01 | GitHub Pagesの公開範囲 | Publicか、GitHub Org内限定（Enterpriseが必要）か | High |
| TBD-02 | 検索インデックスの言語設定 | Elasticlunrの日本語対応（形態素解析）を行うか | Medium |
| TBD-03 | ToCの表示位置 | 右カラム固定 vs ページ上部埋め込み | Low |
| TBD-04 | 画像の最適化 | Zolaの `resize_image` ショートコードを使用するか | Low |
| TBD-05 | アクセス解析 | Privacy-friendlyな解析ツール（Plausible等）の導入可否 | Low |
| TBD-06 | PDF出力 | 議事録等のPDF出力機能が必要か | Low |

---
