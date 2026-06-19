---
status: closed
created_at: 2026-05-24
closed_at: 2026-06-20
---

# issue-03: モノレポ初期化とワークスペース設定

## 概要・背景・目的

yutori のリポジトリをモノレポとして初期化し、全パッケージの空の骨組みを立ち上げる。
以降の全 issue はこの骨組みの上で作業するため、最初に着手する必要がある。

構成は apps/web (Next.js 本体)、packages/contracts (共有スキーマ)、
packages/sandbox (QuickJS-WASM ラッパー)、packages/grader (採点エンジン) の4つ。
content/ (コース定義データ) と tooling/ (運用スクリプト) のディレクトリも切る。

## 受け入れ条件

- [x] pnpm workspace が設定され、各パッケージが認識されている
- [x] apps/web に Next.js (App Router) プロジェクトが初期化されている
- [x] packages/contracts, packages/sandbox, packages/grader がそれぞれ空パッケージとして存在する
- [x] tsconfig.base.json がルートにあり、各パッケージから継承している
- [x] Biome の設定がルートにあり、全パッケージに適用される
- [x] Tailwind CSS と shadcn/ui が apps/web に導入されている
- [x] content/courses/ と tooling/ のディレクトリが存在する
- [x] `make verify` がエラーを発生させない

## 技術的な検討事項

- パッケージマネージャは pnpm を採用する。ワークスペースプロトコル (workspace:*) で内部パッケージを参照する
- tsconfig は base を継承する形にし、各パッケージの paths はパッケージ側で設定する
- Biome はルートに1つだけ設定を置き、全パッケージに適用する方針とする
- nanoID パッケージもこの段階でインストールしておく
- デプロイは Oracle Cloud A1 + Coolify を前提とする (ADR 0008)。
  pnpm-lock.yaml をコミットすれば Coolify の Nixpacks が自動検知する。
  Coolify の Install Command は `pnpm install --frozen-lockfile` に固定する。
  pnpm は aarch64 (ARM) ネイティブで動くため A1 上で問題なく動作する
- モノレポのため、Coolify では apps/web をビルド対象ルートとして指定する想定。
  ビルド・デプロイ設定の具体は issue-05 以降のインフラ整備で詰める

## 関連ADR・依存issue

- 関連ADR: docs/adr/0001-monorepo.md
- 依存: なし (最初の issue)
- 後続: issue-04, issue-05, issue-06

## 想定工数・優先度

- 工数: 半日
- 優先度: 最高
