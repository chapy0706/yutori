# ディレクトリ構成 (フルツリー)

バージョン: 0.1 (構想フェーズ)
対象: ゲーム制作で学ぶプログラミング学習サービス

---

## 1. 構成の三原則

本構成は、設計仕様書の二原則とは別に、コード配置に関する三つの原則に従う。

### 原則A: 依存は内側へ一方向 (クリーンアーキテクチャ)

内側 (ドメインロジック) は外側 (DB・UI・フレームワーク) を知らない。
外側だけが内側を知る。これにより、DB やフレームワークを差し替えても
ドメインロジックは変更されない。

```
app (フレームワーク層) --> core (ドメイン層) <-- infra (技術詳細層)
                                  ^
                          ここだけは何にも依存しない
```

### 原則B: 採点エンジンは独立した部品 (UNIX哲学)

採点エンジンは「コードとテストケースを受け取り、結果を返す」だけの純粋な部品とする。
Next.js も DB も知らない。packages 配下の独立パッケージとして切り出し、
将来の CLI 版・別プロジェクトでの再利用に開いておく。

### 原則C: モノレポで関心を分ける

採点エンジン (packages) と Web 本体 (apps) は寿命も関心も異なるため混ぜない。
共有する型・Zod スキーマも独立パッケージとする。

---

## 2. ルート構成

```
learning-service/
├── apps/
│   └── web/                    Next.js 本体 (Webアプリケーション)
├── packages/
│   ├── grader/                 採点エンジン (Next.js非依存の独立部品)
│   ├── contracts/              共有のZodスキーマ・型定義
│   └── sandbox/                QuickJS-WASM ラッパー (Worker内で動く隔離実行層)
├── content/                    コース・課題の定義データ (運営が編集)
│   └── courses/
├── tooling/                    開発・運用スクリプト
│   ├── media-gen/              Playwrightによるゴール WebP 自動生成
│   └── content-validator/      コース定義の整合性検証
├── biome.json                  Lint / Format 設定
├── package.json                ワークスペース定義
├── tsconfig.base.json          共通 TypeScript 設定
└── README.md
```

---

## 3. packages/contracts — 共有スキーマ層

最も内側。全パッケージが参照する型と Zod スキーマの単一の源。
何にも依存しない。Zod を仕様記述言語として使う中核。

```
packages/contracts/
├── src/
│   ├── course.ts               Course / Task のドメイン型と Zod スキーマ
│   ├── test-case.ts            テスト5観点・TestCase payload のスキーマ
│   ├── submission.ts           採点結果・観点結果のスキーマ
│   ├── grading.ts              採点エンジンの入出力インターフェース型
│   ├── user.ts                 User / Profile のドメイン型
│   ├── cosmetic.ts             Cosmetic 関連のドメイン型
│   └── index.ts                公開エントリ (re-export)
├── package.json
└── tsconfig.json
```

---

## 4. packages/sandbox — 隔離実行層

QuickJS-WASM をラップし、Web Worker 内で安全にユーザーコードを実行する。
「実行」だけを担い、「判定」は持たない (判定は grader の責務)。

```
packages/sandbox/
├── src/
│   ├── runtime/
│   │   ├── quickjs-loader.ts    QuickJS-WASM の初期化・ロード
│   │   ├── virtual-fs.ts        仮想ファイルシステムの構築 (過去課題+今回ファイル)
│   │   └── module-linker.ts     ユーザーコードのモジュール解決
│   ├── policy/
│   │   ├── time-budget.ts       実行時間制限 (interrupt handler)
│   │   ├── memory-limit.ts      メモリ上限設定
│   │   └── api-exposure.ts      公開APIの制御 (console/Math/Date等の取捨)
│   ├── capture/
│   │   ├── stdout-capture.ts    ユーザーの出力キャプチャ
│   │   └── error-normalize.ts   例外を構造化データへ正規化
│   ├── worker/
│   │   ├── sandbox.worker.ts    Worker エントリ。postMessage で進捗を流す
│   │   └── protocol.ts          Worker とホスト間のメッセージ契約
│   └── index.ts
├── package.json
└── tsconfig.json
```

