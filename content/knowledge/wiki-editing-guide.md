+++
title = "Wiki 編集ガイド"
description = "Markdown の書き方・Frontmatter の設定方法・使えるショートコードをまとめます。"
date = 2026-04-16
updated = 2026-04-16
authors = ["SCR Lab Staff"]
tags = ["Markdown", "Wiki", "ガイド"]
category = "knowledge"
draft = false
weight = 2

[extra]
related = ["knowledge/git-workflow", "onboarding/environment-setup"]
+++

# Wiki 編集ガイド

## Frontmatter の書き方

各 Markdown ファイルの先頭に TOML 形式のメタデータ（Frontmatter）を記述します。

```toml
+++
title = "ページタイトル"          # 必須
description = "概要（検索・OGP用）"
date = 2026-04-16                  # 必須（作成日）
updated = 2026-04-16               # 更新日（編集時に更新推奨）
authors = ["Yamada Taro"]
tags = ["ros2", "navigation"]      # 複数設定可
category = "knowledge"             # 必須: onboarding/research/knowledge/projects/meeting
draft = false
weight = 0                         # サイドバー表示順（小さい値が上）

[extra]
related = ["knowledge/git-workflow"]   # 関連ページのパス
+++
```

## Markdown チートシート

### 見出し

```markdown
# H1（ページタイトルに自動使用されるため本文では非推奨）
## H2（目次に表示）
### H3（目次に表示）
#### H4（目次に表示）
```

### コードブロック

````markdown
```python
def hello():
    print("Hello, SCR Lab!")
```
````

### テーブル

```markdown
| 列1 | 列2 | 列3 |
|---|---|---|
| A | B | C |
```

### 内部リンク

```markdown
[環境構築ガイド](../onboarding/environment-setup)
```

## Callout ショートコード

```
{% callout(type="info", title="情報タイトル") %}
本文テキスト
{% end %}
```

利用可能な `type`: `info` / `warning` / `danger` / `tip`

{% callout(type="info", title="info の例") %}
これは情報ボックスです。補足情報や参考リンクに使用します。
{% end %}

{% callout(type="warning", title="warning の例") %}
注意が必要な事項に使用します。
{% end %}

{% callout(type="tip", title="tip の例") %}
ベストプラクティスや Tips に使用します。
{% end %}

{% callout(type="danger", title="danger の例") %}
重要な警告・データ消失リスクなどに使用します。
{% end %}
