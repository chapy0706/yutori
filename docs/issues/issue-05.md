---
status: open
created_at: 2026-05-24
closed_at:
---

# issue-05: DB スキーマと認証基盤 (Supabase Auth + Drizzle)

## 概要・背景・目的

Supabase をデータ基盤として接続し、Drizzle ORM でスキーマを定義する。
認証は Supabase Auth を利用し、users テーブルは auth.users.id を参照する薄い存在とする。

設計仕様書の方針に従い、コンテンツ系 (Course / Task) と
活動記録系 (Submission / TaskProgress) をテーブルとして明確に分ける。
変化の速度と所有者が異なるデータを混ぜないことで、
将来のキャッシュ戦略やバックアップ方針に余地を残す。

## 受け入れ条件

- [ ] Supabase プロジェクトが作成され、接続情報が環境変数で管理されている
- [ ] apps/web/src/infra/db/schema.ts に Drizzle スキーマが定義されている
  - 学習者系: users, profiles
  - コンテンツ系: courses, tasks, test_cases, hints
  - 活動記録系: submissions, task_progress
  - 他者性: encouragement_messages, daily_bonuses
  - Cosmetic 系: cosmetic_items, user_inventory, user_loadout
- [ ] apps/web/src/infra/db/client.ts に DB 接続クライアントが設定されている
- [ ] Supabase Auth によるサインアップ・ログイン・ログアウトが動作する
- [ ] apps/web/src/infra/auth/supabase-auth.ts に認証連携が実装されている
- [ ] Drizzle のマイグレーションが実行可能である
- [ ] `make verify` がエラーを発生させない

## 技術的な検討事項

- profiles の motionPreference は初回アクセス時に OS 設定 (prefers-reduced-motion) を取得してセットする想定だが、この issue では DB カラムの用意のみ。UI 連携は issue-08 以降
- テストケース・ヒントの payload は jsonb カラムに格納する。型は contracts の Zod スキーマで保証し、DB は不透明な塊として扱う
- ガチャ・イベント関連テーブル (デイリーガチャ履歴、期間限定イベント定義、スキップアイテムの出現制御) は未設計のため、この issue では対象外。未決事項として残す

## 関連ADR・依存issue

- 関連ADR: docs/adr/0003-supabase-over-neon.md
- 依存: issue-03, issue-04 (contracts の型定義を参照)
- 後続: issue-08, issue-09, issue-10

## 想定工数・優先度

- 工数: 1日
- 優先度: 最高
