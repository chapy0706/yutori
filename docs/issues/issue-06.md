---
status: closed
created_at: 2026-05-24
closed_at: 2026-06-20
---

# issue-06: packages/sandbox — QuickJS-WASM 隔離実行層

## 概要・背景・目的

ユーザーが書いた JavaScript コードを、ブラウザ内で安全に実行するための
サンドボックスパッケージを構築する。

QuickJS-WASM を Web Worker 内でロードし、メインスレッドから隔離された環境で
ユーザーコードを実行する。このパッケージは「実行」だけを担い、
「判定」は grader (issue-07) の責務とする。

## 受け入れ条件

- [x] QuickJS-WASM がロード・初期化できる (runtime/quickjs-loader.ts)
- [x] 仮想ファイルシステムでユーザーコードとモジュールを配置できる (runtime/virtual-fs.ts)
- [x] 実行時間制限が interrupt handler で動作する (policy/time-budget.ts)
- [x] メモリ制限が設定・適用される (policy/memory-limit.ts)
- [x] 公開 API の制御ができる (policy/api-exposure.ts)
  - console.log のキャプチャ。process/fetch 等のグローバルは非公開
- [x] ユーザーの標準出力がキャプチャされ、構造化データとして取得できる (capture/)
- [x] 例外が構造化データに正規化される (capture/error-normalize.ts)
- [x] Worker エントリが postMessage で進捗を逐次通知する (worker/)
- [x] Worker とホスト間のメッセージ契約が contracts の型を使って定義されている (worker/protocol.ts)
- [x] 単体テスト (Vitest) で、簡単なコードの実行・タイムアウト・エラーキャプチャが検証されている
- [x] `make verify` がエラーを発生させない

## 技術的な検討事項

- QuickJS-WASM のライブラリ選定: quickjs-emscripten または @aspect-build/aspect-quickjs 等を調査し採用する
- Worker 内で動作するため、DOM API は使えない。テストは Node.js 環境で行うが、Worker の postMessage をモック化する方針とする
- policy/ の設定値 (タイムアウト秒数、メモリ上限、公開 API リスト) は JSON または TypeScript の定数として設定ファイル化し、課題ごとに上書きできる構造にする
- このパッケージは Next.js を import しない。DB も知らない

## 関連ADR・依存issue

- 関連ADR: docs/adr/0002-grading-with-quickjs-wasm.md
- 依存: issue-03, issue-04 (Worker プロトコルの型定義)
- 後続: issue-07

## 想定工数・優先度

- 工数: 1〜2日
- 優先度: 最高
