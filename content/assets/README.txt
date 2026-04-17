+++
render = false
weight = 999
+++

# assets/

ページで使用する画像・添付ファイルをここに配置します。

## ディレクトリ構成（推奨）

ページごとにサブディレクトリを作成してください。

```
assets/
├── onboarding/
│   └── setup-screenshot.png
├── research/
│   └── rover-diagram.svg
└── projects/
    └── rover-2025/
        └── system-diagram.png
```

## 画像の参照方法

Markdown 内から相対パスで参照します：

```markdown
![システム構成図](../../assets/projects/rover-2025/system-diagram.png)
```

## 注意事項

- ファイルサイズは **1MB 以内** を目安にしてください。
- スクリーンショット等は PNG、図・ダイアグラムは SVG を推奨します。
- `alt` テキストを必ず付与してください（アクセシビリティ要件 NF-A02）。
