---
status: closed
created_at: 2026-05-24
closed_at: 2026-06-20
---

# issue-04: packages/contracts — 共有 Zod スキーマと型定義

## 概要・背景・目的

yutori の全パッケージが参照する、最も内側の層を構築する。
Zod を仕様記述言語として全面採用し、課題の仕様・採点結果・ユーザー等の
ドメイン型をここに集約する。

このパッケージは何にも依存せず、grader・sandbox・apps/web のすべてがここを参照する。
Zod スキーマが仕様の単一の源 (Single Source of Truth) となることで、
採点・出題 UI・課題作成のすべてが同じ定義を参照できる。

## 受け入れ条件

- [x] packages/contracts/src/ に以下のスキーマが定義されている
  - course.ts (Course / Task のドメイン型)
  - test-case.ts (テスト5観点・TestCase payload)
  - submission.ts (採点結果・観点結果)
  - grading.ts (採点エンジンの入出力インターフェース型)
  - user.ts (User / Profile のドメイン型)
  - cosmetic.ts (Cosmetic 関連のドメイン型)
  - index.ts (re-export)
- [x] 各スキーマから TypeScript の型が推論される (z.infer)
- [x] 単体テスト (Vitest) でスキーマの基本的な parse / safeParse が検証されている
- [x] `make verify` がエラーを発生させない

## 技術的な検討事項

- このパッケージは Zod 以外の外部依存を持たない
- テストケースの payload やヒント辞書の定義など、将来の拡張は JSON カラム内の構造として Zod で型を保証する。DB マイグレーションを伴わずに構造を変更できるようにするため
- nanoID による ID 生成のヘルパーもここに置くかどうかは検討。ID 生成は副作用を持つため、純粋な型定義パッケージに置くべきかは議論の余地がある

## 関連ADR・依存issue

- 関連ADR: docs/adr/0004-zod-as-spec-language.md, docs/adr/0005-nanoid-for-identifiers.md
- 依存: issue-03
- 後続: issue-05, issue-06, issue-07

## 想定工数・優先度

- 工数: 半日
- 優先度: 最高
