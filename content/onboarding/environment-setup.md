+++
title = "環境構築ガイド"
description = "研究室PCおよびWikiのローカル環境のセットアップ手順です。"
date = 2026-04-16
updated = 2026-04-16
authors = ["SCR Lab Staff"]
tags = ["環境構築", "Git", "Zola"]
category = "onboarding"
draft = false
weight = 2

[extra]
related = ["onboarding/welcome", "knowledge/git-workflow"]
+++

# 環境構築ガイド

## 1. 必要なツール

| ツール | バージョン | 用途 |
|---|---|---|
| Git | 2.40 以上 | バージョン管理 |
| Python | 3.11 以上 | CLI ツール |
| Zola | 0.19.x | Wiki ビルド（任意：ローカルプレビュー用） |

## 2. リポジトリのクローン

```bash
git clone https://github.com/scr-lab/wiki.git scr-lab-wiki
cd scr-lab-wiki
```

## 3. Zola のインストール（ローカルプレビュー用）

### macOS

```bash
brew install zola
```

### Linux (Ubuntu/Debian)

```bash
ZOLA_VERSION="0.19.2"
curl -sL \
  "https://github.com/getzola/zola/releases/download/v${ZOLA_VERSION}/zola-v${ZOLA_VERSION}-x86_64-unknown-linux-gnu.tar.gz" \
  | tar -xz -C /usr/local/bin
```

### Windows

[Zola リリースページ](https://github.com/getzola/zola/releases) から `zola-v*-x86_64-pc-windows-msvc.zip` をダウンロードし、PATH の通った場所に配置してください。

## 4. ローカルプレビュー

```bash
bash tools/build.sh --serve --drafts
```

ブラウザで `http://127.0.0.1:1111` を開くと、ファイル変更を検知してリロードされます。

## 5. 最初のページを作成する

```bash
python tools/new_page.py "私のはじめてのページ" --category knowledge --author "Yamada Taro"
```

{% callout(type="tip", title="エディタの設定") %}
`$EDITOR` 環境変数を設定しておくと、ページ作成後に自動でエディタが起動します。

```bash
# .bashrc / .zshrc に追加
export EDITOR="code"  # VS Code の場合
export EDITOR="vim"   # Vim の場合
```
{% end %}