---

## 5. packages/grader — 採点エンジン

本サービスの中核。Next.js も DB も知らない純粋な部品。
sandbox に「実行」を依頼し、自らは「判定」と「フィードバック生成」を担う。

```
packages/grader/
├── src/
│   ├── pipeline/
│   │   ├── grade.ts            採点パイプラインの本体 (オーケストレーション)
│   │   ├── lint-stage.ts       Biome による初期構文チェック段階
│   │   └── checkpoint.ts       観点を上から順に確認・失敗時に打ち切る制御
│   ├── axes/                   5観点それぞれの判定ロジック
│   │   ├── structure.ts        構造観点 (エクスポートの有無)
│   │   ├── contract.ts         契約観点 (引数・戻り値の型)
│   │   ├── basic.ts            基本観点 (単純入力のスモークテスト)
│   │   ├── spec.ts             仕様観点 (Zodスキーマ適合の判定)
│   │   └── robustness.ts       頑健観点 (不正・空入力)
│   ├── verdict/
│   │   ├── judge.ts            観点結果を集約して合否を確定
│   │   └── degradation.ts      過去課題の整合性チェックと模範実装への差し替え
│   ├── feedback/
│   │   ├── hint-resolver.ts    ヒントの解決 (固有→パターン→リンタ委譲の順)
│   │   ├── hint-dictionary.ts  パターンマッチング方式ヒント辞書の引き込み
│   │   └── result-format.ts    失敗表示の構成 (期待値・実際値・問いかけ)
│   └── index.ts
├── tests/
│   ├── axes/                   各観点ロジックの単体テスト (Vitest)
│   └── pipeline/               パイプライン結合テスト
├── package.json
└── tsconfig.json
```

---

## 6. apps/web — Next.js 本体

クリーンアーキテクチャを内部で再度適用する。
app は薄いフレームワーク層、core はドメイン層、infra は技術詳細層。

```
apps/web/
├── src/
│   ├── app/                    Next.js App Router (フレームワーク層・薄く保つ)
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (main)/
│   │   │   ├── layout.tsx       認証後の共通レイアウト
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx     ログイン後ホーム (草・並走者・受信メッセージ)
│   │   │   ├── courses/
│   │   │   │   ├── page.tsx     コース一覧 (最新ランキングも表示)
│   │   │   │   └── [slug]/
│   │   │   │       ├── page.tsx           コース詳細 (プレイ可能なゴール提示)
│   │   │   │       └── tasks/[taskId]/
│   │   │   │           └── page.tsx       課題ページ (エディタ・採点)
│   │   │   ├── play/[slug]/
│   │   │   │   └── page.tsx     ロック中も含むゲームのプレイ画面
│   │   │   └── space/
│   │   │       └── page.tsx     学習スペースのカスタマイズ (Cosmetic)
│   │   ├── api/                 Route Handlers (薄い。core を呼ぶだけ)
│   │   │   ├── submissions/route.ts
│   │   │   └── bonus/route.ts
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── core/                   ドメイン層 (Next.jsを一切importしない)
│   │   ├── learning/
│   │   │   ├── course-service.ts       コース・課題の取得ロジック
│   │   │   ├── submission-service.ts   提出受付・採点呼び出し・結果保存
│   │   │   └── progress-service.ts     進捗・草・連続日数の集計
│   │   ├── social/
│   │   │   ├── peer-service.ts         並走者の選定アルゴリズム
│   │   │   ├── ranking-service.ts      多軸・変化量ベースのランキング
│   │   │   └── encouragement-service.ts 応援メッセージの送受信
│   │   ├── reward/
│   │   │   ├── bonus-service.ts        ログインボーナスの付与
│   │   │   ├── coin-service.ts         コイン残高の増減
│   │   │   └── cosmetic-service.ts     アンロック・装備の管理
│   │   └── ports/              ドメインが要求するインターフェース (依存性逆転)
│   │       ├── course-repository.ts
│   │       ├── submission-repository.ts
│   │       ├── progress-repository.ts
│   │       └── storage-gateway.ts
│   │
│   ├── infra/                  技術詳細層 (core/ports の実装)
│   │   ├── db/
│   │   │   ├── schema.ts               Drizzle スキーマ定義
│   │   │   ├── client.ts               DB接続クライアント
│   │   │   └── repositories/           ports の Drizzle 実装
│   │   │       ├── course-repository.drizzle.ts
│   │   │       ├── submission-repository.drizzle.ts
│   │   │       └── progress-repository.drizzle.ts
│   │   ├── auth/
│   │   │   └── supabase-auth.ts        Supabase Auth 連携
│   │   └── storage/
│   │       └── supabase-storage.ts     WebP・アセットの配信 (storage-gateway 実装)
│   │
│   ├── ui/                     プレゼンテーション層 (Reactコンポーネント)
│   │   ├── components/
│   │   │   ├── ui/             shadcn/ui のコンポーネント
│   │   │   ├── editor/
│   │   │   │   └── code-editor.tsx
│   │   │   ├── grading/
│   │   │   │   ├── axis-progress.tsx   観点通過のリアルタイム表示
│   │   │   │   └── result-panel.tsx    リザルト画面 (失敗表示・ヒント)
│   │   │   ├── contribution/
│   │   │   │   └── grass-graph.tsx     草 (コントリビューショングラフ)
│   │   │   ├── social/
│   │   │   │   ├── peer-list.tsx       並走者リスト
│   │   │   │   └── encouragement.tsx   応援メッセージUI
│   │   │   └── space/
│   │   │       └── customizer.tsx      学習スペースのカスタマイズUI
│   │   ├── hooks/
│   │   │   ├── use-grading.ts          Worker と接続し進捗を購読
│   │   │   └── use-settings.ts         音・モーション設定の取得
│   │   └── feedback/
│   │       ├── sound-manager.ts        SE/BGM の再生 (デフォルトOFF)
│   │       └── motion.ts               prefers-reduced-motion の解決
│   │
│   └── constants/
│       └── encouragement-presets.ts    応援メッセージ3種の固定文
│
├── public/
│   └── audio/
│       └── credits.md                 音源の出典・ライセンス集約
├── next.config.ts
├── package.json
└── tsconfig.json
```

