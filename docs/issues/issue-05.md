---
status: open
created_at: 2026-05-24
closed_at:
---

# issue-05: DB スキーマと認証基盤 (Keycloak + Auth.js + Drizzle)

## 概要・背景・目的

A1 上の PostgreSQL をデータ基盤として接続し、Drizzle ORM でスキーマを定義する。
認証は A1 上の Keycloak を IdP とし、アプリ側は Auth.js (NextAuth) の
Keycloak プロバイダーで委譲する。

当初は Supabase Auth + Supabase の PostgreSQL を前提としていたが、
Oracle Cloud A1 の取得に伴いセルフホスト構成へ移行した (ADR 0008)。
A1 を箱として持っているため、Supabase で建てて後から移行する工程は無駄になる。
最初から Keycloak + Auth.js で構築する。

設計仕様書の方針に従い、コンテンツ系 (Course / Task) と
活動記録系 (Submission / TaskProgress) をテーブルとして明確に分ける。
変化の速度と所有者が異なるデータを混ぜないことで、
将来のキャッシュ戦略やバックアップ方針に余地を残す。

## 受け入れ条件

- [ ] A1 上の PostgreSQL に接続でき、接続情報 (DATABASE_URL) が環境変数で注入されている
- [ ] PostgreSQL は Coolify 管理。外部にポートを晒さず、Docker 内部ホスト名で接続する
- [ ] apps/web/src/infra/db/schema.ts に Drizzle スキーマが定義されている
  - 学習者系: users, profiles
  - コンテンツ系: courses, tasks, test_cases, hints
  - 活動記録系: submissions, task_progress
  - 他者性: encouragement_messages, daily_bonuses
  - Cosmetic 系: cosmetic_items, user_inventory, user_loadout
- [ ] apps/web/src/infra/db/client.ts に DB 接続クライアントが設定されている
- [ ] core 層に認証のポート (core/ports/auth-gateway.ts) が定義されている
- [ ] apps/web/src/infra/auth/ に Auth.js + Keycloak プロバイダーの実装があり、
      AuthGateway ポートを満たす
- [ ] Keycloak への委譲によるログイン・ログアウトが動作する
- [ ] users テーブルは Keycloak の sub (subject) を参照する薄い存在とする
- [ ] Drizzle のマイグレーションが実行可能である
- [ ] `make verify` がエラーを発生させない

## 技術的な検討事項

- 認証は必ず core/ports の AuthGateway 越しに利用する。core から Auth.js や
  Keycloak を直接 import しない。これにより認証基盤を変えても core は無傷に保てる
  (クリーンアーキテクチャの依存性逆転)
- Auth.js の Keycloak プロバイダー設定:
  - clientId は KEYCLOAK_CLIENT_ID (アプリごとに変わる)
  - clientSecret は KEYCLOAK_CLIENT_SECRET
  - issuer は KEYCLOAK_ISSUER (https://auth.example.com/realms/main の形)
  - これらはすべて環境変数で注入し、ホスト名をコードに埋め込まない
- Keycloak の Realm 設計: 一般ユーザーは main Realm、管理画面は admin-yutori Realm に
  分離する。Realm 間で SSO は共有されない仕様を、管理画面の隔離に利用する
- Keycloak 自身の Coolify 運用上の注意 (a1-infra-reference.md より):
  - Keycloak とその DB は同一 project + environment に置く
  - KC_HOSTNAME は公開 URL を compose に直接書いて固定する
    (自動生成変数に任せると内部 URL に化けてリダイレクトが壊れる)
  - KC_PROXY_HEADERS=xforwarded で X-Forwarded-Proto を読ませる
    (Tunnel 内は平文 HTTP だが公開 URL は https のため辻褄を合わせる)
- 外部 IdP (Google OIDC 等) は管理者が一度だけ Keycloak に設定する。
  ユーザーは「Google でログイン」を押すだけ。MVP では後回しでよい
- profiles の motionPreference は初回アクセス時に OS 設定を取得してセットする想定だが、
  この issue では DB カラムの用意のみ。UI 連携は issue-08 以降
- テストケース・ヒントの payload は jsonb カラムに格納する。型は contracts の
  Zod スキーマで保証し、DB は不透明な塊として扱う
- ガチャ・イベント関連テーブル (デイリーガチャ履歴、期間限定イベント定義、
  スキップアイテムの出現制御) は未設計のため、この issue では対象外

## 関連ADR・依存issue

- 関連ADR: docs/adr/0008-oracle-a1-coolify-selfhost.md (ADR 0003 を置換)
- 参照: docs/a1-infra-reference.md (認証・DB の具体手順)
- 依存: issue-03, issue-04 (contracts の型定義を参照)
- 後続: issue-08, issue-09, issue-10

## 想定工数・優先度

- 工数: 1〜2日 (Keycloak のセットアップを含むため当初見積もりより増加)
- 優先度: 最高
