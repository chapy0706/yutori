#!/usr/bin/env bash
# .claude/verify.sh
#
# プロジェクト固有の検証スクリプト。
# .claude/hooks/run-verify.sh（Stop hook）から呼ばれる。
#
# 役割:
#   コードを変更したあと、意図通りか・壊れていないかを確認する。
#   lint / format / type-check / build などをここに並べる。
#
# 方針:
#   - 速い検証（lint, format, type-check）はそのまま並べる
#   - 遅い検証（build）も Stop hook なら毎ターン1回なので許容範囲
#   - 失敗したら非ゼロで終了する。run-verify.sh がそれを Claude に返す
#
# 注意:
#   このファイルは検証の強度そのもの。Claude Code から編集できないよう
#   .claude/settings.json の deny で Edit/Write を禁止すること。

set -euo pipefail

# プロジェクトの技術スタックに合わせて、以下を書き換える。
# 下記は TypeScript / pnpm プロジェクトの例。

echo "[verify] lint"
pnpm biome check .

echo "[verify] type-check"
pnpm tsc --noEmit

echo "[verify] build"
pnpm run build

echo "[verify] passed."
