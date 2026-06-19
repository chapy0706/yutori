# 0008. Oracle Cloud A1 + Coolify によるセルフホスト構成を採用する

ステータス: 受理
日付: 2026-06-07
置換対象: ADR 0003 (Supabase 採用)

## 背景

ADR 0003 では、無料枠で MVP を構築する前提のもと、認証・DB・ストレージが
一つの無料枠に収まる Supabase を採用していた。

その後、Oracle Cloud の Always Free 枠で A1 インスタンス (ARM aarch64・
4 OCPU・24GB RAM・150GB ストレージ) を取得できた。これにより前提が変わった。

- 商用利用の制限がない (Vercel Hobby は商用不可だった)
- 本質的にコストがゼロ (Always Free 枠)
- インフラを自分で握れる
- 低レイヤー・インフラの構造理解そのものが、本プロジェクトの担い手にとって
  学びと楽しみのある工程である

本番運用は約半年後を想定しており、その時期までに自前構成を育てられる。

## 決定

ホスティングを Oracle Cloud A1 + Coolify によるセルフホスト構成へ移行する。

| 領域 | 採用 |
|------|------|
| ホスティング | Oracle Cloud A1 + Coolify (PaaS) |
| 入口 | Cloudflare + Cloudflare Tunnel (DNS・TLS終端・WAF) |
| リバースプロキシ | Traefik (Coolify 管理) |
| DB | PostgreSQL (A1 上・Coolify 管理) |
| 認証 | Keycloak (A1 上) + Auth.js |
| ストレージ | A1 ファイルシステム + Cloudflare 配信 |

認証は段階移行 (Supabase Auth を経由して後から Keycloak) ではなく、
最初から Keycloak + Auth.js で構築する。A1 を箱として持っている以上、
Supabase で建てて移行する工程は無駄になるため。

## 理由

### A1 を取得済みである

仮定ではなく実機がある。Always Free 枠でこのスペックは破格であり、
活用しない理由がない。

### Coolify が構築の手間を圧縮する

Coolify はセルフホスト版の PaaS であり、git push 自動デプロイ・
コンテナ管理・DB 管理を Web UI で提供する。ADR 0003 で Supabase を選んだ
理由の一つ「自前構築の工数」を、Coolify が大きく埋める。

### Cloudflare Tunnel でパブリック IP を持たずに公開できる

A1 にパブリック IP を付けず、Cloudflare Tunnel 経由でのみ公開する。
攻撃面を最小化でき、IP も晒さない。Cloudflare が経路にいるため、
静的アセットの CDN 配信もそのまま活かせ、別途オブジェクトストレージを
用意する必要がない。

### クリーンアーキテクチャが移行を支える

認証・DB・ストレージの実装はすべて infra 層に閉じ込められている。
core 層はポート (AuthGateway, StorageGateway, Repository 等) 越しに
これらを扱うため、インフラ基盤の変更が core のコードに波及しない。
この設計があるからこそ、デプロイ先の変更を安全に行える。

## 検討した代案

### Vercel + Supabase のまま続ける (ADR 0003)

最速で開発に着手でき、認証・ストレージ・CDN を考えなくてよい。
しかし商用化時に移行が必要で、Vercel Hobby は商用不可。
A1 を取得した今、コストと自由度でセルフホストが優位になった。

### 認証を Supabase Auth のまま段階移行する

段階1を Supabase Auth、段階2で Keycloak へ移す案。
だが A1 が既にあるため、Supabase で建てて移行する工程が純粋な無駄になる。
最初から Keycloak で建てる。

## 影響

- issue-03 (モノレポ初期化): Coolify デプロイ・pnpm 固定の前提を追記。
- issue-05 (DB・認証): Supabase Auth ではなく Keycloak + Auth.js 前提に全面書き換え。
  DB は A1 上の PostgreSQL。
- issue-13, issue-15 (アセット・WebP 配信): A1 + Cloudflare 配信前提に変更。
- ルーティングと認証の具体的手順は docs/a1-infra-reference.md に集約する。
- やらないこと: A1 にパブリック IP を付けない / Coolify 管理ポート
  (8000/6001/6002) を Oracle セキュリティリストで開けない / Traefik で
  Let's Encrypt を使わない / アプリコードにホスト名・IP を埋め込まない。
