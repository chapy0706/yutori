---
status: open
created_at: 2026-05-24
closed_at:
---

# issue-15: ゴール WebP 自動生成パイプライン

## 概要・背景・目的

各課題のゴール提示用メディア (Before/After のアニメーション WebP) を
自動生成するパイプラインを構築する。

Playwright の動画録画機能で模範実装の操作を録画し、
ffmpeg でアニメーション WebP に変換する。
課題を追加するたびに「タスク定義を書く」だけでデモメディアが量産される構造をつくる。

## 受け入れ条件

- [ ] tooling/media-gen/ にパイプラインのスクリプトが存在する
  - record.ts (Playwright で模範実装を操作し webm 録画)
  - to-webp.ts (ffmpeg で webm をアニメーション WebP へ変換)
  - scenarios.ts (タスクごとの操作手順定義)
- [ ] テトリスコースの各課題に scenario が定義されている
- [ ] コマンド1つで全課題のゴール WebP が生成される
- [ ] Before/After の比較メディアも生成される
- [ ] 生成された WebP が課題ページで表示される
- [ ] `make verify` がエラーを発生させない

## 技術的な検討事項

- ffmpeg がローカル環境に必要。Homebrew で `brew install ffmpeg` する前提
- CI での自動実行は MVP 後の検討事項。まずはローカルで `pnpm run media-gen` のようなコマンドで動けばよい
- scenario の定義形式: 操作手順 (キー入力・待機)、viewport サイズ、録画時間をタスク定義に持たせる
- WebP のファイルサイズは1課題あたり数百KB を目安とする。品質とサイズのバランスは ffmpeg のオプションで調整

## 関連ADR・依存issue

- 関連ADR: なし
- 依存: issue-14 (テトリスコースのコンテンツと模範実装が必要)
- 後続: なし

## 想定工数・優先度

- 工数: 半日
- 優先度: 低
