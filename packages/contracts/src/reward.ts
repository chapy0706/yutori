import { z } from "zod";

/**
 * ガチャ (デイリーボーナス) の抽選結果。
 *
 * daily_bonuses.reward に格納する塊であり、API の応答でもある。
 * 「開くと良いことがありそう」という獲得期待のための報酬で、損失はない (ADR-0006)。
 * 種別は 3 つ: コイン / Cosmetic アイテム / 課題スキップ券。
 */
export const GachaOutcomeSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("coin"),
    amount: z.number().int().positive(),
  }),
  z.object({
    kind: z.literal("cosmetic"),
    itemId: z.string().min(1),
    /** 履歴表示で join せず名前を出せるよう、確定時の表示名を控える。 */
    name: z.string().min(1),
  }),
  z.object({
    kind: z.literal("skip"),
  }),
]);
export type GachaOutcome = z.infer<typeof GachaOutcomeSchema>;

/** ガチャを引く API の応答。冪等 (すでに今日引いていれば alreadyClaimed)。 */
export const DailyBonusResultSchema = z.object({
  outcome: GachaOutcomeSchema,
  alreadyClaimed: z.boolean(),
  /** 反映後の連続ログイン日数 (途切れてもペナルティなし。ADR-0006)。 */
  currentStreak: z.number().int().nonnegative(),
  /** 反映後のコイン残高。 */
  coinBalance: z.number().int().nonnegative(),
});
export type DailyBonusResult = z.infer<typeof DailyBonusResultSchema>;
