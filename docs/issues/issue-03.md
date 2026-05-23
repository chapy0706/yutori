---
status: open
created_at: 2026-05-24
closed_at:
---

# issue-03: モノレポ初期化とワークスペース設定

## 概要・背景・目的

yutori のリポジトリをモノレポとして初期化し、全パッケージの空の骨組みを立ち上げる。
以降の全 issue はこの骨組みの上で作業するため、最初に着手する必要がある。

構成は apps/web (Next.js 本体)、packages/contracts (共有スキーマ)、
packages/sandbox (QuickJS-WASM ラッパー)、packages/grader (採点エンジン) の4つ。
content/ (コース定義データ) と tooling/ (運用スクリプト) のディレクトリも切る。

## 受け入れ条件

- [ ] pnpm workspace が設定され、各パッケージが認識されている
- [ ] apps/web に Next.js (App Router) プロジェクトが初期化されている
- [ ] packages/contracts, packages/sandbox, packages/grader がそれぞれ空パッケージとして存在する
- [ ] tsconfig.base.json がルートにあり、各パッケージから継承している
- [ ] Biome の設定がルートにあり、全パッケージに適用される
- [ ] Tailwind CSS と shadcn/ui が apps/web に導入されている
- [ ] content/courses/ と tooling/ のディレクトリが存在する
- [ ] `make verify` がエラーを発生させない

## 技術的な検討事項

- パッケージマネージャは pnpm を採用する。ワークスペースプロトコル (workspace:*) で内部パッケージを参照する
- tsconfig は base を継承する形にし、各パッケージの paths はパッケージ側で設定する
- Biome はルートに1つだけ設定を置き、全パッケージに適用する方針とする
- nanoID パッケージもこの段階でインストールしておく

## 関連ADR・依存issue

- 関連ADR: docs/adr/0001-monorepo.md
- 依存: なし (最初の issue)
- 後続: issue-04, issue-05, issue-06

## 想定工数・優先度

- 工数: 半日
- 優先度: 最高
