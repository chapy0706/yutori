---
status: open
created_at: 2026-05-24
closed_at:
---

# issue-08: 課題ページ UI (エディタ・採点実行・リアルタイム進捗表示)

## 概要・背景・目的

学習者がコードを書き、提出し、採点結果をリアルタイムに受け取る画面を構築する。
yutori の学習体験の中心となるページ。

PC では課題説明とコードエディタを左右に並べ、スマホではタブ切り替えとする。
採点の5観点の通過状況をリアルタイムに表示し、失敗時はヒントを問いかけの形で提示する。

## 受け入れ条件

- [ ] apps/web/src/app/(main)/courses/[slug]/tasks/[taskId]/page.tsx が存在する
- [ ] CodeMirror 6 によるコードエディタが動作する (JavaScript / TypeScript のシンタックスハイライト)
- [ ] 提出ボタンで grader にコードが渡され、採点が実行される
- [ ] Worker からの postMessage を購読し、5観点の通過状況がリアルタイムに表示される (ui/components/grading/axis-progress.tsx)
- [ ] リザルト画面で、通過した観点・失敗した観点・ヒントが表示される (ui/components/grading/result-panel.tsx)
- [ ] ヒントは「もしかして〜?」の問いかけ形式で表示される
- [ ] 「ここまでは合っている」が必ず明示される
- [ ] ハイブリッド積み上げが動作する (過去課題の仕様不適合時に模範実装へ差し替え + 警告表示)
- [ ] レスポンシブ対応: PC は左右分割、スマホはタブ切り替え
- [ ] 課題のゴール提示 (Level 3: Before/After の WebP) が表示される
- [ ] `make verify` がエラーを発生させない

## 技術的な検討事項

- CodeMirror 6 は必要な拡張だけを組み立てる設計。初期は シンタックスハイライト + 行番号 + 自動インデント + 括弧の対応表示 で十分
- Worker との接続は hooks/use-grading.ts にカスタムフックとして切り出す
- 音 (SE) やアニメーションの組み込みはこの issue では対象外。構造だけ用意し、実際の演出は後で足す
- ユーザーの作業中コードは task_progress.working_code に保存する。ページ離脱時の保存タイミングを検討する必要がある

## 関連ADR・依存issue

- 関連ADR: なし
- 依存: issue-05, issue-07
- 後続: issue-09, issue-14

## 想定工数・優先度

- 工数: 1〜2日
- 優先度: 高
