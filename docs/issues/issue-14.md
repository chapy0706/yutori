---
status: open
created_at: 2026-05-24
closed_at:
---

# issue-14: テトリスコースのコンテンツ作成

## 概要・背景・目的

MVP の差別化価値を実証するための、テトリスコース1本を作り込む。
課題定義、5観点テスト、ヒント、模範実装、用語辞書のすべてを揃える。

Walking Skeleton 思想に従い、最初の課題で「黒い画面にブロックが1個表示される」
状態をつくり、以降の課題で段階的にゲームを完成させていく。

## 受け入れ条件

- [ ] content/courses/tetris/ 配下にコース定義一式が存在する
  - course.json (コースメタ情報・finalSpec)
  - skeleton/ (全課題共通の骨組み)
  - tasks/ 配下に各課題のディレクトリ
- [ ] 各課題に以下が揃っている
  - task.json (description, targetFiles, timeBudgetMs)
  - contract.ts (Zod スキーマ)
  - tests.ts (5観点のテストケース定義)
  - hints.json (テスト固有ヒント)
  - reference/ (模範実装)
- [ ] 最低8〜10課題が用意されている (Walking Skeleton から ライン消去・スコア表示まで)
- [ ] 各課題の模範実装が、前課題までの模範実装の上で正しく動作する
- [ ] 各課題の5観点テストが grader で正しく採点される
- [ ] 用語辞書のエントリが各課題に付随している
  - 各概念に term, whyExists, searchKeys, goFurther, officialDocs が設定されている
  - ソート用タグ (テーマ別・目的別) が、ゆるく広めに付けられている
- [ ] playable/ に完成版テトリスのビルド済み成果物があり、プレイ画面で動作する
- [ ] `make verify` がエラーを発生させない

## 技術的な検討事項

- 課題の粒度の目安: 1課題で1つの「目に見える変化」が追加される。配列操作を10個やってから最後にゲームになる、という構成は採用しない
- テストの時間制限 (timeBudgetMs) は課題ごとに設定する。パズル系ロジック関数は2000ms 程度が基準
- ヒントは「もしかして〜?」の問いかけ形式で書く
- 用語辞書のタグ設計が初めての実践になる。「想定外の隣人」が現れる程度の、ゆるいタグ付けを意識する
- この issue は工数が大きい。必要に応じて前半 (課題1〜5) と後半 (課題6〜10) に分割してもよい

## 関連ADR・依存issue

- 関連ADR: docs/adr/0004-zod-as-spec-language.md, docs/adr/0007-glossary-as-serendipity-engine.md
- 依存: issue-07, issue-08
- 後続: issue-15

## 想定工数・優先度

- 工数: 2〜3日
- 優先度: 高
