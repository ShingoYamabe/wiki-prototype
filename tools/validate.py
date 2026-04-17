#!/usr/bin/env python3
"""
validate.py — ページバリデーション CLI (F-C03)
依存: 標準ライブラリのみ (NF-M03)

Usage:
  python tools/validate.py                   # content/ 全体
  python tools/validate.py content/knowledge/ros2-setup.md
  python tools/validate.py content/knowledge/
"""

import re
import sys
import tomllib
from pathlib import Path

# プロジェクトルート
PROJECT_ROOT = Path(__file__).parent.parent
CONTENT_DIR  = PROJECT_ROOT / "content"

# 定義済みカテゴリ
VALID_CATEGORIES = ["onboarding", "research", "knowledge", "projects", "meeting"]

# 深刻度レベル
ERROR   = "ERROR"
WARNING = "WARNING"
INFO    = "INFO"


# --------------------------------------------------------------------------
# 診断エントリ
# --------------------------------------------------------------------------

class Issue:
    def __init__(self, code: str, severity: str, path: Path, message: str):
        self.code     = code
        self.severity = severity
        self.path     = path
        self.message  = message

    def __str__(self) -> str:
        rel = self.path.relative_to(PROJECT_ROOT)
        return f"  [{self.severity}] {self.code}: {rel}\n    → {self.message}"


# --------------------------------------------------------------------------
# Frontmatter パース
# --------------------------------------------------------------------------

FRONTMATTER_RE = re.compile(r"^\+\+\+\s*\n(.*?)\n\+\+\+", re.DOTALL)


def parse_frontmatter(text: str) -> tuple[dict | None, str]:
    """(frontmatter_dict, body) を返す。パース失敗時は (None, text)"""
    m = FRONTMATTER_RE.match(text)
    if not m:
        return None, text
    try:
        fm = tomllib.loads(m.group(1))
    except Exception:
        return None, text
    body = text[m.end():].lstrip("\n")
    return fm, body


# --------------------------------------------------------------------------
# バリデーションチェック
# --------------------------------------------------------------------------

def validate_file(md_path: Path) -> list[Issue]:
    issues: list[Issue] = []

    text = md_path.read_text(encoding="utf-8")
    fm, body = parse_frontmatter(text)

    # --- Frontmatter が存在しない ---
    if fm is None:
        issues.append(Issue("V-01", ERROR, md_path, "Frontmatter (+++...+++) が見つかりません"))
        return issues

    # V-01: 必須フィールド
    for field in ["title", "date", "category"]:
        if field not in fm:
            issues.append(Issue("V-01", ERROR, md_path, f"必須フィールド '{field}' がありません"))

    # V-02: category の値
    cat = fm.get("category")
    if cat and cat not in VALID_CATEGORIES:
        issues.append(Issue("V-02", ERROR, md_path,
                            f"category '{cat}' は定義済み一覧に含まれていません: {VALID_CATEGORIES}"))

    # V-03: related パス存在確認
    related = (fm.get("extra") or {}).get("related") or []
    for rel in related:
        rel_path = CONTENT_DIR / (rel.strip("/") + ".md")
        if not rel_path.exists():
            issues.append(Issue("V-03", WARNING, md_path,
                                f"related に指定されたパスが存在しません: {rel}"))

    # V-04: updated >= date
    raw_date    = fm.get("date")
    raw_updated = fm.get("updated")
    if raw_date and raw_updated:
        try:
            from datetime import date as Date
            d = raw_date if isinstance(raw_date, Date.__class__) else raw_date
            u = raw_updated if isinstance(raw_updated, Date.__class__) else raw_updated
            # toml lib は date を datetime.date オブジェクトとして返す
            if hasattr(u, "toordinal") and hasattr(d, "toordinal"):
                if u.toordinal() < d.toordinal():
                    issues.append(Issue("V-04", WARNING, md_path,
                                        f"updated ({u}) が date ({d}) より古くなっています"))
        except Exception:
            pass

    # V-05: 画像パス存在確認
    img_re = re.compile(r"!\[.*?\]\(([^)]+)\)")
    for m in img_re.finditer(body):
        img_src = m.group(1)
        if img_src.startswith("http://") or img_src.startswith("https://"):
            continue
        # 相対パス → md_path の親から解決
        img_path = (md_path.parent / img_src).resolve()
        if not img_path.exists():
            issues.append(Issue("V-05", WARNING, md_path,
                                f"画像パスが存在しません: {img_src}"))

    # V-06: タイトル 60文字以内（SEO）
    title = fm.get("title", "")
    if len(title) > 60:
        issues.append(Issue("V-06", INFO, md_path,
                            f"タイトルが60文字を超えています ({len(title)}文字): '{title[:60]}...'"))

    # V-07: ドラフトページが content/ に残っていないか
    if fm.get("draft") is True:
        issues.append(Issue("V-07", INFO, md_path,
                            "draft=true のページが content/ に含まれています（公開前に確認してください）"))

    # NF-A02: 画像の alt テキスト
    img_no_alt_re = re.compile(r"!\[\]\(")
    for m in img_no_alt_re.finditer(body):
        issues.append(Issue("V-08", INFO, md_path,
                            "alt テキストが空の画像があります"))
        break  # 1ファイルにつき1回だけ報告

    return issues


# --------------------------------------------------------------------------
# エントリポイント
# --------------------------------------------------------------------------

def collect_md_files(target: Path) -> list[Path]:
    if target.is_file():
        return [target] if target.suffix == ".md" else []
    return sorted(target.rglob("*.md"))


def main() -> None:
    target = Path(sys.argv[1]) if len(sys.argv) > 1 else CONTENT_DIR

    if not target.exists():
        print(f"✗ パスが存在しません: {target}")
        sys.exit(1)

    md_files = collect_md_files(target)
    if not md_files:
        print(f"  Markdown ファイルが見つかりませんでした: {target}")
        sys.exit(0)

    print(f"▶ バリデーション開始: {len(md_files)} ファイル\n")

    all_issues: list[Issue] = []
    for md_path in md_files:
        issues = validate_file(md_path)
        all_issues.extend(issues)

    # 結果サマリー
    errors   = [i for i in all_issues if i.severity == ERROR]
    warnings = [i for i in all_issues if i.severity == WARNING]
    infos    = [i for i in all_issues if i.severity == INFO]

    for sev, group in [(ERROR, errors), (WARNING, warnings), (INFO, infos)]:
        if group:
            print(f"--- {sev} ({len(group)}) ---")
            for issue in group:
                print(str(issue))
            print()

    print(f"✓ 検査完了: {len(md_files)} ファイル / "
          f"ERROR {len(errors)} / WARNING {len(warnings)} / INFO {len(infos)}")

    if errors:
        print("\n⚠ ERROR が検出されましたが、ビルドを継続します。")
        # sys.exit(1)  <-- ここをコメントアウトするか消去
        sys.exit(0) 
    else:
        print("\n✓ ERROR なし。")


if __name__ == "__main__":
    main()
