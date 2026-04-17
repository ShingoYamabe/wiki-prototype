# SCR Lab Wiki

システム制御・ロボティクス研究室（SCR Lab）の知識・活動記録を一元管理するWikiです。

[![Deploy to GitHub Pages](https://github.com/scr-lab/wiki/actions/workflows/deploy.yml/badge.svg)](https://github.com/scr-lab/wiki/actions/workflows/deploy.yml)

## 📖 Wiki を見る

→ **https://scr-lab.github.io/wiki**

---

## 🚀 クイックスタート（編集者向け）

### 新しいページを作成する

```bash
python tools/new_page.py "ページタイトル" --category knowledge
```

### ローカルでプレビューする

```bash
bash tools/build.sh --serve
```

ブラウザで http://127.0.0.1:1111 を開いてください。

### バリデーションを実行する

```bash
python tools/validate.py
```

---

## 📁 ディレクトリ構成

```
content/
├── onboarding/   新メンバー向け案内・環境構築
├── research/     研究テーマ・手法・文献
├── knowledge/    技術ノウハウ・ツール使用法
├── projects/     プロジェクト別進捗・設計記録
├── meeting/      議事録・定例メモ
└── assets/       画像・添付ファイル

tools/
├── new_page.py   ページ作成 CLI
├── build.sh      ビルド CLI
├── validate.py   バリデーション CLI
└── deploy.sh     デプロイ補助 CLI
```

## 🛠 技術スタック

| 役割 | 技術 |
|---|---|
| 静的サイトジェネレータ | [Zola](https://www.getzola.org/) 0.19.x |
| ホスティング | GitHub Pages |
| CI/CD | GitHub Actions |
| 通知 | MS Teams Incoming Webhook |

## ⚙️ セットアップ（管理者向け）

1. このリポジトリを fork またはテンプレートとして使用する
2. GitHub Pages を有効化（Settings > Pages > Source: GitHub Actions）
3. `TEAMS_WEBHOOK_URL` を GitHub Secrets に設定（任意）
4. `config.toml` の `base_url` を更新する

詳細は [環境構築ガイド](content/onboarding/environment-setup.md) を参照してください。

---

## 📝 コントリビューション

ページの追加・修正は Pull Request でお願いします。
詳細は [Wiki 編集ガイド](content/knowledge/wiki-editing-guide.md) を参照してください。
