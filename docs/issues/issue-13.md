---
status: open
created_at: 2026-05-24
closed_at:
---

# issue-13: Cosmetic アンロックと学習スペースカスタマイズ

## 概要・背景・目的

学習スペースのカスタマイズ機能を構築する。
背景・アイコン・BGM・SE をアンロックし、自分好みの空間を整える。
yutori の「帰ってくる場所」としての居場所感を担う中心機能。

報酬は学習内容に一切影響しない (Cosmetic only)。
取得方法はコイン購入と課題・コース完走による直接獲得の併用。

## 受け入れ条件

- [ ] apps/web/src/app/(main)/space/page.tsx にカスタマイズ画面が存在する
- [ ] ストア (コインで購入可能なアイテム一覧) が表示される
- [ ] 課題スキップアイテムがストアの棚に表示される (ただし通貨では購入できない旨を明示)
  - 出現制限中はその気配を残す表示にする
- [ ] コインによるアイテム購入が動作する (core/reward/cosmetic-service.ts)
- [ ] 所持アイテムの装備切り替えが動作し、user_loadout に反映される
- [ ] 装備した背景・アイコンがダッシュボードや並走者リストに反映される
- [ ] BGM・SE の ON/OFF がプロフィール設定から切り替え可能
- [ ] BGM・SE はデフォルト OFF
- [ ] アニメーションは OS の prefers-reduced-motion を尊重する
- [ ] 無料音源・画像アセットは A1 のファイルシステムに配置し、Cloudflare 経由で配信される
- [ ] 無料音源の出典・ライセンスが public/audio/credits.md に集約されている
- [ ] `make verify` がエラーを発生させない

## 技術的な検討事項

- 音源は効果音ラボ、甘茶の音楽工房、DOVA-SYNDROME 等の無料素材を利用する。利用規約を個別に確認すること
- 音の再生は ui/feedback/sound-manager.ts に集約する。失敗音は否定的に響かせない (音でユーザーを罰しない)
- prefers-reduced-motion の解決は ui/feedback/motion.ts に集約する
- コース完走による直接獲得アイテム (達成の証明を兼ねる) は、完走判定のタイミングで付与する。完走判定のロジックは core/learning/progress-service.ts に持たせる
- アセット (音源・画像・背景) は A1 のファイルシステムに置き、Cloudflare のキャッシュで配信する (ADR 0008)。A1 は 150GB のストレージを持つため、外部オブジェクトストレージは MVP では不要。Cloudflare が経路にいるため CDN 配信もそのまま成立する

## 関連ADR・依存issue

- 関連ADR: docs/adr/0006-motivation-by-gain-not-loss.md
- 依存: issue-05, issue-11
- 後続: なし

## 想定工数・優先度

- 工数: 1日
- 優先度: 中