---

## 7. content — コース・課題の定義データ

運営が編集する静的コンテンツ。コードではなくデータとして分離する。
これにより「課題を追加する = ここにファイルを足す」という単純な世界をつくる。

```
content/
└── courses/
    └── tetris/
        ├── course.json             コースのメタ情報・finalSpec
        ├── skeleton/               全課題共通の骨組みファイル
        ├── tasks/
        │   ├── 01-static-block/
        │   │   ├── task.json       課題定義 (description, targetFiles, timeBudgetMs)
        │   │   ├── contract.ts     contractSchema (Zod)
        │   │   ├── tests.ts        5観点のテストケース定義
        │   │   ├── hints.json      テスト固有ヒント
        │   │   └── reference/      模範実装
        │   ├── 02-falling/
        │   └── ...
        └── playable/               プレイ可能なゴール提示用のビルド済み成果物
```

---

## 8. tooling — 開発・運用スクリプト

```
tooling/
├── media-gen/
│   ├── record.ts               Playwrightで模範実装を操作し webm 録画
│   ├── to-webp.ts              ffmpeg で webm をアニメーション WebP へ変換
│   └── scenarios.ts            タスクごとの操作手順 (scenario) 定義
└── content-validator/
    └── validate.ts             コース定義が contracts のスキーマに適合するか検証
```

---

## 9. 依存関係の全体像

```
                contracts (最も内側・何にも依存しない)
                  ^      ^      ^
                  |      |      |
        sandbox --+      |      +-- grader
                         |              ^
                         |              |
   apps/web/core --------+              |
        ^                               |
        |                               |
   apps/web/infra                apps/web/core が grader を呼ぶ
   apps/web/ui                   (採点の依頼)
        ^
        |
   apps/web/app (最も外側・Next.js固有)
```

矢印は「依存する方向」を表す。すべての矢印が内側 (contracts) を向いており、
内側が外側を知ることはない。content と tooling はビルド時のみ関与し、
実行時の依存グラフには含まれない。
