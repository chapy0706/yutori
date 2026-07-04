---
status: closed
created_at: 2026-05-24
closed_at: 2026-07-04
---

# issue-07: packages/grader — 採点エンジン

## 概要・背景・目的

yutori の中核である採点エンジンを構築する。
sandbox (issue-06) に「実行」を依頼し、自らは「判定」と「フィードバック生成」を担う。

5観点 (構造・契約・基本・仕様・頑健) をチェックポイント方式で上から順に確認し、
失敗した時点で以降を打ち切る。各観点の通過状況は逐次レポートする。

## 受け入れ条件

- [ ] 採点パイプラインの本体 (pipeline/grade.ts) が、sandbox を呼び出して一連の採点を実行できる
- [ ] Biome による初期構文チェック段階 (pipeline/lint-stage.ts) が動作する
- [ ] チェックポイント方式で観点を順に確認し、失敗時に打ち切る制御 (pipeline/checkpoint.ts) が動作する
- [ ] 5観点それぞれの判定ロジック (axes/) が実装されている
  - 構造観点: エクスポートの有無
  - 契約観点: Zod スキーマによる引数・戻り値の型判定
  - 基本観点: 単純入力のスモークテスト
  - 仕様観点: Zod スキーマ適合の判定
  - 頑健観点: 不正・空入力
- [ ] 過去課題の整合性チェックと模範実装への差し替え (verdict/degradation.ts) が動作する
- [ ] ヒントの解決 (feedback/hint-resolver.ts) が、固有 → パターン → リンタ委譲の順で動作する
- [ ] 採点結果が contracts の型に準拠した構造化データとして返る
- [ ] sandbox をモック化した単体テスト (Vitest) で、各観点の合否判定が検証されている
- [ ] sandbox と結合した結合テストで、おもちゃ課題 (add 関数など) の採点が端から端まで通る
- [ ] `make verify` がエラーを発生させない

## 技術的な検討事項

- このパッケージは Next.js も DB も知らない純粋な部品。入力は「ユーザーコード + テストケース定義」、出力は「採点結果」のみ
- sandbox をモック化することで、grader 単体のテストを軽量に回せる構造を保つ。sandbox と grader を分けた設計判断が、ここで効く
- Biome の lint-stage はブラウザ内で動かすか Node.js 側で動かすかの選択がある。MVP ではサーバーサイド (API Route) で Biome CLI を呼ぶ方式が現実的
- ヒント辞書 (feedback/hint-dictionary.ts) の初期エントリは最小限でよい。テトリスコースの課題作成 (issue-14) で本格的に育てる

## 関連ADR・依存issue

- 関連ADR: docs/adr/0002-grading-with-quickjs-wasm.md, docs/adr/0004-zod-as-spec-language.md
- 依存: issue-04, issue-06
- 後続: issue-08

## 想定工数・優先度

- 工数: 1〜2日
- 優先度: 最高
